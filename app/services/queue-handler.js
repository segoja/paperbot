import Service from '@ember/service';
import { action, set } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { WebviewWindow, getCurrent } from "@tauri-apps/api/window"
import { writeFile, readTextFile, readBinaryFile } from '@tauri-apps/api/fs';
import moment from 'moment';
import { empty, sort } from '@ember/object/computed';

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
        var htmlEntries = '';
        htmlEntries = htmlEntries.concat(`
          <!doctype html>
            <html lang="en">
              <head>
                <!-- Required meta tags -->
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=yes">
                <meta http-equiv="refresh" content="2">
                <!-- Bootstrap CSS -->
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">

                <title>Song queue</title>
              </head>
              <body class="bg-transparent" style="overflow-y: hidden;">
                <div class="container-fluid" style="overflow-y: hidden;">
        `);
        if(pendingSongs.length > 0){
          pendingSongs.slice(0, 5).forEach((pendingsong)=>{          
            htmlEntries = htmlEntries.concat("\n\t\t\t<div class=\"alert-dark border-0 rounded py-0 px-2 my-2 bg-transparent text-white\">");
            htmlEntries = htmlEntries.concat("\n\t\t\t\t<div class=\"alert-heading h4\">"+pendingsong.song+"</div>");
            htmlEntries = htmlEntries.concat("\n\t\t\t\t<div class=\"row\">");
            htmlEntries = htmlEntries.concat("\n\t\t\t\t\t<div class=\"col h6\">"+moment(pendingsong.timestamp).format("YYYY/MM/DD HH:mm:ss")+"</div>");
            htmlEntries = htmlEntries.concat("\n\t\t\t\t\t<div class=\"col-auto h6\">"+pendingsong.user+"</div>");
            htmlEntries = htmlEntries.concat("\n\t\t\t\t</div>");
            htmlEntries = htmlEntries.concat("\n\t\t\t</div>");          
          });
        } else {
          htmlEntries = htmlEntries.concat("\n\t\t\t<div class=\"alert-dark border-0 rounded py-0 px-2 my-2 bg-transparent text-white\">");
          htmlEntries = htmlEntries.concat("\n\t\t\t\t<div class=\"alert-heading h4\">The queue is empty.</div>");
          htmlEntries = htmlEntries.concat("\n\t\t\t</div>");
        }
        htmlEntries = htmlEntries.concat(`
          </div>
              <script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" crossorigin="anonymous"></script>
              <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>
            </body>
          </html>
        `);
        
        this.overlayGenerator(htmlEntries, pathString);
      }
    }    
  }
  
  @action async overlayGenerator(newHtml, pathString){
    this.oldHtml = newHtml;
    await writeFile({'contents': newHtml, 'path': pathString}).then(()=>{
      console.log("done!")
    });
  }  
}