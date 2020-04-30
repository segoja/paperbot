import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import EmberObject, { action } from "@ember/object";
import { run } from '@ember/runloop';

export default class TwitchChatComponent extends Component {
  @service activeClient;
  @service twitchChat;
  
  @tracked msglist = [];
  @tracked status;
  @tracked inputDisabled;

  constructor() {
    super(...arguments);  
    
    // This line is to allow switching to other routes without losing the active chat history.
    this.msglist = this.twitchChat.messages;
    this.inputDisabled = false;
    if(this.twitchChat.botConnected === false){
      // this.connectTwitch();
      this.inputDisabled = true;
    } else {
      this.twitchChat.client.on('message', this.msgGetter);
    }
  }

  get messages(){
    return this.msglist.slice(-30);
  }
    
  @tracked message = "";
  
  @action connectTwitch(){
    let optsbot = this.activeClient.activeBot;  
    this.twitchChat.connector(optsbot).then(
      success => {
        this.inputDisabled = false;
        this.twitchChat.client.on('message', this.msgGetter);
        this.msgGetter();
      }, 
      error => {
        this.inputDisabled = true;
        console.log("Not connected!");        
      }
    );
  }
  
  @action sendMessage() {
    this.twitchChat.client.say(this.twitchChat.channel, this.message);
    this.message = "";    
  }
  
  @action msgGetter() {
    this.status = true;
    this.msglist = this.twitchChat.messages;    
  }
}
