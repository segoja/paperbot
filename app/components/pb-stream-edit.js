import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { empty, sort } from '@ember/object/computed';
import moment from 'moment';
import { later } from '@ember/runloop';
import { fs } from "@tauri-apps/api";

export default class PbStreamEditComponent extends Component {
  @service eventsExternal;
  @service twitchChat;
  @service globalConfig;
  @service audio;
  @service currentUser;
  @service queueHandler;

  @empty ('twitchChat.messages') isChatEmpty;
  @empty ('twitchChat.songqueue') isQueueEmpty;
  @empty ('twitchChat.events') isEventsEmpty;
  @empty ('eventsExternal.events') isEventsExternalEmpty;
  
  @tracked saving = false;
  @tracked optsbot = this.args.stream.botclient.get('optsgetter');
  @tracked scrollPosition = 0;
  @tracked scrollEventsPosition = 0;
  @tracked message = "";
  @tracked eventlist = [];  
  @tracked msglist = [];
    
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
    if(this.twitchChat.botConnected === false || this.args.stream.finished === true || this.args.stream.channel === ''){
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
    
  // Whith this getter we control the queue display while keeping the service updated with the settings.
  get requests(){
    this.twitchChat.takessongrequests = this.args.stream.requests;    
    return this.args.stream.requests;
  }
    
  get embedChatUrl(){
    let hostname = window.location.hostname;
    let channel = this.args.stream.channel;
    let darkmode = '';
    if(this.globalConfig.config.darkmode){
      darkmode = '&darkpopout';
    }
    return 'https://www.twitch.tv/embed/'+channel+'/chat?parent='+hostname+darkmode;
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
    this.queueHandler.songqueue = this.twitchChat.songqueue;
    this.queueHandler.scrollPlayedPosition = this.twitchChat.pendingSongs.get('length');
    this.queueHandler.scrollPendingPosition = this.twitchChat.playedSongs.get('length');
    
    this.twitchChat.commands = this.args.commands.filterBy('active', true);
    this.twitchChat.songs = this.args.songs.filterBy('active', true);
    
    if(this.twitchChat.botConnected === true){
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
      if(this.args.stream.events && this.globalConfig.config.externaleventskey && this.globalConfig.config.externalevents){
        this.eventsExternal.client.on("event", this.eventGetter);
        this.eventsExternal.client.on("event:test", this.eventGetter);
      }
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
    this.twitchChat.botUsername = this.args.stream.botName || '';

    
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
        if(this.args.stream.events && this.globalConfig.config.externaleventskey && this.globalConfig.config.externalevents){
          this.eventsExternal.client.on("event", this.eventGetter);
          this.eventsExternal.client.on("event:test", this.eventGetter);
        }
      }
    );
      // later(() => { console.debug(document.getElementById('actualtwitchchat').contentWindow.document.getElementsByClassName('chat-input')); }, 5000);     
  }

  @action disconnectBot(){
    this.twitchChat.disconnectBot().then(
      function(){
        console.debug("Bot client disconnected!");
        // 
      }, 
      function(){
        console.debug("Error disconnecting!");        
      }
    );
    if(this.eventsExternal.connected){
      this.eventsExternal.disconnectClient();      
    }
  }


  @action disconnectClients(){
    this.twitchChat.disconnector().then(
      function(){
        console.debug("Bot and Chat clients disconnected!");    
        // 
      }, 
      function(){
        console.debug("Error disconnecting!");        
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
      
      if(this.twitchChat.botConnected === true || this.eventsExternal.connected){
       this.disconnectClients();
      }
      
      this.args.stream.finished = true;
      this.args.saveStream();
      this.twitchChat.eventlist = [];    
      this.twitchChat.whisperlist = [];
      this.twitchChat.msglist = [];
      this.twitchChat.songqueue = [];    
      this.queueHandler.songqueue = [];
      this.msglist = [];
    }
  }
  
  // This action gets triggered every time the channel receives a 
  // message and updates both the chatlog and the song queue.
  @action msgGetter() {
    this.msglist = this.twitchChat.messages;    
    this.queueHandler.songqueue = this.twitchChat.songqueue;
    this.scrollPosition = this.messages.get('length');
    this.queueHandler.scrollPlayedPosition = 0;
    this.queueHandler.scrollPendingPosition = 0;
    if(this.currentUser.updateQueueOverlay && this.args.stream.requests){
      this.queueHandler.fileContent(this.queueHandler.pendingSongs);
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

  
  @action sendMessage() {
    this.twitchChat.botclient.say(this.twitchChat.channel, this.message);
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
        if(this.queueHandler.songqueue != this.args.stream.songqueue){
          this.args.stream.songqueue = this.queueHandler.songqueue;
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
        if(this.queueHandler.songqueue != this.args.stream.songqueue){
          this.args.stream.songqueue = this.queueHandler.songqueue;
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

  // Soundboard toggle
  @action soundboardToggle(){
    this.currentUser.soundBoardEnabled = !this.currentUser.soundBoardEnabled;
    if(!this.currentUser.soundBoardEnabled){
      if(this.twitchChat.lastSoundCommand != null && this.twitchChat.lastSoundCommand.isPlaying){
        console.log(this.twitchChat.lastSoundCommand.isPlaying)
        console.log(this.twitchChat.lastSoundCommand);
        this.twitchChat.lastSoundCommand.changeGainTo(0).from('percent');
        this.twitchChat.lastSoundCommand.stop(); 
      }
    } 
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
    if(this.globalConfig.config.overlayType === 'file'){
      if(this.args.stream.requests && this.globalConfig.config.overlayfolder != ''){
        this.currentUser.updateQueueOverlay = !this.currentUser.updateQueueOverlay;
        // this.currentUser.queueToFile = !this.currentUser.queueToFile;
        this.queueHandler.fileContent(this.queueHandler.pendingSongs);
      } else {
        // this.currentUser.queueToFile = false;
        this.currentUser.updateQueueOverlay = false;
      }      
    } else {
      // this.currentUser.queueToFile = false;
      this.currentUser.updateQueueOverlay = !this.currentUser.updateQueueOverlay;
      this.currentUser.toggleOverlay();
    }
  }
  
}
