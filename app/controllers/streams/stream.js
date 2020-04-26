import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { empty } from '@ember/object/computed';

export default class StreamController extends Controller {
  @inject streams;
  @service router;
  
  @service twitchChat;
  
  @tracked isEditing = false;
  
  @tracked messages = this.twitchChat.messages;
  @empty ('twitchChat.messages') isChatEmpty;


  @action saveStream () {
    /*if(this.isChatEmpty == false){
      if(this.messages != this.model.chatlog){
        this.model.chatlog = this.messages;
      }
    }*/
    this.model.save();
  }
  @action deleteStream() {
    this.model.destroyRecord().then(() => {
      this.router.transitionTo('streams');
    });
  }
}
