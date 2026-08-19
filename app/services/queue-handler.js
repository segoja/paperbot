import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { sort } from '@ember/object/computed';
import { invoke } from '@tauri-apps/api';
import dayjs from 'dayjs';
import { TrackedArray } from 'tracked-built-ins';
import computedFilterByQuery from 'ember-cli-filter-by-query';

export default class QueueHandlerService extends Service {
  @service globalConfig;
  @service currentUser;
  @service twitchChat;
  @service store;
  @service router;

  @tracked lastStream = '';
  @tracked scrollPlayedPosition = 0;
  @tracked scrollPendingPosition = 0;
  tabList = ['pending', 'played'];
  @tracked activeTab = 'pending';
  @tracked oldHtml = '';
  @tracked lastsongrequest;
  // We use this property to track if a key is pressed or not using ember-keyboard helpers.
  @tracked modifierkey = false;

  @tracked songs = new TrackedArray();
  @tracked requests = new TrackedArray();

  @tracked takesSongRequests = false;
  @tracked isMutatingQueue = false;
  _mutationChain = Promise.resolve();

  runQueueMutation(operation) {
    const run = async () => {
      this.isMutatingQueue = true;
      try {
        return await operation();
      } finally {
        this.isMutatingQueue = false;
      }
    };
    const result = this._mutationChain.then(run, run);
    this._mutationChain = result.catch(() => {});
    return result;
  }

  get songListExt() {
    return this.store.findAll('song').then((list) => {
      return list.filter((item) => item.active === true);
    });
  }

  @tracked requestpattern = '';
  @computedFilterByQuery(
    'songList',
    ['title', 'artist', 'keywords'],
    'requestpattern',
    { conjunction: 'and', sort: false },
  )
  filteredSongs;

  get songqueue() {
    return this.requests.filter((request) => !request.isDeleted);
  }

  get queueAscSorting() {
    let sortArray = Object.freeze([
      'isPlaying:desc',
      'position:asc',
      'timestamp:desc',
    ]);
    if (this.globalConfig.config.premiumSorting) {
      sortArray = Object.freeze([
        'isPlaying:desc',
        'isPremium:desc',
        'donation:desc',
        'position:asc',
      ]);
    }
    return sortArray;
  }

  @sort('songqueue', 'queueAscSorting') arrangedAscQueue;

  queueAscSortingDef = Object.freeze(['position:asc', 'timestamp:desc']);
  @sort('songqueue', 'queueAscSortingDef') arrangedAscQueueDef;

  get pendingSongs() {
    return this.arrangedAscQueue.filter((request) => !request.processed);
  }
  get firstPendingRequest() {
    if (this.pendingSongs.length === 0) return null;
    return this.pendingSongs[0];
  }

  @action async nextPosition() {
    const positions = this.pendingSongs
      .map((request) => Number(request.position))
      .filter(Number.isFinite);
    return positions.length === 0 ? 0 : Math.max(...positions) + 1;
  }

  async _saveRequests(requests) {
    for (const request of requests) {
      await request.save();
    }
  }

  async _reconcileQueue() {
    const byPosition = (left, right) => {
      const leftPosition = Number.isFinite(Number(left.position))
        ? Number(left.position)
        : Number.MAX_SAFE_INTEGER;
      const rightPosition = Number.isFinite(Number(right.position))
        ? Number(right.position)
        : Number.MAX_SAFE_INTEGER;
      if (leftPosition !== rightPosition) return leftPosition - rightPosition;
      return new Date(left.timestamp || 0) - new Date(right.timestamp || 0);
    };
    const pending = this.songqueue
      .filter((request) => !request.processed)
      .sort(byPosition);
    const played = this.songqueue
      .filter((request) => request.processed)
      .sort(byPosition);
    const playing = [...pending, ...played].filter(
      (request) => request.isPlaying,
    );
    const currentId = playing[0]?.id;
    const dirty = [];

    for (const [index, request] of pending.entries()) {
      if (request.position !== index) request.position = index;
      if (request.isPlaying && request.id !== currentId)
        request.isPlaying = false;
      if (request.hasDirtyAttributes) dirty.push(request);
    }
    for (const [index, request] of played.entries()) {
      if (request.position !== index) request.position = index;
      if (request.isPlaying && request.id !== currentId)
        request.isPlaying = false;
      if (request.hasDirtyAttributes) dirty.push(request);
    }
    await this._saveRequests(dirty);
  }

