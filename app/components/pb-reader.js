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
    
    let currentWindow = getCurrent();
    if(currentWindow.label === 'reader'){
      if(this.globalConfig.config.readerMax){
        currentWindow.maximize();
      }
      currentWindow.listen('tauri://resize', async function (response) {
        if(!this.globalConfig.config.readerMax){        
          this.globalConfig.config.readerWidth = response.payload.width; 
          this.globalConfig.config.readerHeight = response.payload.height;
          later(() => {            
            if(this.globalConfig.config.readerWidth === response.payload.width && this.globalConfig.config.readerHeight === response.payload.height){
              this.globalConfig.config.save();
              console.debug('Size saved!');
            }
          }, 500); 
        }
      }.bind(this));
      
      currentWindow.listen('tauri://move', async function (response) { 
        if(!this.globalConfig.config.readerMax){
          this.globalConfig.config.readerPosX = response.payload.x;
          this.globalConfig.config.readerPosY = response.payload.y;
          later(() => {
            if(this.globalConfig.config.readerPosX === response.payload.x && this.globalConfig.config.readerPosY === response.payload.y){
              this.globalConfig.config.save();
              console.debug('Position saved!.');
            }          
          }, 250);
        }
      }.bind(this));            
    }
  }
  
  
  songsSorting = Object.freeze(['date_added:asc']);  
  @sort ('args.songs','songsSorting') arrangedContent;
  
  @computed('globalConfig.config.lastPlayed', 'restore', 'selected')
  get filterQueryString(){
    let restore = this.restore;
    let lastPlayed = this.globalConfig.config.lastPlayed;
    let selected = this.selected;
    if( lastPlayed != '' && !selected ){
      return lastPlayed.replace(' by ',' ').replace(/"/g, "").replace(/.$/, " ");
    }
    return '';
  }

  @computedFilterByQuery(
    'arrangedContent',
    ['title','artist'],
    'filterQueryString',
    { conjunction: 'and', sort: false}
  ) filteredContent;  

  get currentSong(){
    let song = [];
    if(this.selected){
      song = this.selected;
    } else {
      if(this.globalConfig.config.lastPlayed){
        song = this.filteredContent.shift();
      } else {
        console.debug('No songs active.');
      }      
    }
    return song;
  }
  
  @computedFilterByQuery(
    'arrangedContent',
    ['title','artist'],
    'songQuery',
    { conjunction: 'and', sort: false, limit: 20}
  ) filteredSongs; 

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
    this.zoomLevel = 0.85;
  }
  
  @action addZoom(){
    this.zoomLevel = this.zoomLevel + 0.025;
  }
  
  @action subZoom(){
    this.zoomLevel = this.zoomLevel - 0.025;
  }
  
  get updateLight(){
    if(this.globalConfig.config.darkmode){
      this.lightControl.toggleMode(true);
      return true;
    } else {
      this.lightControl.toggleMode(false);
      return false;
    }
  }
  
  @action toggleMode(){
    if(this.globalConfig.config.isLoaded && !this.globalConfig.config.isSaving){
      this.globalConfig.config.darkmode = !this.globalConfig.config.darkmode;
      this.globalConfig.config.save().then(()=>{
        this.lightControl.toggleMode(this.globalConfig.config.darkmode); 
      });
    }
  }  
}
