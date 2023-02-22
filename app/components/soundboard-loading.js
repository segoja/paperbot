import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { uniqBy } from '@ember/object/computed';
import { later } from '@ember/runloop';

export default class SoundboardLoadingComponent extends Component {
  @service twitchChat;
  @service audio;

  constructor() {
    super(...arguments);
    this.showBar = false;
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.showBar = false;
  }

  get progressValue() {
    console.log('Loaded sounds: ' + this.audio.sounds.size);
    return this.audio.sounds.size;
  }

  @uniqBy('twitchChat.audiocommandslist', 'soundfile') uniqueByfile;
  @uniqBy('uniqueByfile', 'name') uniqueSounds;

  get maxValue() {
    return this.uniqueSounds.length;
  }

  get isSoundboardLoading() {
    if (this.progressValue < this.maxValue && this.progressValue > 0) {
      return true;
    } else {
      return false;
    }
  }
}