  async enqueueRequest({
    song = null,
    chatid = 'songsys',
    externalId = '',
    platform = '',
    type = 'setlist',
    user = '',
    displayname = '',
    donation = 0,
    donationFormatted = '',
    isPremium = false,
    title = '',
    artist = '',
    toTop = false,
  }) {
    return this.runQueueMutation(async () => {
      if (externalId) {
        const existing = this.songqueue.find(
          (request) => request.externalId === externalId,
        );
        if (existing) return existing;
      }
      await this._reconcileQueue();
      let nextPosition = await this.nextPosition();

      if (toTop) {
        for (const request of this.pendingSongs) {
          request.position = Number(request.position) + 1;
          await request.save();
        }
        nextPosition = 0;
      }

      const newRequest = this.store.createRecord('request', {
        chatid,
        externalId,
        platform,
        timestamp: new Date(),
        type,
        user,
        displayname,
        processed: false,
        position: nextPosition,
        donation: Number(donation) || 0,
        donationFormatted,
        isPremium,
        song,
        title: title || song?.title || '',
        artist: artist || song?.artist || '',
      });

      await newRequest.save();
      try {
        if (song) {
          song.times_requested = Number(song.times_requested || 0) + 1;
          song.last_requested = new Date();
          await song.save();
        }
      } catch (error) {
        await newRequest.destroyRecord().catch(() => {});
        throw error;
      }

      this.lastsongrequest = newRequest;
      this.scrollPendingPosition = 0;
      this.scrollPlayedPosition = 0;
      await this._reconcileQueue();
      this.fileContent(this.pendingSongs);
      return newRequest;
    });
  }

  get playedSongs() {
    return this.arrangedAscQueueDef.filter((request) => request.processed);
  }

  get songList() {
    return this.songs.filter((song) => song.active && !song.isDeleted);
  }

  get availableSongs() {
    return this.songList
      .map((song) => {
        let exclude = false;
        this.songqueue.forEach((request) => {
          if (song.id === request.songId) {
            // console.debug('Song '+song.effectiveTitle+' excluded');
            exclude = true;
          }
        });
        if (!exclude) {
          return song;
        }
      })
      .filter((item) => item);
  }

  // Buttons
  @action async togglePlaying(request) {
    if (request) {
      return this.runQueueMutation(async () => {
        for (const item of this.arrangedAscQueue) {
          if (item.id === request.id) {
            item.isPlaying = !item.isPlaying;
          } else {
            item.isPlaying = false;
          }
          if (item.hasDirtyAttributes) {
            await item.save();
          }
        }
        await this._reconcileQueue();
      });
    }
  }

  @action async removePending(request) {
    return this.runQueueMutation(async () => {
      let song = await request.get('song');
      let previousCount;
      if (song) {
        previousCount = Number(song.times_requested || 0);
        song.times_requested = Math.max(0, previousCount - 1);
        await song.save();
      }
      try {
        await request.destroyRecord();
      } catch (error) {
        if (song) {
          song.times_requested = previousCount;
          await song.save().catch(() => {});
        }
        throw error;
      }
      await this._reconcileQueue();
      this.fileContent(this.pendingSongs);
    });
  }

  @action async removePlayed(request) {
    return this.runQueueMutation(async () => {
      await request.destroyRecord();
      await this._reconcileQueue();
    });
  }

  @action async clearPending() {
    return this.runQueueMutation(async () => {
      const requests = [...this.pendingSongs];
      const countsBySong = new Map();
      for (const request of requests) {
        const song = await request.get('song');
        if (!song) continue;
        const entry = countsBySong.get(song.id) || { song, count: 0 };
        entry.count++;
        countsBySong.set(song.id, entry);
      }
      for (const { song, count } of countsBySong.values()) {
        song.times_requested = Math.max(
          0,
          Number(song.times_requested || 0) - count,
        );
        await song.save();
      }
      for (const request of requests) await request.destroyRecord();
      await this._reconcileQueue();
      this.fileContent(this.pendingSongs);
    });
  }

  @action async clearPlayed() {
    return this.runQueueMutation(async () => {
      for (const request of [...this.playedSongs]) {
        await request.destroyRecord();
      }
      await this._reconcileQueue();
    });
  }

  @action async clearAll() {
    await this.clearPending();
    await this.clearPlayed();
  }

