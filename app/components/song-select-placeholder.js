import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SoundboardLoadingComponent extends Component {
  @service queueHandler;

  constructor() {
    super(...arguments);
    this.showBar = false;
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.activeSong = [];
    this.sPremium = false;
    this.isPlaying = false;
  }

  @tracked activeSong = [];
  @tracked isPremium = false;
  @tracked isPlaying = false;

  @tracked donationFormatted = '';

  @action setActiveSong() {
    let requests = this.queueHandler.pendingSongs;
    if (requests.length > 0) {
      let first = requests.find((item) => item !== undefined);
      if (first) {
        this.isPremium = first.isPremium;
        this.isPlaying = first.isPlaying;
        this.donationFormatted = first.donationFormatted || '';
        first.get('song').then((song) => {
          if (song) {
            this.activeSong = song;
            console.debug('First request active...');
          } else {
            this.activeSong = '';
            console.debug(
              'The first pending request in queue has no lyrics available.'
            );
          }
        });
      }
    } else {
      this.activeSong = [];
      console.debug('No requests pending...');
    }
  }
}
