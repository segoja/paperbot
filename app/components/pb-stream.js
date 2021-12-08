import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';

export default class PbStreamComponent extends Component {
  @service twitchChat;
  @service eventsExternal;
  @service currentUser;

  @tracked restore = true;
  
  @action reloadStream(){
    this.restore = false;
    later(() => { this.restore = true; }, 10);    
  }
}