  @action exportQueue() {
    if (this.songqueue.length > 0) {
      let setlist = '';

      [...this.playedSongs].reverse().forEach((request) => {
        setlist = setlist + '+ ' + request.effectiveTitle + '\n';
      });
      this.pendingSongs.forEach((request) => {
        setlist = setlist + '- ' + request.effectiveTitle + '\n';
      });

      let filename = dayjs().format('YYYYMMDD-HHmmss') + '-setlist.txt';

      this.currentUser.download(setlist, filename, 'text/plain');
    }
  }

  // Song processing related actions
  @action modPressed() {
    if (this.modifierkey === false) {
      this.modifierkey = true;
    }
  }

  @action modNotPressed() {
    if (this.modifierkey) {
      this.modifierkey = false;
    }
  }

  get updatingQueue() {
    let updating = this.arrangedAscQueue.filter(
      (request) => request.isSaving || request.isLoading,
    );
    if (updating.length > 0 || this.isMutatingQueue) {
      return true;
    }
    return false;
  }

  @action async requestStatus(request) {
    if (!request.isDeleted && !this.updatingQueue) {
      return this.runQueueMutation(async () => {
        const wasProcessed = request.processed;
        request.position = 0;
        request.processed = !wasProcessed;
        if (request.processed) request.isPlaying = false;
        await request.save();

        if (!wasProcessed) {
          const song = await request.get('song');
          if (song) {
            const oldPlayed = Number(song.times_played || 0);
            song.last_played = new Date();
            song.times_played = oldPlayed + 1;
            try {
              await song.save();
            } catch (error) {
              request.processed = wasProcessed;
              await request.save().catch(() => {});
              throw error;
            }
          }
        }

        await this._reconcileQueue();
        this.scrollPlayedPosition = 0;
        this.scrollPendingPosition = 0;
        this.fileContent(this.pendingSongs);
      });
    }
  }

