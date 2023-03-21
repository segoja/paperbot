import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

export default class PbClientComponent extends Component {
  @service globalConfig;
  @service youtubeChat;
  
  @tracked saving = false;

  clientTypes = Object.freeze(['twitch', 'youtube', 'discord']);

  @action doneEditing() {
    this.args.saveClient();
    this.saving = true;
    later(() => {
      this.saving = false;
    }, 500);
  }

  @tracked isMasked = true;

  @action toggleMask() {
    this.isMasked = !this.isMasked;
  }
  
  
  @action connectYoutube(){
    //if(this.args.client.oauth && this.args.client.channel){
    //  this.youtubeChat.connectToChat(this.args.client.channel, this.args.client.oauth);
    //}
    this.youtubeChat.subscribe(this.args.client.channel);
  }
  
  @action disconnectYoutube(){  
    this.youtubeChat.disconnectFromChat();
  }
}
