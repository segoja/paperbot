import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { empty, sort } from '@ember/object/computed';
import moment from 'moment';
import { later } from '@ember/runloop';
import ENV from '../config/environment';
import { fs } from "@tauri-apps/api";

export default class PbStreamEditComponent extends Component {
  @service eventsExternal;
  @service twitchChat;
  @service globalConfig;
  @service audio;
  @service currentUser;

  @empty ('twitchChat.messages') isChatEmpty;
  @empty ('twitchChat.songqueue') isQueueEmpty;
  @empty ('twitchChat.events') isEventsEmpty;
  @empty ('eventsExternal.events') isEventsExternalEmpty;
  
  // We use this property to track if a key is pressed or not using ember-keyboard helpers.
  @tracked modifierkey =  false;
  
  @tracked saving = false;
  @tracked optsbot = this.args.stream.botclient.get('optsgetter');
  @tracked optschat = this.args.stream.chatclient.get('optsgetter');
  @tracked scrollPosition = 0;
  @tracked scrollPlayedPosition = 0;
  @tracked scrollPendingPosition = 0;
  @tracked scrollEventsPosition = 0;
  @tracked message = "";
  @tracked eventlist = [];  
  @tracked msglist = [];
  
  queueAscSorting = Object.freeze(['timestamp:asc']);
 
  @sort (
    'currentUser.songqueue',
    'queueAscSorting'
  ) arrangedAscQueue;
  
  queueDescSorting = Object.freeze(['timestamp:desc']);    
  @sort (
    'currentUser.songqueue',
    'queueDescSorting'
  ) arrangedDescQueue;
  
  eventsDescSorting = Object.freeze(['timestamp:desc']);    
  @sort (
    'eventlist',
    'eventsDescSorting'
  ) arrangedDescEvents;
  
  @sort (
    'eventsExternal.evenlist',
    'eventsDescSorting'
  ) arrangedDescEventsExternal;  
  
  get disableBotButton(){
    if(this.args.stream.finished === true || this.args.stream.botclient === '' || this.args.stream.channel === ''){
      return true;
    } else {
      return false;
    }
  }
  
  get disableChatButton(){
    if(this.twitchChat.botConnected === false || this.args.stream.finished === true || this.args.stream.chatclient === '' || this.args.stream.channel === ''){
      return true;
    } else {
      return false;
    }
  }
  