  @action async externalToQueue(donodata) {
    console.debug('Premium request: ', donodata);
    if (
      !this.takesSongRequests ||
      !this.globalConfig.config.premiumRequests ||
      Number(donodata.amount) < this.globalConfig.config.premiumThreshold ||
      !donodata.message?.startsWith('!sr ')
    ) {
      return null;
    }

    const existing = await this.store.query('request', {
      filter: { externalId: donodata.id },
    });
    if (existing.length > 0) return existing[0];

    let requestedTitle = donodata.message.replace(/!sr /g, '');
    requestedTitle = requestedTitle
      .replace(/&/g, ' ')
      .replace(/\//g, ' ')
      .replace(/-/g, ' ')
      .replace(/[^a-zA-Z0-9'?! ]/g, '');
    this.requestpattern = requestedTitle;
    const bestmatch = this.filteredSongs[0] || null;

    return this.enqueueRequest({
      song: bestmatch,
      chatid: 'songExt',
      externalId: donodata.id,
      platform: donodata.platform,
      user: donodata.fullname || donodata.user,
      displayname: donodata.fullname || '',
      donation: donodata.amount,
      donationFormatted: donodata.formattedAmount,
      isPremium: true,
      title: bestmatch?.title || requestedTitle,
      artist: bestmatch?.artist || '',
    });
  }

  @action async songToQueue(selected, toTop = false) {
    let user = this.twitchChat.botUsername;
    let displayname = '';
    if (this.globalConfig.config.defbotclient) {
      user = this.globalConfig.config.defbotclient.get('username');
    } else {
      displayname = 'setlist';
    }
    return this.enqueueRequest({
      song: selected,
      user,
      displayname,
      toTop,
    });
  }

  @action async nextSong() {
    if (this.pendingSongs.length > 0 && !this.updatingQueue) {
      return this.runQueueMutation(async () => {
        const firstRequest = this.pendingSongs[0];
        for (const played of this.playedSongs) {
          played.isPlaying = false;
          if (played.hasDirtyAttributes) await played.save();
        }

        firstRequest.position = 0;
        firstRequest.processed = true;
        firstRequest.isPlaying = true;
        await firstRequest.save();

        const song = await firstRequest.get('song');
        if (song && !song.isDeleted) {
          song.times_played = Number(song.times_played || 0) + 1;
          song.last_played = new Date();
          try {
            await song.save();
          } catch (error) {
            firstRequest.processed = false;
            firstRequest.isPlaying = false;
            await firstRequest.save().catch(() => {});
            throw error;
          }
        }
        await this._reconcileQueue();
        this.scrollPlayedPosition = 0;
        this.scrollPendingPosition = 0;
        this.fileContent(this.pendingSongs);
      });
    }
    return null;
  }

  @action async prevSong() {
    if (this.playedSongs.length > 0 && !this.updatingQueue) {
      return this.runQueueMutation(async () => {
        for (const pending of this.pendingSongs) {
          pending.isPlaying = false;
          if (pending.hasDirtyAttributes) await pending.save();
        }

        const lastPlayed = this.playedSongs[0];
        lastPlayed.position = 0;
        lastPlayed.processed = false;
        lastPlayed.isPlaying = true;
        await lastPlayed.save();
        await this._reconcileQueue();
        this.scrollPlayedPosition = 0;
        this.scrollPendingPosition = 0;
        this.fileContent(this.pendingSongs);
      });
    }
    return null;
  }

  @action fileContent(pendingSongs, firstRun = false) {
    let htmlEntries = '';
    let title = '';
    let user = '';
    let artist = '';
    let time = '';

    let defaultEntry = `
          <tr>
            <td class="bg-transparent text-white">
              <div class="row g-0">
                <strong class="col">$title</strong>
                <div class="col-auto">$user</div>
              </div>
              <div class="row g-0">
                <small class="col"><small>$artist</small></small>
                <small class="col-auto"><small>$time</small></small>
              </div>
            </td>
          </tr>
            `;

    let defaultOverlay = `
      <table class="table table-dark">
        <thead>
          <tr>
            <th class="bg-transparent text-white"><span class="d-inline-block float-start">Title</span> <span class="d-inline-block float-end">Requested by</span></th>
          </tr>
        </thead>
        <tbody>
          $items
        </tbody>
      </table>`;

    if (
      this.globalConfig.config.overlayfolder != '' &&
      this.currentUser.isTauri
    ) {
      if (
        (this.globalConfig.config.overlayfolder != '' &&
          this.globalConfig.config.overlayType === 'file') ||
        firstRun
      ) {
        let pathString = this.globalConfig.config.overlayfolder;
        if (pathString.substr(pathString.length - 1) === '\\') {
          pathString = pathString.slice(0, -1) + '\\queue.html';
        } else {
          pathString = pathString + '\\queue.html';
        }
        if (pendingSongs.length > 0) {
          let visible = pendingSongs.slice(
            0,
            this.globalConfig.config.get('overlayLength') || 5,
          );
          visible.forEach((pendingsong) => {
            title = pendingsong.effectiveTitle;
            artist = pendingsong.effectiveArtist;
            time = dayjs(pendingsong.timestamp).format('YYYY/MM/DD HH:mm:ss');
            user = pendingsong.user;
            let entry =
              this.globalConfig.config.get('defOverlay.qItems') || defaultEntry;
            entry = entry.replace('$title', title);
            entry = entry.replace('$artist', artist);
            entry = entry.replace('$time', time);
            entry = entry.replace('$user', user);

            htmlEntries = htmlEntries.concat(entry);
          });
        }

        let htmlOverlay =
          this.globalConfig.config.get('defOverlay.qContainer') ||
          defaultOverlay;
        htmlOverlay = htmlOverlay.replace('$items', htmlEntries);

        let chroma = this.globalConfig.config.chromaColor;
        let styles = this.globalConfig.config.get('defOverlay.qCss') || '';

        let htmlBase = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=yes">
    <meta http-equiv="refresh" content="2">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <title>Song queue</title>
    <style>
      .chroma { background-color: ${chroma}!important; }
      ${styles}
    </style>
  </head>
  <body class="bg-transparent chroma" style="overflow-y: hidden;">
    <div class="container-fluid chroma" style="overflow-y: hidden;">
      ${htmlOverlay}
    </div>
  </body>
</html>`;
        this.overlayGenerator(htmlBase, pathString);
      }
    }
  }

  @action async overlayGenerator(newHtml, pathString) {
    this.oldHtml = newHtml;
    let thisHtml = '';
    try {
      thisHtml = await newHtml;
      // console.debug(thisHtml);
    } catch (exception_var) {
      //console.debug('Too slow...');
    } finally {
      //let text = unescape(encodeURIComponent(thisHtml));
      //let arrayBuff = new TextEncoder().encode(text);
      invoke('file_writer', {
        filepath: pathString,
        filecontent: thisHtml,
      }).then(() => {
        console.debug('done!');
      });
    }
  }
}
