/* global require */
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { empty, sort } from '@ember/object/computed';
import { denodeify } from 'rsvp';
import moment from 'moment';

export default class PbStreamEditComponent extends Component {
  @service twitchChat;
  @service globalConfig;

  @empty ('twitchChat.messages') isChatEmpty;
  @empty ('twitchChat.queue') isQueueEmpty;

  @tracked optsbot = this.args.stream.botclient.get('optsgetter');
  @tracked optschat = this.args.stream.chatclient.get('optsgetter');
  @tracked scrollPosition = 0;
  @tracked scrollPlayedPosition = 0;
  @tracked scrollPendingPosition = 0;
  
  @tracked message = "";
  @tracked msglist = [];  
  @tracked songqueue = [];
  @tracked soundBoardEnabled = false;

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
  
  get disableBotButton(){
    if(this.twitchChat.botConnected === true || this.args.stream.finished === true){
      return true;
    } else {
      return false;
    }
  }
  
  get disableChatButton(){
    if(this.twitchChat.botConnected === false || this.twitchChat.chatConnected === true || this.args.stream.finished === true){
      return true;
    } else {
      return false;
    }
  }
  
  get disconnectButton(){
    if(this.twitchChat.chatConnected === false && this.twitchChat.botConnected === false){
      return true;
    } else {
      return false;
    }
  }
  
  // With this getter we enable/disable the chat input box according to the chat client status.
  get inputDisabled(){
    if(this.twitchChat.chatConnected === false){
      return true;
    } else {
      return false;
    }  
  }
  
  // With this getter we limit the number of messages displayed on screen.
  get messages(){
    return this.msglist.slice(-30);
  }   

  get audiocommandslist(){
    return this.args.commands.filterBy('type','audio').filterBy('active', true);
  }
  
  get pendingSongs() {
    return this.arrangedDescQueue.filterBy('processed', false);
  }
  
  get playedSongs() {
    return this.arrangedAscQueue.filterBy('processed', true);
  }
  
  // Whith this getter we control the queue display while keeping the service updated with the settings.
  get requests(){
    this.twitchChat.takessongrequests = this.args.stream.requests;    
    return  this.args.stream.requests;
  }
  
    
  constructor() {
    super(...arguments);  
    

    
    // These lines is to allow switching to other routes
    // without losing the active chat history and song queue.
    this.msglist = this.twitchChat.messages;
    this.songqueue = this.twitchChat.queue;

    if(this.twitchChat.botConnected === true || this.twitchChat.chatConnected === true){
      this.twitchChat.botclient.on('message', this.msgGetter);
    } 
    
  }

  // Bot and Chat related actions:

  @action connectBot(){
    if(this.args.stream.channel != ''){
      // this.optsbot.channels = [this.args.stream.channel];
      this.twitchChat.channel = this.args.stream.channel;
    }
    
    this.twitchChat.audiocommands = this.audiocommandslist;
    this.twitchChat.commands = this.args.commands;
    
    this.twitchChat.connector(this.optsbot, "bot").then(()=>{
        this.twitchChat.botclient.on('message', this.msgGetter);
      }
    );
  }
  
  @action connectChat(){
    if(this.args.stream.channel != ''){
      //this.optschat.channels = [this.args.stream.channel];
      this.twitchChat.channel = this.args.stream.channel;
    }
    this.twitchChat.connector(this.optschat, "chat");
  }
  
  @action disconnectClients(){
    this.twitchChat.disconnector().then(
      function(){
        console.log("Bot and Chat clients disconnected!");    
        // 
      }, 
      function(){
        console.log("Error disconnecting!");        
      }
    );
  }
  
  @action finishStream(){
    this.args.stream.chatlog = this.msglist;
    this.args.stream.songqueue = this.songqueue;
    
    if(this.twitchChat.botConnected === true || this.twitchChat.chatConnected === true){
     this.disconnectClients();
    }
    
    this.args.stream.finished = true;
    this.args.saveStream();
    this.twitchChat.whisperlist = [];
    this.twitchChat.msglist = [];
    this.twitchChat.queue = [];    
    this.songqueue = [];
    this.msglist = [];
  }
  
  // This action gets triggered every time the channel receives a 
  // message and updates both the chatlog and the song queue.
  @action msgGetter() {
    // this.status = true;
    this.msglist = this.twitchChat.messages;    
    this.songqueue = this.twitchChat.queue;
    this.scrollPosition = 1500;
    this.scrollPlayedPosition = this.pendingSongs.get('length');
    this.scrollPendingPosition = this.playedSongs.get('length');
    if(this.queueToFile){
      // var queuehtml = document.getElementById("songqueue").innerHTML;
      this.fileContent();
    }
  }

