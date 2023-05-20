import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { sort } from '@ember/object/computed';

export default class PbStreamEditPendingComponent extends Component {
  @service globalConfig;
  @service currentUser;
  @service queueHandler;
  @service store;

  constructor(){
    super(...arguments);
    this.activeTab = 'pending';
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.activeTab = 'pending';
  }
    
  tabList = ['pending', 'played'];
  
  @tracked activeTab = 'pending';

  queueAscSorting = Object.freeze(['processed:desc','position:asc', 'timestamp:desc']);
  @sort('queueHandler.songqueue', 'queueAscSorting') arrangedAscQueue;

  get setlistSongs() {
    if(this.currentUser.showPlayed){
      return this.arrangedAscQueue;
    }
    return this.arrangedAscQueue.filter((request) => !request.processed);
  }

  get isRelative(){
    let result = false;
    if(this.args.isStream){
      result = true;
    } else {
      result = this.args.toTop || false;
    }
    console.log('Is relative? '+result);
    return result;
  }

  get scrollPendingPosition() {
    this.queueHandler.lastsongrequest;
    if (this.queueHandler.lastsongrequest) {
      return this.queueHandler.lastsongrequest.position || 0;
    }
    return 0;
  }
  
  get scrollPlayedPosition() {
    return this.playedSongs.length;
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

  @tracked showPlayed = false;

  @action tabSwitch(tab){
    console.log(tab);
    if(tab){
      this.activeTab = tab;
    }
    console.log(this.activeTab);
  }

  @action togglePlayed() {
    this.currentUser.showPlayed = !this.currentUser.showPlayed;
  }

  @action reorderItems(originalList, sortedList) {
    let count = 0;
    sortedList.forEach((item) => {
      // We do this to prevent saving records that remain the same
      if (item.position != count) {
        item.position = count;
        item.save().then(() => {
          console.debug(item.position+'. '+item.title);
        });
      } else {
        console.debug(
          item.position + '. ' + item.title + ' remained the same.'
        );
      }
      count = Number(count) + 1;
    });
    let playedCount = 0;
    this.queueHandler.playedSongs.forEach((played) => {
      played.position = playedCount;
      played.save().then(() => {
        //console.debug(played.position+'. '+played.title);
      });
      playedCount = Number(playedCount) + 1;
    });
  }
}
