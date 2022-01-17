import Service, { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { uniqBy } from '@ember/object/computed';
import { dialog } from "@tauri-apps/api";
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
  @service twitchChat;
  @service store;
  @service router;
  @tracked lastStream = '';
  @tracked scrollPlayedPosition = 0;
  @tracked scrollPendingPosition = 0;
  @tracked oldHtml = '';
  @tracked lastsongrequest;

  // We use this property to track if a key is pressed or not using ember-keyboard helpers.
  @tracked modifierkey =  false;
  
  get songqueue(){
    return this.store.peekAll('request');
  }
    
  queueAscSorting = Object.freeze(['position:asc','timestamp:desc']); 
  @sort (
    'songqueue',
    'queueAscSorting'
  ) arrangedAscQueue;
  
  queueDescSorting = Object.freeze(['position:desc','timestamp:desc']);    
  @sort (
    'songqueue',
    'queueDescSorting'
  ) arrangedDescQueue;  
    

  get pendingSongs() {
    return this.arrangedAscQueue.filterBy('processed', false);
  }
  
  get nextPosition(){
    let positioned = this.pendingSongs.filter(item => !isNaN(item.position));
    let nextPos = 0;
    if(positioned.length > 0){
      nextPos = Number(positioned.get('lastObject').position)+1;
    }
    return nextPos;
  }
  
  get playedSongs() {
    return this.arrangedDescQueue.filterBy('processed', true);
  }
   
  // Buttons

  
  @action clearPending(){
    //if(uniqBy('pendingSongs', 'songId').length > 0){
      this.pendingSongs.uniqBy('songId').forEach((item)=>{
        item.song.then((song)=>{
          let requests = this.pendingSongs.filterBy('song.id', song.get('id'));        
          let times = requests.get('length');        
          song.times_requested = Number(song.times_requested) - Number(times);        
          requests.forEach((request)=>{
            request.destroyRecord()
          })
          song.save().then(()=>{
            console.debug(song.title+' requests adjusted by -'+times);
          });          
        })
      });
    //}
  }
  
  @action exportQueue(){
    if(this.songqueue.length > 0 ){
      
      let setlist = "";
      
      this.playedSongs.reverse().forEach(async (request)=>{
        setlist = setlist + '+ '+request.title+'\n';
      });
      this.pendingSongs.forEach(async (request)=>{
        setlist = setlist + '- '+request.title+'\n';
      });
            
      let filename = moment().format('YYYYMMDD-HHmmss')+'-setlist.txt'; 
      
      dialog.save({
        defaultPath: filename,
        filters: [{name: '', extensions: ['txt']}]
      }).then((path)=>{
        if(path){
          writeFile({'path': path, 'contents': setlist}).then(()=>{
            console.debug('Setlist file saved!');
          });
        }
      });
    }
  }
  
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

  @action async requestStatus(request) {    
    // We use set in order to make sure the context updates properly.
    request.position = 0;
    if(request.processed === true){
      // Next line makes the element to get back in the pending list but in the last position:
      let oldPending = this.pendingSongs.removeObject(request);
      let count = 0
      oldPending.forEach((pending)=>{
        count = Number(count) +1
        pending.position = count;
        pending.save();
        //console.debug(pending.position+'. '+pending.title);
      });      
    } else {
      let oldPlayed = this.playedSongs;
      let count = 0
      oldPlayed.forEach((played)=>{
        count = Number(count) -1;
        played.position = count;
        played.save();
        //console.debug(played.position+'. '+played.title);
      });
    }
    
    request.processed = !request.processed;
    
    request.save().then(()=>{
      if(request.processed){        
        this.store.findRecord('song', request.song.get('id')).then(async (actualSong)=>{
          if(await actualSong.isLoaded){
            actualSong.last_played = new Date();
            actualSong.times_played = Number(actualSong.times_played) + 1;
            await actualSong.save();
          }
        });
      }
      
      this.scrollPlayedPosition = 0;
      this.scrollPendingPosition = 0;
            
      if(this.currentUser.updateQueueOverlay && this.currentUser.lastStream.requests){
        this.fileContent(this.pendingSongs);
      }
    });
  }
  
  @action songToQueue(selected){
    let nextPosition = this.nextPosition;

    let newRequest = this.store.createRecord('request'); 
    newRequest.chatid = 'songsys';
    newRequest.timestamp = new Date();
    newRequest.type = 'setlist';
    newRequest.song = selected;
    newRequest.user = this.twitchChat.botUsername;
    if(this.globalConfig.config.defbotclient){
      newRequest.user = this.globalConfig.config.defbotclient.get('username');
    } else {
      newRequest.displayname = 'setlist';
    }
    newRequest.processed = false;
    newRequest.position = nextPosition;                  
    
    newRequest.save().then(async()=>{
      // Song statistics:
      selected.times_requested = Number(selected.times_requested) + 1;
      await selected.save();
      
      console.log(selected.fullText+' added at position '+nextPosition);
      this.lastsongrequest = newRequest;
      this.scrollPendingPosition = 0;
      this.scrollPlayedPosition = 0;               
    });
  }
  
  @action async nextSong(){
    if(this.pendingSongs.get('length') > 0){
      // For selecting the last element of the array:
      let firstRequest = this.pendingSongs.get('firstObject'); 
      
      let oldPlayed = this.playedSongs;
      let count = 0
      oldPlayed.forEach((played)=>{
        count = Number(count) -1;
        played.position = count;
        played.save();
        //console.debug(played.position+'. '+played.title);
      }); 
      
      firstRequest.position = 0;
      firstRequest.processed = true;
      firstRequest.save().then(()=>{
        this.store.findRecord('song', firstRequest.song.get('id')).then(async (song)=>{
          if(await song.isLoaded){
            //console.debug(song);
            song.times_played = Number(song.times_played) + 1;
            await song.save();
          }
        });
        this.scrollPlayedPosition = 0;
        this.scrollPendingPosition = 0;
        this.fileContent(this.pendingSongs);       
      });
    }
    
    if(this.currentUser.updateQueueOverlay && this.currentUser.lastStream.requests){
      this.fileContent(this.pendingSongs);
    }
  }
  
  @action async prevSong(){
    if(this.playedSongs.get('length') > 0){
      // For selecting the first element of the array:
      
      let oldPending = this.pendingSongs;
      let count = 0
      oldPending.forEach((pending)=>{
        count = Number(count) +1
        pending.position = count;
        pending.save();
        //console.debug(pending.position+'. '+pending.title);
      });
      
      let firstRequest = this.playedSongs.get('firstObject');      
      firstRequest.position = 0;      
      firstRequest.processed = false;  
      
      firstRequest.save().then(()=>{
        this.scrollPlayedPosition = 0;
        this.scrollPendingPosition = 0;
      });
    }
    
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
      //console.debug('Too slow...');
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