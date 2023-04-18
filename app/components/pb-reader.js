import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort } from '@ember/object/computed';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';
import * as Transposer from 'chord-transposer';

export default class PbReaderComponent extends Component {
  @service currentUser;
  @service twitchChat;
  @service globalConfig;
  @service headData;
  @service lightControl;
  @tracked selected = '';
  @tracked songQuery = '';
  @tracked restore = true;
  @tracked zoomLevel = 0.85;
  @tracked transKey = 0;
  @tracked mode = true;
  
  @tracked firstRequest = '';

  constructor() {
    super(...arguments);
  }

  requestSorting = Object.freeze(['position:asc', 'timestamp:desc']);
  @sort('args.requests', 'requestSorting') arrangedRequests;

  songsSorting = Object.freeze(['date_added:asc']);
  @sort('args.songs', 'songsSorting') arrangedContent;

  @computedFilterByQuery('arrangedContent', ['title', 'artist'], 'songQuery', {
    conjunction: 'and',
    sort: false,
    limit: 20,
  })
  filteredSongs;

  get currentSong() {
    let song = [];
    if (this.selected) {
      song = this.selected;
    } else {
      if (this.firstRequest) {
        song = this.firstRequest;
      } else {
        console.debug('No songs active.');
      }
    }
    return song;
  }

  @action async setActiveSong(){
    if(this.currentSong.hasDirtyAttributes){
      this.currentSong.rollbackAttributes();
    }
    let pending = this.arrangedRequests.filter(request => !request.processed);
    if (pending.length > 0) {
      if(pending[0].get('song')){
        this.firstRequest = await pending[0].get('song');
      }
    }
  }

  @action searchSong(query) {
    this.songQuery = query;
    return this.filteredSongs;
  }

  @action selectSong(song) {
    if(this.currentSong.hasDirtyAttributes){
      this.currentSong.rollbackAttributes();
    }
    this.selected = song;
    this.restore = false;
    later(() => {
      this.restore = true;
    }, 10);
  }

  @action resetZoom() {
    if(this.currentSong){
      this.currentSong.zoomLevel = Number(0.85);
    }
  }

  @action autoColumn() {
    if(this.currentSong){
      this.currentSong.columns = 0;
    }
  }

  @action moreColumn() {
    if(this.currentSong){
      if (this.currentSong.columns < 5) {
        this.currentSong.columns =
          Number(this.currentSong.columns) + 1;
      }
    }
  }

  @action lessColumn() {
    if (this.currentSong.columns > 0) {
      this.currentSong.columns =
        Number(this.currentSong.columns) - 1;
    }
  }

  @action upKey() {
    if(this.currentSong){
      this.transpose(1);
    }
  }

  @action downKey() {
    if(this.currentSong){
      this.transpose(-1);
    }
  }

  @action transpose(step){    
    if(this.currentSong.lyrics){
      let content = Transposer.transpose(this.currentSong.lyrics);
      if (!isNaN(step)) {        
        content = content.up(step);
        this.currentSong.transSteps += step;
        this.currentSong.lyrics = String(content);
      }
    }
  }

  @action addZoom() {
    if(this.currentSong){
      this.currentSong.zoomLevel = Number(this.currentSong.zoomLevel) + Number(0.025);
    }
  }

  @action subZoom() {
    if(this.currentSong){
      this.currentSong.zoomLevel = Number(this.currentSong.zoomLevel) - Number(0.025);
    }
  }
  
  @action modeSwitch(){
    if(this.currentSong){
      this.currentSong.viewMode = !this.currentSong.viewMode;
    }
  }
  
  @tracked saving = false;
  @action doneEditing() {
    if(this.currentSong){
      this.currentSong.save();
      this.saving = true;
      later(() => {
        this.saving = false;
      }, 500);
    }
  }
}
