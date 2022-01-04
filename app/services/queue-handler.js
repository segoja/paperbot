import Service, { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { WebviewWindow, getCurrent } from "@tauri-apps/api/window"
import {
  writeBinaryFile,
  writeFile,
  readTextFile,
  readBinaryFile
} from '@tauri-apps/api/fs';
import moment from 'moment';
import { empty, sort } from '@ember/object/computed';
import { htmlSafe } from '@ember/template';

export default class QueueHandlerService extends Service {
  @service globalConfig;
  @service currentUser;
  @service store;
  @service router;
  @tracked songqueue = []; 
  @tracked lastStream = '';
  @tracked scrollPlayedPosition = 0;
  @tracked scrollPendingPosition = 0;
  @tracked oldHtml = '';

  // We use this property to track if a key is pressed or not using ember-keyboard helpers.
  @tracked modifierkey =  false;  
  
  queueAscSorting = Object.freeze(['timestamp:asc']); 
  @sort (
    'songqueue',
    'queueAscSorting'
  ) arrangedAscQueue;
  
  queueDescSorting = Object.freeze(['timestamp:desc']);    
  @sort (
    'songqueue',
    'queueDescSorting'
  ) arrangedDescQueue;
  
    
  get pendingSongs() {
    return this.arrangedAscQueue.filterBy('processed', false);
  }
  
  get playedSongs() {
    return this.arrangedDescQueue.filterBy('processed', true);
  }
   
  // Buttons
  
  // Song processing related actions  
  @action modPressed(){
    if(this.modifierkey === false){
      this.modifierkey = true;
    }
  }
  
  @action modNotPressed(){
    if(this.modifierkey){
      this.modifierkey = false;
    }
  }

  @action requestStatus(song) {    
    // We use set in order to make sure the context updates properly.
    if(song.processed === true && this.modifierkey === true){
      // Next line makes the element to get back in the pending list but in the last position:
      set(song,'timestamp',moment().format());
    }
    set(song,'processed', !song.processed);
    
    if(song.processed){
      this.store.findRecord('song', song.songId).then(async (actualSong)=>{
        if(await actualSong.isLoaded){
          actualSong.last_played = new Date();
          actualSong.times_played = Number(actualSong.times_played) + 1;
          await actualSong.save();
        }
      });
    }
    
    this.scrollPlayedPosition = 0;
    this.scrollPendingPosition = 0;
    
    if(this.pendingSongs.get('length') != 0){
      this.globalConfig.config.lastPlayed = this.pendingSongs[0].song;
    } else {
      this.globalConfig.config.lastPlayed = '';
    }
    
    // We keep the keue updated in the config so the overlay window updates:
    this.globalConfig.config.songQueue = this.pendingSongs;
    this.globalConfig.config.save();
    
    if(this.currentUser.updateQueueOverlay && this.currentUser.lastStream.requests){
      this.fileContent(this.pendingSongs);
    }    
  }
  
  @action backToQueue(song) {    
    // We use set in order to make sure the context updates properly.
    if(song.processed === true){
      // Next line makes the element to get back in the pending list but in the last position:
      set(song,'timestamp',moment().format());
    }
    set(song,'processed', !song.processed);
    this.scrollPlayedPosition = 0;
    this.scrollPendingPosition = 0;
    if(this.currentUser.updateQueueOverlay && this.currentUser.lastStream.requests){
      this.fileContent(this.pendingSongs);
    }
    // We keep the keue updated in the config so the overlay window updates:
    this.globalConfig.config.songQueue = this.pendingSongs;
    this.globalConfig.config.save();
  }

  
  @action nextSong(){
    if(this.pendingSongs.get('length') != 0){
      // For selecting the last element of the array:
      // let firstSong = this.pendingSongs[this.pendingSongs.length-1];
      // For selecting the first element of the array:
      let firstSong = this.pendingSongs[0];
      //if(firstSong.processed === true){
        // set(firstSong, 'timestamp', moment().format());
      //}
      set(firstSong,'processed', true);
      this.store.findRecord('song', firstSong.songId).then(async (song)=>{
        if(await song.isLoaded){
          console.log(song);
          song.times_played = Number(song.times_played) + 1;
          await song.save();
        }
      });
      this.scrollPlayedPosition = 0;
      this.scrollPendingPosition = 0;
      this.fileContent(this.pendingSongs);
      if(this.pendingSongs.get('length') != 0){
        this.globalConfig.config.lastPlayed = this.pendingSongs[0].song;
      } else {
        this.globalConfig.config.lastPlayed = '';
      }
    }
    // We keep the keue updated in the config so the overlay window updates:
    this.globalConfig.config.songQueue = this.pendingSongs;
    this.globalConfig.config.save();
    
    if(this.currentUser.updateQueueOverlay && this.currentUser.lastStream.requests){
      this.fileContent(this.pendingSongs);
    }
  }
  
  @action prevSong(){
    if(this.playedSongs.get('length') != 0){
      // For selecting the last element of the array:
      // let firstSong = this.playedSongs[this.playedSongs.length-1];
      // For selecting the first element of the array:
      let firstSong = this.playedSongs[0];
      if(firstSong.processed === true && this.modifierkey === true){
        // Next line makes the element to get back in the pending list but in the last position:
        set(firstSong,'timestamp',moment().format());
      }
      set(firstSong,'processed', false);
      this.scrollPlayedPosition = 0;
      this.scrollPendingPosition = 0;
      if(this.pendingSongs.get('length') != 0){
        this.globalConfig.config.lastPlayed = this.pendingSongs[0].song;
      } else {
        this.globalConfig.config.lastPlayed = '';
      }
    }
    // We keep the keue updated in the config so the overlay window updates:
    this.globalConfig.config.songQueue = this.pendingSongs;
    this.globalConfig.config.save();
    
    if(this.currentUser.updateQueueOverlay && this.currentUser.lastStream.requests){
      this.fileContent(this.pendingSongs);
    }
  }
  
  @action fileContent(pendingSongs, firstRun = false){
    if (this.globalConfig.config.overlayfolder != ''){
      if((this.currentUser.updateQueueOverlay && this.globalConfig.config.overlayfolder != '' && this.currentUser.lastStream.requests) || firstRun){
        let pathString = this.globalConfig.config.overlayfolder;
        if(pathString.substr(pathString.length - 1) === "\\"){
          pathString = pathString.slice(0, -1)+'\\queue.html';
        } else {
          pathString = pathString+'\\queue.html';
        }
        let htmlEntries = '';
        if(pendingSongs.length > 0){
          let visible = pendingSongs.slice(0, 5);
          visible.forEach((pendingsong)=>{
            let title = pendingsong.title;
            let artist = pendingsong.artist;
            let time = moment(pendingsong.timestamp).format("YYYY/MM/DD HH:mm:ss");
            let user = pendingsong.user;
            htmlEntries = htmlEntries.concat(`
          <tr>
            <td class="bg-transparent text-white">
              <div class="row g-0">
                <strong class="col">${title}</strong>
                <div class="col-auto">${user}</div>
              </div>
              <div class="row g-0">
                <small class="col"><small>${artist}</small></small>
                <small class="col-auto"><small>${time}</small></small>
              </div>
            </td>
          </tr>
            `);
          });
        } else {
          htmlEntries = htmlEntries.concat(`
          <tr>
            <td class="bg-transparent text-white">
              <div class="row g-0">
                <strong class="col">The queue is empty.</strong>
                <div class="col-auto"></div>
              </div>
              <div class="row g-0">
                <small class="col"><small></small></small>
                <small class="col-auto"><small></small></small>
              </div>
            </td>
          </tr>
          `);
        }
        
      let chroma = this.globalConfig.config.chromaColor;
      let htmlBase = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=yes">
    <meta http-equiv="refresh" content="2">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <title>Song queue</title>
    <style>
      .chroma { background-color: ${chroma}!important; }
    </style>
  </head>
  <body class="bg-transparent chroma" style="overflow-y: hidden;">
    <div class="container-fluid chroma" style="overflow-y: hidden;">
      <table class="table table-dark">
        <thead>
          <tr>
            <th class="bg-transparent text-white"><span class="d-inline-block float-start">Title</span> <span class="d-inline-block float-end">Requested by</span></th>
          </tr>
        </thead>
        <tbody>
          ${htmlEntries}
        </tbody>
      </table>
    </div>
  </body>
</html>`;   
        this.overlayGenerator(htmlBase, pathString);
      }
    }    
  }
  
  @action async overlayGenerator(newHtml, pathString){
    this.oldHtml = newHtml;
    let thisHtml = '';
    try {
      thisHtml = await newHtml;
      // console.debug(thisHtml);
    }
    catch (exception_var) {
      console.debug('Too slow...');
    }
    finally {
      let text = unescape(encodeURIComponent(thisHtml));
      //let arrayBuff = new TextEncoder().encode(text);
      writeFile({'path': pathString, 'contents': thisHtml}).then(()=>{
        console.debug("done!")
      });
    }
  }  
}