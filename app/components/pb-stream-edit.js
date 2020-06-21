import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { empty, sort } from '@ember/object/computed';

export default class PbStreamEditComponent extends Component {
  @service twitchChat;
  
  @empty ('twitchChat.messages') isChatEmpty;
  @empty ('twitchChat.queue') isQueueEmpty;

  @tracked optsbot = this.args.stream.botclient.get('optsgetter');
  @tracked optschat = this.args.stream.chatclient.get('optsgetter');
  @tracked scrollPosition = 0;
  
  @tracked message = "";
  @tracked msglist = [];  
  @tracked songqueue = [];
  @tracked soundBoardEnabled = true;

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
    return this.arrangedQueue.filterBy('processed', false);
  }
  
  get playedSongs() {
    return this.arrangedQueue.filterBy('processed', true);
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
      this.optsbot.channels = [this.args.stream.channel];
    }
    
    this.twitchChat.audiocommands = this.audiocommandslist;
    
    this.twitchChat.connector(this.optsbot, "bot").then(()=>{
        //this.inputDisabled = false;
        this.twitchChat.botclient.on('message', this.msgGetter);
      }
    );
  }
  
  @action connectChat(){
    if(this.args.stream.channel != ''){
      this.optschat.channels = [this.args.stream.channel];
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
    set(song, 'processed', !song.processed);
  } 
  
  // Soundboard toggle
  @action soundboardToggle(){
    this.soundBoardEnabled = !this.soundBoardEnabled;
    this.twitchChat.soundBoardEnabled = this.soundBoardEnabled;    
  }
}
