import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { sort, uniqBy } from '@ember/object/computed';
import { invoke } from '@tauri-apps/api';
import moment from 'moment';
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


  get songListExt(){
    return this.store.findAll('song').then((list)=>{
      return list.filter(item => item.active === true);
    });
  }
  
  @tracked requestpattern = '';
  @computedFilterByQuery(
    'songList',
    ['title', 'artist', 'keywords'],
    'requestpattern',
    { conjunction: 'and', sort: false }
  ) filteredSongs;

  get songqueue() {
    return this.requests.filter((request) => !request.isDeleted);
  }

  get queueAscSorting(){
    let sortArray = Object.freeze(['isPlaying:desc','position:asc', 'timestamp:desc']);
    if(this.globalConfig.config.premiumSorting){
      sortArray = Object.freeze(['isPlaying:desc','isPremium:desc','donation:desc','position:asc']);
    }
    return sortArray;
  }

  @sort('songqueue', 'queueAscSorting') arrangedAscQueue;
  
  queueAscSortingDef = Object.freeze(['position:asc', 'timestamp:desc']);
  @sort('songqueue', 'queueAscSortingDef') arrangedAscQueueDef;

  get pendingSongs() {
    return this.arrangedAscQueue.filter((request) => !request.processed);
  }

  @action async nextPosition() {
    let positioned = this.pendingSongs.filter(
      (request) => !isNaN(request.position)
    );
    let nextPos = 0;

    if (positioned.length > 0) {
      let lastRequest = await positioned.pop();
      // console.debug(lastRequest);
      if (await lastRequest) {
        nextPos = Number(await lastRequest.position) + 1;
      }
    }
    return nextPos;
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
  @action async removePending(request) {
    let song = await request.get('song');
    await request.destroyRecord().then(async () => {
      if (song) {
        let times = Number(song.times_requested || 0);
        if (song.times_requested) {
          times = times + Number(-1);
        }
        song.times_requested = times;
        await song.save();
      }
      let count = 0;
      this.pendingSongs.forEach((item) => {
        if (!item.isDeleted) {
          item.position = count;
          item.save().then(() => {
            console.debug(item.position + '. ' + item.effectiveTitle);
          });
          count = Number(count) + 1;
        }
      });
      this.fileContent(this.pendingSongs);
    });
  }

  @action async removePlayed(request) {
    await request.destroyRecord().then(async () => {
      let count = 0;
      this.playedSongs.forEach((item) => {
        item.position = count;
        item.save().then(() => {
          console.debug(item.position + '. ' + item.effectiveTitle);
        });
        count = Number(count) + 1;
      });
    });
  }

  @uniqBy('pendingSongs', 'songId') uniquePending;

  @action clearPending() {
    if (this.pendingSongs.length > 0) {
      this.uniquePending.forEach(async (item) => {
        let song = await item.get('song');
        if (song) {
          let requests = this.pendingSongs.filter(
            (request) => request.songId == song.get('id')
          );

          let times = requests.length;
          song.times_requested = Number(song.times_requested) - Number(times);
          requests.forEach((request) => {
            request.destroyRecord();
          });
          await song.save().then(() => {
            console.debug(song.title + ' requests adjusted by -' + times);
          });
        }
      });
    }
    if (this.pendingSongs.length > 0) {
      this.pendingSongs.forEach((request) => request.destroyRecord());
    }
    this.fileContent(this.pendingSongs);
  }

  @action clearPlayed() {
    if (this.playedSongs.length > 0) {
      this.playedSongs.forEach((item) => {
        item.destroyRecord();
      });
    }
  }

  @action clearAll() {
    this.clearPending();
    this.clearPlayed();
  }

  @action exportQueue() {
    if (this.songqueue.length > 0) {
      let setlist = '';

      this.playedSongs.reverse().forEach(async (request) => {
        setlist = setlist + '+ ' + request.effectiveTitle + '\n';
      });
      this.pendingSongs.forEach(async (request) => {
        setlist = setlist + '- ' + request.effectiveTitle + '\n';
      });

      let filename = moment().format('YYYYMMDD-HHmmss') + '-setlist.txt';

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

  get updatingQueue(){
    let updating = this.arrangedAscQueue.filter(request => request.isSaving || request.isLoading );
    if(updating.length > 0){
      return true;
    }
    return false;
  }

  @action async requestStatus(request) {
    // We use set in order to make sure the context updates properly.
    if (!request.isDeleted && !this.updatingQueue) {
      request.position = 0;
      let oldSiblings = [];
      if (request.processed === true) {
        // Next line makes the element to get back in the pending list but in the last position:
        oldSiblings = this.pendingSongs.filter((item) => item.id != request.id);
      } else {
        oldSiblings = this.playedSongs;
      }

      request.processed = !request.processed;
      if(request.processed){
        request.isPlaying = false;
      }
      
      await request.save().then(async () => {
        console.log('Updated request' + request.position);        
        if (request.processed && request.songId) {
          this.store
            .findRecord('song', request.song.get('id'))
            .then((actualSong) => {
              if (actualSong.isLoaded) {
                actualSong.last_played = new Date();
                actualSong.times_played = Number(actualSong.times_played) + 1;
                actualSong.save();
              }
            });
        }
        
        let count = 0;
        await oldSiblings.forEach(async (sibling) => {
          count = Number(count) + 1;
          sibling.position = count;
          await sibling.save();
          //sibling.debug(played.position+'. '+played.effectiveTitle);
        });

        this.scrollPlayedPosition = 0;
        this.scrollPendingPosition = 0;

        this.fileContent(this.pendingSongs);
      });
    }
  }
  
  @action async externalToQueue(donodata){
    // console.debug('Premium request: ', donodata);
    if(donodata.amount >= this.globalConfig.config.premiumThreshold &&  this.globalConfig.config.premiumRequests){
      //donodata.message = '!sr fury heart';
      //donodata.fullname = 'Papercat the mongoloid'
      if(donodata.message.startsWith('!sr ')){
        this.store.query('request', {
          filter: { externalId: donodata.id },
        }).then(async (exist)=>{
          if(exist.length == 0){
            var song = donodata.message.replace(/!sr /g, '');
            song = song.replace(/&/g, ' ');
            song = song.replace(/\//g, ' ');
            song = song.replace(/-/g, ' ');
            song = song.replace(/[^a-zA-Z0-9'?! ]/g, '');
            //console.log(donodata.fullname+' paid '+donodata.formattedAmount+' to request the song '+song);
            this.requestpattern = song;
            //if (this.filteredSongs.length > 0) {
                let bestmatch = await this.filteredSongs.shift();
              //if(bestmatch){
                let nextPosition = this.nextPosition();

                let newRequest = this.store.createRecord('request');
                newRequest.chatid = 'songExt';
                newRequest.externalId = donodata.id;
                newRequest.platform = donodata.platform;
                newRequest.timestamp = new Date();
                newRequest.type = 'setlist';
                newRequest.user = donodata.fullname || donodata.user;
                newRequest.displayname = donodata.fullname;            
                newRequest.processed = false;
                newRequest.donation = donodata.amount;
                newRequest.donationFormatted = donodata.formattedAmount;
                newRequest.isPremium = true;
                newRequest.position = nextPosition;
                if(bestmatch){
                  newRequest.song = bestmatch;
                  newRequest.title = bestmatch.title || donodata.message;
                  newRequest.artist = bestmatch.artist || '';
                } else {
                  newRequest.song = ''; 
                  newRequest.title = song;
                  newRequest.artist = '';
                }
                newRequest.save().then(async () => {
                  // Song statistics:
                  if(bestmatch){
                    bestmatch.times_requested = Number(bestmatch.times_requested) + 1;
                    await bestmatch.save();
                  }
                  // console.debug(bestmatch.fullText+' added at position '+nextPosition);
                  this.lastsongrequest = newRequest;
                  this.scrollPendingPosition = 0;
                  this.scrollPlayedPosition = 0;
                  this.fileContent(this.pendingSongs);
                });
                this.fileContent(this.pendingSongs);
              //}
            //}
          }
        });
      }
    }    
  }

  @action async songToQueue(selected, toTop = false) {
    if(!this.updatingQueue){
      let nextPosition = await this.nextPosition();

      if (toTop) {
        this.pendingSongs.forEach((request) => {
          request.position = request.position + 1;
          request.save().then(() => {
            // console.debug(request.fullText+' moved to position '+request.position+' in queue.');
          });
        });
        nextPosition = 0;
      }

      let newRequest = this.store.createRecord('request');
      newRequest.chatid = 'songsys';
      newRequest.timestamp = new Date();
      newRequest.type = 'setlist';
      newRequest.song = selected;
      newRequest.user = this.twitchChat.botUsername;
      if (this.globalConfig.config.defbotclient) {
        newRequest.user = this.globalConfig.config.defbotclient.get('username');
      } else {
        newRequest.displayname = 'setlist';
      }
      newRequest.processed = false;
      newRequest.position = nextPosition;
      newRequest.title = selected.title || '';
      newRequest.artist = selected.artist || '';

      newRequest.save().then(async () => {
        // Song statistics:
        selected.times_requested = Number(selected.times_requested) + 1;
        await selected.save();

        // console.debug(selected.fullText+' added at position '+nextPosition);
        this.lastsongrequest = newRequest;
        this.scrollPendingPosition = 0;
        this.scrollPlayedPosition = 0;
        this.fileContent(this.pendingSongs);
      });
      this.fileContent(this.pendingSongs);
    }
  }

  @action nextSong() {
    if (this.pendingSongs.length > 0 && !this.updatingQueue) {
      // For selecting the last element of the array:
      let firstRequest = this.pendingSongs[0];

      let oldPlayed = this.playedSongs;
      let count = 0;
      oldPlayed.forEach((played) => {
        count = Number(count) + 1;
        played.position = count;
        played.isPlaying = false;
        played.save();
        //console.debug(played.position+'. '+played.effectiveTitle);
      });

      firstRequest.position = 0;
      firstRequest.processed = true;
      firstRequest.isPlaying = true;
      firstRequest.save().then(() => {
        if (!firstRequest.song.get('isDeleted')) {
          this.store
            .findRecord('song', firstRequest.song.get('id'))
            .then(async (song) => {
              if (await song.isLoaded) {
                //console.debug(song);
                song.times_played = Number(song.times_played) + 1;
                await song.save();
              }
            });
        }
        this.scrollPlayedPosition = 0;
        this.scrollPendingPosition = 0;
        this.fileContent(this.pendingSongs);
      });
    }
    this.fileContent(this.pendingSongs);
  }

  @action async prevSong() {
    if (this.playedSongs.length > 0 && !this.updatingQueue) {
      // For selecting the first element of the array:

      let oldPending = this.pendingSongs;
      let count = 0;
      oldPending.forEach((pending) => {
        count = Number(count) + 1;
        pending.position = count;
        pending.isPlaying = false;
        pending.save();
        //console.debug(pending.position+'. '+pending.effectiveTitle);
      });

      let lastPlayed = this.playedSongs[0];
      if (lastPlayed) {
        lastPlayed.position = 0;
        lastPlayed.processed = false;
        lastPlayed.isPlaying = true;
        lastPlayed.save().then(() => {
          this.scrollPlayedPosition = 0;
          this.scrollPendingPosition = 0;
          this.fileContent(this.pendingSongs);
        });
      }
    }

    this.fileContent(this.pendingSongs);
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
            this.globalConfig.config.get('overlayLength') || 5
          );
          visible.forEach((pendingsong) => {
            title = pendingsong.effectiveTitle;
            artist = pendingsong.effectiveArtist;
            time = moment(pendingsong.timestamp).format('YYYY/MM/DD HH:mm:ss');
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
