import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { uniqBy } from '@ember/object/computed';

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
    console.debug('Loaded sounds: ' + this.audio.sounds.size);
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
