import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { empty, sort } from '@ember/object/computed';

export default class PbStreamEditComponent extends Component {
  @service activeClient;
  @service twitchChat;
  
  @empty ('twitchChat.messages') isChatEmpty;
  @empty ('twitchChat.queue') isQueueEmpty;

  @tracked optsbot = this.args.stream.botclient.get('optsgetter');
  @tracked optschat = this.args.stream.chatclient.get('optsgetter');
  @tracked scrollPosition = 0;
  
  @tracked isEditing = true;
  @tracked message = "";
  @tracked msglist = [];  
  @tracked songqueue = []; 
  
  
  queueSorting = Object.freeze(['timestamp:asc']);
  @sort (
    'songqueue',
    'queueSorting'
  ) arrangedQueue;
  
  
  get disableBotButton(){
    if(this.twitchChat.botConnected === true || this.args.stream.finished === true){
      return true;
    } else {
      return false;
    }
  }
  
  get disableChatButton(){
    if(this.twitchChat.chatConnected === true || this.args.stream.finished === true){
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
  
  get inputDisabled(){
    if(this.twitchChat.chatConnected === false){
      return true;
    } else {
      return false;
    }  
  }
  
  get messages(){
    return this.msglist.slice(-30);
  }   
  
  get pendingSongs() {
    return this.arrangedQueue.filterBy('processed', false);
  }
  
  get playedSongs() {
    return this.arrangedQueue.filterBy('processed', true);
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
      this.optsbot.channels = [this.args.stream.channel];
    }    
    
    this.twitchChat.connector(this.optsbot, "bot").then(
      success => {
        //this.inputDisabled = false;
        this.twitchChat.botclient.on('message', this.msgGetter);
        this.msgGetter();
      }, 
      error => {
        //this.inputDisabled = true;
        console.log("Bot not connected!");        
      }
    );
  }
  
  @action connectChat(){
    if(this.args.stream.channel != ''){
      this.optschat.channels = [this.args.stream.channel];
    }
    
    this.twitchChat.connector(this.optschat, "chat").then(
      success => {
        // this.twitchChat.chatclient.on('message', this.msgGetter);
        this.msgGetter();
      }, 
      error => {
        console.log("Chat not connected!");        
      }
    );
  }
  
  @action disconnectClients(){
    this.twitchChat.disconnector().then(
      success => {
        console.log("Bot and Chat clients disconnected!");    
        // 
      }, 
      error => {
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
  }
  
  @action sendMessage() {
    this.twitchChat.chatclient.say(this.twitchChat.channel, this.message);
    this.message = "";
  }  

  // Stream saving actions
  
  @action edit(){
    this.isEditing = true;
  } 
  
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
    this.isEditing = false;
    this.args.saveStream();
  }  
  
  // Song processing related actions
  
  @action requestStatus(song) {
    set(song, 'processed', !song.processed);
  } 
  
}
