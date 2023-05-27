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

  @tracked activeSong = [];

  @action setActiveSong() {
    let requests = this.queueHandler.pendingSongs;
    if (requests.length > 0) {
      let first = requests.find((item) => item !== undefined);
      if (first) {
        first.get('song').then((song) => {
          if (song) {
            this.activeSong = song;
            console.debug('First request active...');
          } else {
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
