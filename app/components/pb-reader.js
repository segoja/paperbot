import Component from '@glimmer/component';
import { action, computed } from '@ember/object';
import { sort } from '@ember/object/computed';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { getCurrent } from '@tauri-apps/api/window';
import { later } from '@ember/runloop';

export default class PbReaderComponent extends Component {
  @service currentUser;
  @service twitchChat;
  @service globalConfig;
  @service headData;
  @service lightControl;
  @tracked selected = '';
  @tracked songQuery = "";
  @tracked restore = true;
  @tracked zoomLevel = 0.85;
  
  @service globalConfig;
    
  constructor() {
    super(...arguments);
  }
  
  requestSorting = Object.freeze(['position:asc', 'timestamp:desc']);  
  @sort ('args.requests','requestSorting') arrangedRequests;
  
  get firstRequest(){
    let pending = this.arrangedRequests.filterBy('processed', false);
    if(pending.length > 0){
      return pending.get('firstObject');
    }
    return '';
  }
  
  songsSorting = Object.freeze(['date_added:asc']);  
  @sort ('args.songs','songsSorting') arrangedContent;
  
  @computedFilterByQuery(
    'arrangedContent',
    ['title','artist'],
    'songQuery',
    { conjunction: 'and', sort: false, limit: 20}
  ) filteredSongs; 
  
  get currentSong(){
    let song = [];
    if(this.selected){
      song = this.selected;
    } else {
      if(this.firstRequest){
        song = this.firstRequest.song;
      } else {
        console.debug('No songs active.');
      }      
    }
    return song;
  }

  @action searchSong(query){
    this.songQuery = query;
    return this.filteredSongs;
  }   
  
  @action selectSong(song){
    this.selected = song;
    this.restore = false;
    later(() => { this.restore = true; }, 10);   
  }
  
  @action resetZoom(){
    this.globalConfig.config.readerZoom = Number(0.85);
    this.globalConfig.config.save();
  }
  
  @action autoColumn(){
    this.globalConfig.config.readerColumns = 0;
    this.globalConfig.config.save();
  }  

  @action moreColumn(){
    if(this.globalConfig.config.readerColumns < 5){
      this.globalConfig.config.readerColumns = Number(this.globalConfig.config.readerColumns) + 1;
      this.globalConfig.config.save();
    }
  }
  
  @action lessColumn(){
    if(this.globalConfig.config.readerColumns > 0){
      this.globalConfig.config.readerColumns = Number(this.globalConfig.config.readerColumns) - 1;
      this.globalConfig.config.save();
    }
  }
  
  @action addZoom(){
    this.globalConfig.config.readerZoom = Number(this.globalConfig.config.readerZoom) + Number(0.025);
    this.globalConfig.config.save();
  }
  
  @action subZoom(){
    this.globalConfig.config.readerZoom = Number(this.globalConfig.config.readerZoom) - Number(0.025);
    this.globalConfig.config.save();
  }
}
