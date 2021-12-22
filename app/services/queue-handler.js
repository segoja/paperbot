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
    this.scrollPlayedPosition = 0;
    this.scrollPendingPosition = 0;
    
    if(this.pendingSongs.get('length') != 0){
      this.globalConfig.config.lastPlayed = this.pendingSongs[0].song;
    } else {
      this.globalConfig.config.lastPlayed = '';
    }
    this.globalConfig.config.save();
    
    if(this.currentUser.queueToFile && this.currentUser.lastStream.requests){
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
    if(this.currentUser.queueToFile && this.currentUser.lastStream.requests){
      this.fileContent(this.pendingSongs);
    }
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
      this.scrollPlayedPosition = 0;
      this.scrollPendingPosition = 0;
      this.fileContent(this.pendingSongs);
      if(this.pendingSongs.get('length') != 0){
        this.globalConfig.config.lastPlayed = this.pendingSongs[0].song;
      } else {
        this.globalConfig.config.lastPlayed = '';
      }
      this.globalConfig.config.save();
    }
    if(this.currentUser.queueToFile && this.currentUser.lastStream.requests){
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
      this.globalConfig.config.save();
    }
    if(this.currentUser.queueToFile && this.currentUser.lastStream.requests){
      this.fileContent(this.pendingSongs);
    }
  }
  
  @action fileContent(pendingSongs, firstRun = false){
    if (this.globalConfig.config.overlayfolder != ''){
      if((this.currentUser.queueToFile && this.globalConfig.config.overlayfolder != '' && this.currentUser.lastStream.requests) || firstRun){
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
            let song = pendingsong.song;
            let time = moment(pendingsong.timestamp).format("YYYY/MM/DD HH:mm:ss");
            let user = pendingsong.user;
            htmlEntries = htmlEntries.concat(`
      <div class="alert-dark border-0 rounded py-0 px-2 my-2 bg-transparent text-white">
        <div class="alert-heading h4">${song}</div>
        <div class="row">
          <div class="col h6">${time}</div>
          <div class="col-auto h6">${user}</div>
        </div>
      </div>
            `);
          });
        } else {
          htmlEntries = htmlEntries.concat(`
      <div class="alert-dark border-0 rounded py-0 px-2 my-2 bg-transparent text-white">
        <div class="alert-heading h4">The queue is empty.</div>
      </div>
          `);
        }
        
      let htmlBase = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=yes">
    <meta http-equiv="refresh" content="2">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <title>Song queue</title>
  </head>
  <body class="bg-transparent" style="overflow-y: hidden;">
    <div class="container-fluid" style="overflow-y: hidden;">
    ${htmlEntries}
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
      // console.log(thisHtml);
    }
    catch (exception_var) {
      console.log('Lentorro');
    }
    finally {
      let text = unescape(encodeURIComponent(thisHtml));
      //let arrayBuff = new TextEncoder().encode(text);
      writeFile({'path': pathString, 'contents': thisHtml}).then(()=>{
        console.log("done!")
      });
    }
  }  
}