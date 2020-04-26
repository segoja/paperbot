import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { empty } from '@ember/object/computed';

export default class PostController extends Controller {
  @inject posts;
  @service router;
  @service twitchChat;
  
  @tracked messages = this.twitchChat.messages;
  @empty ('twitchChat.messages') isChatEmpty;


  @action savePost () {
    if(this.isChatEmpty == false){
      if(this.messages != this.model.body){
        this.model.body = this.messages;
      }
    }
    this.model.save();
  }
  @action deletePost() {
    this.model.destroyRecord().then(() => {
      this.router.transitionTo('posts');
    });
  }
}
