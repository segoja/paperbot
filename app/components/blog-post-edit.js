import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { run } from '@ember/runloop';

export default class BlogPostEditComponent extends Component {
  @service twitchChat;
  
  @tracked isEditing;
  
  @action edit(){
    this.isEditing = true;
  }
  
  @action doneEditing() {
    this.isEditing = false;
    this.args.savePost();
  } 
  
  messages() {
    var data = this.twitchChat.messages;
    run.later('afterRender', () => {
      this.args.post.body = data;
    }, 1000);
    return data;    
  }  
}
