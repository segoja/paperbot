import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import EmberObject, { action } from "@ember/object";
import { run } from '@ember/runloop';

export default class TwitchChatComponent extends Component {
  @service activeClient;
  @service twitchChat;
  
  @tracked msglist = ['puto'];
  @tracked status; 

  constructor() {
    super(...arguments);  
    //this.twitchChat.channel = this.activeClient.activeBot.channels;
    //this.twitchChat.username = this.activeClient.activeBot.identity.username;
    //this.twitchChat.password = this.activeClient.activeBot.identity.password;

    this.twitchChat.client.on('message', this.msgGetter);
    // This line is to allow switching to other routes without losing the active chat history.
    this.msglist = this.twitchChat.messages;
  }

  get messages(){
    if(this.status){
      run.later('afterRender', () => {
        this.status = false;
        this.msglist = this.twitchChat.messages;
      },0);
    }
    return this.msglist.slice(-20);
  }
    
  @tracked message = "";
  
  @action connectTwitch(){
    this.optsbot = this.activeClient.activeBot;  
    this.twitchChat.connector(this.optsbot);
    this.msgGetter();
  }
  
  @action sendMessage(event) {
    if (event) {
      event.preventDefault();
    } 
    this.twitchChat.client.say(this.twitchChat.channel, this.message);
    this.message = "";
  }
  
  @action msgGetter() {
    this.status = true;
  }
}
