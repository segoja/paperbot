import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class PbStreamEditPendingComponent extends Component {
  @service globalConfig;
  @service currentUser;
  @service queueHandler;
  @service store;

  constructor() {
    super(...arguments);
  }

  get scrollPendingPosition() {
    this.queueHandler.lastsongrequest;
    if (this.queueHandler.lastsongrequest) {
      return this.queueHandler.lastsongrequest.position || 0;
    }
    return 0;
  }

  get playedSongs() {
    return this.queueHandler.playedSongs.reverse();
  }

  get total() {
    let result =
      Number(this.playedSongs.length) +
      Number(this.queueHandler.pendingSongs.length);
    return result;
  }

  @action togglePlayed() {
    this.currentUser.showPlayed = !this.currentUser.showPlayed;
  }

  @action async reorderItems(originalList, sortedList) {
    let count = 0;
    sortedList.forEach((item) => {
      item.position = count;
      item.save().then(() => {
        // console.debug(item.position+'. '+item.title);
      });
      count = Number(count) + 1;
    });
    let playedCount = 0;
    this.queueHandler.playedSongs.reverse().forEach((played) => {
      played.position = playedCount;
      played.save().then(() => {
        // console.debug(played.position+'. '+played.title);
      });
      playedCount = Number(playedCount) + 1;
    });
  }
}
