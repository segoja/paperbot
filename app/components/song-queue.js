import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { computed } from "@ember/object";
import { run } from '@ember/runloop';

export default class TwitchChatComponent extends Component {
  @service twitchChat;
  @tracked songqueue = this.twitchChat.queue;

  @computed('songqueue')
  get songs() {
    var data = this.songqueue;
    run.later('afterRender', () => {
      this.songqueue = this.twitchChat.queue;      
    }, 1000);
    return data;    
  }  
}
