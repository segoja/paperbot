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
}