  @action fileContent(){
    console.log("Escribiendo a disco!");      
    if (this.queueToFile){
      var fs = require('fs');
      var writeFile = denodeify(fs.writeFile);
      var readFile = denodeify(fs.readFile);
      
      console.log();
      // alert(this.globalConfig.config.soundsfolder);
      var html = readFile("ember/queue/queue-header.html", 'utf8').then((data)=>{
        this.pendingSongs.forEach((pendingsong)=>{          
          data = data.concat("\n\t\t\t<div class=\"alert-dark border-0 rounded py-0 px-2 my-2 bg-transparent text-white\">");
          data = data.concat("\n\t\t\t\t<div class=\"alert-heading h4\">"+pendingsong.song+"</div>");
          data = data.concat("\n\t\t\t\t<div class=\"row\">");
          data = data.concat("\n\t\t\t\t\t<div class=\"col h6\">"+moment(pendingsong.timestamp).format("YYYY/MM/DD HH:mm:ss")+"</div>");
          data = data.concat("\n\t\t\t\t\t<div class=\"col-auto h6\">"+pendingsong.user+"</div>");
          data = data.concat("\n\t\t\t\t</div>");
          data = data.concat("\n\t\t\t</div>");          
        });
        return readFile("ember/queue/queue-footer.html", 'utf8').then((footer)=>{
          // console.log(footer);
          return data.concat(footer);
        });
      });
      console.log(html);
      if(this.globalConfig.config.soundsfolder != ''){
        let pathstring = this.globalConfig.config.overlayfolder+'\\queue.html';
        return writeFile(pathstring, html);         
      }
    }    
  }
  
  @action sendMessage() {
    this.twitchChat.chatclient.say(this.twitchChat.channel, this.message);
    this.message = "";
  }  

  // Stream saving actions  
  
  @action doneEditing() {
    if(this.args.stream.finished === false){
      if(this.isChatEmpty === false){
        if(this.msglist != this.args.stream.chatlog){
          this.args.stream.chatlog = this.msglist;
        }
      }
      if(this.isQueueEmpty === false){
        if(this.songqueue != this.args.stream.songqueue){
          this.args.stream.songqueue = this.songqueue;
        }
      }
    }
    this.args.saveStream();
  }  
  
  // Song processing related actions  
  @action requestStatus(song) {    
    // We use set in order to make sure the context updates properly.
    set(song, 'processed', !song.processed);
    this.scrollPlayedPosition = this.pendingSongs.get('length');
    this.scrollPendingPosition = this.playedSongs.get('length');
    this.msgGetter();
  } 
  
  @action nextSong(){
    if(this.pendingSongs.get('length') != 0){
      let firstSong = this.pendingSongs[this.pendingSongs.length-1];
      set(firstSong, 'processed', true);
      this.scrollPlayedPosition = this.pendingSongs.get('length');
      this.scrollPendingPosition = this.playedSongs.get('length');
      this.fileContent();
    }

  }
  @action prevSong(){
    if(this.playedSongs.get('length') != 0){
      let firstSong = this.playedSongs[this.playedSongs.length-1];
      set(firstSong, 'processed', false);
      this.scrollPlayedPosition = this.pendingSongs.get('length');
      this.scrollPendingPosition = this.playedSongs.get('length');
      this.fileContent();
    }
  }
  // Soundboard toggle
  @action soundboardToggle(){
    this.soundBoardEnabled = !this.soundBoardEnabled;
    this.twitchChat.soundBoardEnabled = this.soundBoardEnabled;    
  }
  
  
  // Pannels interaction
  @tracked cpanpending = false;
  @tracked cpanplayed = false;
  @tracked cpanmessages = false;

  
  @action closePan(pannel){
    if (pannel === "pending"){
      this.cpanpending = !this.cpanpending;
    }
    if (pannel === "played"){
      this.cpanplayed = !this.cpanplayed;
    } 
    if (pannel === "messages"){
      this.cpanmessages = !this.cpanmessages;
    }     
  }

  @action togglePan(pannel){
    if (pannel === "pending"){
      this.cpanpending = !this.cpanpending;
    }
    if (pannel === "played"){
      this.cpanplayed = !this.cpanplayed;
    } 
    if (pannel === "messages"){
      this.cpanmessages = !this.cpanmessages;
    }
  }
  
  
  
  @tracked extraPanRight = true;

  @action toggleExtraPanRight() {
    this.extraPanRight = !this.extraPanRight;
  }   
  
  @tracked extraPanRightTop = true;

  @action toggleExtraPanRightTop() {
    this.extraPanRightTop = !this.extraPanRightTop;
  }  
  
  @tracked extraPanRightBottom = true;

  @action toggleExtraPanRightBottom() {
    this.extraPanRightBottom = !this.extraPanRightBottom;
  }    
  
  
  
  
  @tracked extraPanLeft = true;

  @action toggleExtraPanLeft() {
    this.extraPanLeft = !this.extraPanLeft;
  }
  
  @tracked extraPanLeftTop = true;

  @action toggleExtraPanLeftTop() {
    this.extraPanLeftTop = !this.extraPanLeftTop;
  }  
  
  @tracked extraPanLeftBottom = false;

  @action toggleExtraPanLeftBottom() {
    this.extraPanLeftBottom = !this.extraPanLeftBottom;
  }  


  @tracked queueToFile = false;
  @action queueWriter(){
    this.queueToFile = !this.queueToFile;
  }
}
