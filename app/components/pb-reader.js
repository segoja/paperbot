import Component from '@glimmer/component';
import { action } from '@ember/object';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';
import { sort } from '@ember/object/computed';
import { htmlSafe } from '@ember/template';
import { isEmpty } from '@ember/utils';
export default class PbReaderComponent extends Component {
  @service currentUser;
  @service twitchChat;
  @service globalConfig;
  @service headData;
  @service lightControl;
  @service queueHandler;
  @service chordAnalysis;
  @tracked selected = null;
  @tracked songQuery = '';
  @tracked restore = true;
  @tracked zoomLevel = 0.85;
  @tracked transKey = 0;
  @tracked mode = true;
  activeSongRequestToken = 0;

  constructor() {
    super(...arguments);
    this.isEditing = false;
    this.isSetlist = false;
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.isEditing = false;
    this.isSetlist = false;
  }

  @tracked isSetlist = false;
  @tracked isEditing = false;

  songsSorting = Object.freeze(['date_added:asc']);
  @sort('args.songs', 'songsSorting') arrangedContent;

  @computedFilterByQuery(
    'arrangedContent',
    ['title', 'artist', 'keywords'],
    'songQuery',
    { conjunction: 'and', sort: false, limit: 20 },
  )
  filteredSongs;

  get currentSong() {
    return this.activeSong;
  }

  get keyAnalysis() {
    if (!this.currentSong?.id) return null;
    let lyrics = this.currentSong?.get('lyrics');

    if (!lyrics) {
      return null;
    }
    console.debug('[PbReaderComponent] analyzing...');
    return this.chordAnalysis.analyze(lyrics, { key: 0 });
  }

  get content() {
    if (isEmpty(this.keyAnalysis)) {
      return null;
    }

    let analysis = this.keyAnalysis;

    if (!this.currentSong?.viewMode) {
      return analysis.transposedText;
    }
    console.debug('[PbReaderComponent] updating...');
    return htmlSafe(this.chordAnalysis.renderChordMode(analysis));
  }

  @action toggleSetlist() {
    this.isSetlist = !this.isSetlist;
  }

  @action closeSetlist() {
    if (this.isSetlist) {
      this.isSetlist = false;
      console.debug('Closing setlist...');
    }
  }

  @action clearSelect() {
    this.selected = null;
  }

  @tracked activeSong = null;
  @tracked activeRequest = null;

  get isLocked() {
    if (this.activeRequest?.isPlaying || this.selected) {
      return true;
    }
    return false;
  }

  get canSave() {
    if (!this.currentSong) return false;
    const result = this.currentSong?.get('hasDirtyAttributes');
    return !result;
  }

  @action async setActiveSong() {
    if (this.selected) {
      this.activeRequest = null;
      this.activeSong = this.selected;
      return;
    }

    if (this.queueHandler.firstPendingRequest?.id) {
      const song = await this.queueHandler.firstPendingRequest.get('song');
      this.activeRequest = this.queueHandler.firstPendingRequest;
      if (song?.id != this.activeSong?.id) {
        console.debug('New song active...');
        this.activeSong = song;
      }
      return;
    }

    this.activeRequest = null;
    this.activeSong = null;
  }

  @action togglePlaying() {
    if (this.activeRequest) {
      this.queueHandler.arrangedAscQueue.forEach((request) => {
        if (request.id === this.activeRequest.id) {
          request.isPlaying = !request.isPlaying;
        } else {
          request.isPlaying = false;
        }
        if (request.get('hasDirtyAttributes')) {
          request.save();
        }
      });
    }
  }

  @action searchSong(query) {
    this.songQuery = query;
    return this.filteredSongs;
  }

  @action selectSong(song) {
    if (this.currentSong?.get('hasDirtyAttributes')) {
      this.currentSong.rollbackAttributes();
    }
    this.selected = song;
    this.restore = false;
    later(() => {
      this.restore = true;
    }, 10);
  }

  @tracked saving = false;
  @action async doneEditing() {
    if (this.currentSong) {
      this.saving = true;

      try {
        await this.currentSong.save();
        this.isEditing = false;
      } catch (error) {
        console.error('Failed to save song from reader', error);
      } finally {
        later(() => {
          this.saving = false;
        }, 500);
      }
    }
  }

  @tracked swipping = false;
  @tracked swipex = 0;
  @tracked swipey = 0;
  @action swipeQueue(event) {
    if (!this.selected) {
      let threshold = 100; //required min distance traveled to be considered swipe
      if (event.type === 'touchstart' && !this.swipping) {
        this.swipping = true;
        this.swipex = event.changedTouches[0].pageX;
        this.swipey = event.changedTouches[0].pageY;
      }
      if (event.type === 'touchend' && this.swipping) {
        let destx = event.changedTouches[0].pageX;
        let swipedist = destx - this.swipex;
        let isHorizontal =
          Math.abs(event.changedTouches[0].pageY - this.swipey) <= 100;
        if (isHorizontal) {
          if (Math.abs(swipedist) > threshold) {
            if (destx > this.swipex) {
              this.queueHandler.prevSong();
            }
            if (destx < this.swipex) {
              this.queueHandler.nextSong();
            }
          }
        }
        this.swipping = false;
        this.swipex = 0;
        this.swipey = 0;
      }
    }
  }

  get btnState() {
    let btnClass = 'secondary';
    if (this.currentSong?.get('hasDirtyAttributes')) {
      btnClass = 'warning pulse';
    } else {
      if (this.saving) {
        btnClass = 'success';
      }
    }
    return btnClass;
  }
}