  get disconnectButton(){
    if(this.twitchChat.botConnected === false){
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
    return this.msglist.slice(-45);
  }   
  // With this getter we limit the number of messages displayed on screen.
  get events(){
    let events = [];
    if(this.arrangedDescEvents.length > 0){
      events = this.arrangedDescEvents;
    }
    return events;
  }   

  get audiocommandslist(){
    let result = this.args.commands.filterBy('type','audio').filterBy('active', true);
    return result;
  }
  
  get pendingSongs() {
    return this.arrangedAscQueue.filterBy('processed', false);
  }
  
  get playedSongs() {
    return this.arrangedDescQueue.filterBy('processed', true);
  }
  
  // Whith this getter we control the queue display while keeping the service updated with the settings.
  get requests(){
    this.twitchChat.takessongrequests = this.args.stream.requests;    
    return this.args.stream.requests;
  }
    
  constructor() {
    super(...arguments);
    // These lines is to allow switching to other routes
    // without losing the active chat history and song queue.
    if(this.eventsExternal.connected){
      this.eventlist = this.eventsExternal.events; 
    } else {
      this.eventlist = this.twitchChat.events;      
    }

    this.msglist = this.twitchChat.messages;
    this.currentUser.songqueue = this.twitchChat.songqueue;
    this.scrollPlayedPosition = this.twitchChat.pendingSongs.get('length');
    this.scrollPendingPosition = this.twitchChat.playedSongs.get('length');
    
    this.twitchChat.commands = this.args.commands.filterBy('active', true);
    this.twitchChat.songs = this.args.songs.filterBy('active', true);
    
    if(this.twitchChat.botConnected === true || this.twitchChat.chatConnected === true){
      this.twitchChat.botclient.on('message', this.msgGetter);
    }
    if(this.twitchChat.botConnected === true){
      // Chat events:
      this.twitchChat.botclient.on("ban", this.msgGetter);
      this.twitchChat.botclient.on("clearchat", this.msgGetter);
      this.twitchChat.botclient.on("emoteonly", this.msgGetter);
      this.twitchChat.botclient.on("follow", this.msgGetter);
      this.twitchChat.botclient.on("followersonly", this.msgGetter);
      this.twitchChat.botclient.on("hosting", this.msgGetter);
      this.twitchChat.botclient.on("messagedeleted", this.msgGetter);
      this.twitchChat.botclient.on("mod", this.msgGetter);
      this.twitchChat.botclient.on("notice", this.msgGetter);
      this.twitchChat.botclient.on("slowmode", this.msgGetter);
      this.twitchChat.botclient.on("subscribers", this.msgGetter);
      this.twitchChat.botclient.on("timeout", this.msgGetter);
      this.twitchChat.botclient.on("unban", this.msgGetter);
      this.twitchChat.botclient.on("unhost", this.msgGetter);
      this.twitchChat.botclient.on("unmod", this.msgGetter);
      this.twitchChat.botclient.on("whisper", this.msgGetter);
      
      //  Stream events:
      this.twitchChat.botclient.on("cheer", this.eventGetter);
      this.twitchChat.botclient.on("hosted", this.eventGetter);
      this.twitchChat.botclient.on("raided", this.eventGetter);
      this.twitchChat.botclient.on("resub", this.eventGetter);
      this.twitchChat.botclient.on("subgift", this.eventGetter);
      this.twitchChat.botclient.on("submysterygift", this.eventGetter);
      this.twitchChat.botclient.on("subscription", this.eventGetter);
      this.eventsExternal.client.on("event", this.eventGetter);
      this.eventsExternal.client.on("event:test", this.eventGetter);
    }
  }

  // Bot and Chat related actions:

  @action connectBot(){
    if(this.args.stream.channel != ''){
      // this.optsbot.channels = [this.args.stream.channel];
      this.twitchChat.channel = this.args.stream.channel;
    }
    this.twitchChat.savechat = this.args.stream.savechat;
    
    this.twitchChat.audiocommands = this.audiocommandslist;
    this.twitchChat.commands = this.args.commands.filterBy('active', true);
    this.twitchChat.songs = this.args.songs.filterBy('active', true);
    this.twitchChat.chatUsername = this.args.stream.botName || '';
    this.twitchChat.botUsername = this.args.stream.chatName || '';

    
    if(this.args.stream.events && this.globalConfig.config.externaleventskey && this.globalConfig.config.externalevents){
      this.eventsExternal.token = this.globalConfig.config.externaleventskey;
      this.eventsExternal.type = this.globalConfig.config.externalevents;
      this.eventsExternal.createClient();
    }
    
    this.twitchChat.connector(this.optsbot, "bot").then(()=>{
        // Chat events:
        this.twitchChat.botclient.on('message', this.msgGetter);
        this.twitchChat.botclient.on("unban", this.msgGetter);
        this.twitchChat.botclient.on("ban", this.msgGetter);
        this.twitchChat.botclient.on("clearchat", this.msgGetter);
        this.twitchChat.botclient.on("emoteonly", this.msgGetter);
        this.twitchChat.botclient.on("follow", this.msgGetter);
        this.twitchChat.botclient.on("followersonly", this.msgGetter);
        this.twitchChat.botclient.on("hosting", this.msgGetter);
        this.twitchChat.botclient.on("messagedeleted", this.msgGetter);
        this.twitchChat.botclient.on("mod", this.msgGetter);
        this.twitchChat.botclient.on("notice", this.msgGetter);
        this.twitchChat.botclient.on("slowmode", this.msgGetter);
        this.twitchChat.botclient.on("subscribers", this.msgGetter);
        this.twitchChat.botclient.on("timeout", this.msgGetter);
        this.twitchChat.botclient.on("unhost", this.msgGetter);
        this.twitchChat.botclient.on("unmod", this.msgGetter);
        this.twitchChat.botclient.on("whisper", this.msgGetter);
        
        //  Stream events:
        this.twitchChat.botclient.on("cheer", this.eventGetter);
        this.twitchChat.botclient.on("follow", this.eventGetter);
        this.twitchChat.botclient.on("hosted", this.eventGetter);
        this.twitchChat.botclient.on("raided", this.eventGetter);
        this.twitchChat.botclient.on("resub", this.eventGetter);
        this.twitchChat.botclient.on("subgift", this.eventGetter);
        this.twitchChat.botclient.on("submysterygift", this.eventGetter);
        this.twitchChat.botclient.on("subscription", this.eventGetter);
        this.eventsExternal.client.on("event", this.eventGetter);
        this.eventsExternal.client.on("event:test", this.eventGetter);        
      }
    );
      // later(() => { console.log(document.getElementById('actualtwitchchat').contentWindow.document.getElementsByClassName('chat-input')); }, 5000);     
  }
  
  @action connectChat(){
    if(this.args.stream.channel != ''){
      //this.optschat.channels = [this.args.stream.channel];
      this.twitchChat.channel = this.args.stream.channel;
    }
    this.twitchChat.savechat = this.args.stream.savechat;    
    this.twitchChat.connector(this.optschat, "chat");
  }

  @action disconnectBot(){
    this.twitchChat.disconnectBot().then(
      function(){
        console.log("Bot client disconnected!");
        // 
      }, 
      function(){
        console.log("Error disconnecting!");        
      }
    );
    if(this.twitchChat.chatConnected){
      this.disconnectChat();          
    }
    if(this.eventsExternal.connected){
      this.eventsExternal.disconnectClient();      
    }
  }
  @action disconnectChat(){
    this.twitchChat.disconnectChat().then(
      function(){
        if(!this.twitchChat.sameClient){
          console.log("Chat client disconnected!");
        }
      }.bind(this), 
      function(){
        console.log("Error disconnecting!");        
      }.bind(this)
    );
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
    if(this.eventsExternal.connected){
      this.eventsExternal.disconnectClient();      
    }
  }
  
  @action finishStream(){
    if(this.args.stream.finished != true){
      if(this.args.stream.savechat){
        this.args.stream.chatlog = this.twitchChat.messages;        
      }
      this.args.stream.songqueue = this.twitchChat.songqueue;
      
      if(this.eventsExternal.connected){
        this.args.stream.eventlog = this.eventsExternal.events;
      } else {
        this.args.stream.eventlog = this.twitchChat.events;
      }
      
      if(this.twitchChat.botConnected === true || this.twitchChat.chatConnected === true || this.eventsExternal.connected){
       this.disconnectClients();
      }
      
      this.args.stream.finished = true;
      this.args.saveStream();
      this.twitchChat.eventlist = [];    
      this.twitchChat.whisperlist = [];
      this.twitchChat.msglist = [];
      this.twitchChat.songqueue = [];    
      this.currentUser.songqueue = [];
      this.msglist = [];
    }
  }
  
  // This action gets triggered every time the channel receives a 
  // message and updates both the chatlog and the song queue.
  @action msgGetter() {
    this.msglist = this.twitchChat.messages;    
    this.currentUser.songqueue = this.twitchChat.songqueue;
    this.scrollPosition = this.messages.get('length');
    // this.scrollPlayedPosition = this.twitchChat.pendingSongs.get('length');
    // this.scrollPendingPosition = this.twitchChat.playedSongs.get('length');
    this.scrollPlayedPosition = 0;
    this.scrollPendingPosition = 0;
    if(this.currentUser.queueToFile && this.args.stream.requests){
      this.fileContent(this.pendingSongs);
    }
  }

  // This action gets triggered every time the an event gets triggered in the channel
  @action eventGetter() {
    if(this.eventsExternal.connected){
      this.eventlist = this.eventsExternal.events;      
    } else {
      this.eventlist = this.twitchChat.events;      
    }

    this.scrollEventsPosition = 0;
  }

  @tracked overlayHtml = '';  
  get overlayLoader(){

    if(this.overlayHtml === ''){      

      if (ENV.environment === 'development') {
        fs.readTextFile("../dist/queue/queue.html").then(async (data)=>{ 
          this.overlayHtml = await data.toString();
        });
      } else {
        fs.readTextFile("../dist/queue/queue.html").then(async (data)=>{ 
          this.overlayHtml = await data.toString();
        }); 
      }    
    }
    return true;
  } 
  
  @action fileContent(pendingSongs){
    if (this.currentUser.queueToFile && this.globalConfig.config.overlayfolder != '' && pendingSongs.get('length') != undefined && this.args.stream.requests){
      let pathString = this.globalConfig.config.overlayfolder;
      if(pathString.substr(pathString.length - 1) === "\\"){
        pathString = pathString.slice(0, -1)+'\\queue.html';
      } else {
        pathString = pathString+'\\queue.html';
      }      
      var htmlEntries = '';
      pendingSongs.map((pendingsong)=>{          
        htmlEntries = htmlEntries.concat("\n\t\t\t<div class=\"alert-dark border-0 rounded py-0 px-2 my-2 bg-transparent text-white\">");
        htmlEntries = htmlEntries.concat("\n\t\t\t\t<div class=\"alert-heading h4\">"+pendingsong.song+"</div>");
        htmlEntries = htmlEntries.concat("\n\t\t\t\t<div class=\"row\">");
        htmlEntries = htmlEntries.concat("\n\t\t\t\t\t<div class=\"col h6\">"+moment(pendingsong.timestamp).format("YYYY/MM/DD HH:mm:ss")+"</div>");
        htmlEntries = htmlEntries.concat("\n\t\t\t\t\t<div class=\"col-auto h6\">"+pendingsong.user+"</div>");
        htmlEntries = htmlEntries.concat("\n\t\t\t\t</div>");
        htmlEntries = htmlEntries.concat("\n\t\t\t</div>");          
      });
      
      var newHtml = this.overlayHtml.replace(/queuecontent/g, htmlEntries);      
      this.args.overlayGenerator(newHtml, pathString);
    }    
  }
  
  @action sendMessage() {
    if(!this.twitchChat.sameClient){
      this.twitchChat.chatclient.say(this.twitchChat.channel, this.message);
    } else {
      this.twitchChat.botclient.say(this.twitchChat.channel, this.message);
    }
    this.message = "";
  }  

  // Stream saving actions  
  
  @action doneEditing() {
    if(this.args.stream.finished === false){
      if(this.isChatEmpty === false){
        if(this.args.stream.savechat){
          if(this.msglist != this.args.stream.chatlog){
            this.args.stream.chatlog = this.msglist;
          }
        }
      }
      if(this.isQueueEmpty === false){
        if(this.currentUser.songqueue != this.args.stream.songqueue){
          this.args.stream.songqueue = this.currentUser.songqueue;
        }
      }
      if(this.isEventsEmpty === false){
        if(this.eventlist != this.args.stream.eventlog){
          this.args.stream.eventlog = this.eventlist;
        }
      }
      if(this.isEventsExternalEmpty === false){
        if(this.eventsExternal.eventlist != this.args.stream.eventlog){
          this.args.stream.eventlog = this.eventsExternal.eventlist;
        }
      }
    }
    this.args.saveStream();
    this.saving = true;
    later(() => { this.saving = false; }, 500);    
  }  

  @action doneAndReturnEditing() {
    if(this.args.stream.finished === false){
      if(this.isChatEmpty === false){
        if(this.args.stream.savechat){
          if(this.msglist != this.args.stream.chatlog){
            this.args.stream.chatlog = this.msglist;
          }
        }
      }
      if(this.isQueueEmpty === false){
        if(this.currentUser.songqueue != this.args.stream.songqueue){
          this.args.stream.songqueue = this.currentUser.songqueue;
        }
      }
      if(this.isEventsEmpty === false){
        if(this.eventlist != this.args.stream.eventlog){
          this.args.stream.eventlog = this.eventlist;
        }
      } 
      if(this.isEventsExternalEmpty === false){
        if(this.eventsExternal.eventlist != this.args.stream.eventlog){
          this.args.stream.eventlog = this.eventsExternal.eventlist;
        }
      }
    }
    this.args.saveAndReturnStream(); 
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

  @action requestStatus(song) {    
    // We use set in order to make sure the context updates properly.
    if(song.processed === true && this.modifierkey === true){
      // Next line makes the element to get back in the pending list but in the last position:
      set(song, 'timestamp', moment().format());
    }
    set(song, 'processed', !song.processed);
    this.scrollPlayedPosition = 0;
    this.scrollPendingPosition = 0;
    
    if(this.pendingSongs.get('length') != 0){
      this.globalConfig.config.lastPlayed = this.pendingSongs[0].song;
    } else {
      this.globalConfig.config.lastPlayed = '';
    }
    this.globalConfig.config.save();
    
    if(this.currentUser.queueToFile && this.args.stream.requests){
      this.fileContent(this.pendingSongs);
    }
  }
  
  @action backToQueue(song) {    
    // We use set in order to make sure the context updates properly.
    if(song.processed === true){
      // Next line makes the element to get back in the pending list but in the last position:
      set(song, 'timestamp', moment().format());
    }
    set(song, 'processed', !song.processed);
    this.scrollPlayedPosition = 0;
    this.scrollPendingPosition = 0;
    if(this.currentUser.queueToFile && this.args.stream.requests){
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
      set(firstSong, 'processed', true);
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
    if(this.currentUser.queueToFile && this.args.stream.requests){
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
        set(firstSong, 'timestamp', moment().format());
      }
      set(firstSong, 'processed', false);
      this.scrollPlayedPosition = 0;
      this.scrollPendingPosition = 0;
      if(this.pendingSongs.get('length') != 0){
        this.globalConfig.config.lastPlayed = this.pendingSongs[0].song;
      } else {
        this.globalConfig.config.lastPlayed = '';
      }
      this.globalConfig.config.save();
    }
    if(this.currentUser.queueToFile && this.args.stream.requests){
      this.fileContent(this.pendingSongs);
    }
  }
  // Soundboard toggle
  @action soundboardToggle(){
    this.currentUser.soundBoardEnabled = !this.currentUser.soundBoardEnabled;
    if(this.currentUser.soundBoardEnabled === false){
      if(this.twitchChat.lastSoundCommand != null){
        this.twitchChat.lastSoundCommand.stop();
      }
    }
    this.twitchChat.soundBoardEnabled = this.currentUser.soundBoardEnabled;    
  }
  
  
  // Pannels interaction
  
  @action togglePan(pannel){
    if (pannel === "pending"){
      this.globalConfig.config.cpanpending = !this.globalConfig.config.cpanpending;
    }
    if (pannel === "played"){
      this.globalConfig.config.cpanplayed = !this.globalConfig.config.cpanplayed;
    } 
    if (pannel === "messages"){
      this.globalConfig.config.cpanmessages = !this.globalConfig.config.cpanmessages;
    }
    if (pannel === "events"){
      this.globalConfig.config.cpanevents = !this.globalConfig.config.cpanevents;
    }   
    this.globalConfig.config.save();
  }

  @action toggleExtraPanRight() {
    this.globalConfig.config.extraPanRight = !this.globalConfig.config.extraPanRight;
    if(this.globalConfig.config.extraPanRight){
      this.globalConfig.config.extraPanRightTop = true;
      this.globalConfig.config.extraPanRightBottom = true;
    }
    this.globalConfig.config.save();
  }   
  
  @action toggleExtraPanRightTop() {
    this.globalConfig.config.extraPanRightTop = !this.globalConfig.config.extraPanRightTop;   
    this.globalConfig.config.save();
  }  
  
  @action toggleExtraPanRightBottom() {
    this.globalConfig.config.extraPanRightBottom = !this.globalConfig.config.extraPanRightBottom;   
    this.globalConfig.config.save();
  }    

  @action toggleExtraPanLeft() {
    this.globalConfig.config.extraPanLeft = !this.globalConfig.config.extraPanLeft;
    if(this.globalConfig.config.extraPanLeft){
      this.globalConfig.config.extraPanLeftTop = true;
      this.globalConfig.config.extraPanLeftBottom = true;
    }
    this.globalConfig.config.save();
  }
  
  @action toggleExtraPanLeftTop() {
    this.globalConfig.config.extraPanLeftTop = !this.globalConfig.config.extraPanLeftTop;   
    this.globalConfig.config.save();
  }  
  
  @action toggleExtraPanLeftBottom() {
    this.globalConfig.config.extraPanLeftBottom = !this.globalConfig.config.extraPanLeftBottom; 
    this.globalConfig.config.save();
  }

  @action queueWriter(){
    if(this.args.stream.requests && this.globalConfig.config.overlayfolder != ''){
      this.currentUser.queueToFile = !this.currentUser.queueToFile;      
    } else {
      this.currentUser.queueToFile = false;
    }
  }
  
}
