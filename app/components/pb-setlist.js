import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class PbStreamEditPendingComponent extends Component {
  @service globalConfig;
  @service currentUser;
  @service queueHandler;
  @service store;
  @tracked showPlayed = false;
  @tracked isOffcanvas = false;

  constructor() {
    super(...arguments);
  }

  willDestroy() {
    super.willDestroy(...arguments);
  }

  get isReady() {
    let result = true;
    if (
      this.args.containerId &&
      this.currentUser.showSetlist &&
      !this.isOffcanvas
    ) {
      let elmnt = document.getElementById(this.args.containerId);
      if (!elmnt) {
        console.debug(
          '[PbSetlist] Container element not found for setlist: ',
          this.args.containerId,
        );
        result = false;
      }
    }
    console.debug('[PbSetlist] Is setlist ready? ' + result);
    return result;
  }

  get isFloating() {
    return this.isOffcanvas;
  }

  get isRelative() {
    let result = false;
    if (this.args.isStream) {
      result = true;
    } else {
      result = this.args.toTop || false;
    }
    // console.log('Is relative? '+result);
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
    return this.queueHandler.playedSongs;
  }

  get total() {
    let result =
      Number(this.playedSongs.length) +
      Number(this.queueHandler.pendingSongs.length);
    return result;
  }

  dynamicWidth() {
    let elmnt = document.getElementById('bodycontainer');
    let width = 0;
    if (elmnt) {
      width = Number(elmnt.offsetWidth) || 0;
    }
    return width;
  }

  @action updateDisplayType() {
    const width = this.dynamicWidth();
    console.debug('[PbSetlist] Checking display type with width: ' + width);
    // 576px is the breakpoint in Bootstrap, we use that as the threshold for switching to offcanvas
    this.isOffcanvas = width < 576 ?? false;
    console.debug(
      '[PbSetlist] Updated display type. Is floating? ' + this.isOffcanvas,
      this.isReady,
    );
  }

  @action closeSetlist() {
    if (this.args.isFloating) {
      this.currentUser.showSetlist = false;
    }
  }

  @action tabSwitch(tab) {
    // console.log(tab);
    if (tab) {
      this.queueHandler.activeTab = tab;
    }
    // console.log(this.queueHandler.activeTab);
  }

  @action togglePremium() {
    this.globalConfig.config.premiumRequests =
      !this.globalConfig.config.premiumRequests;
    this.globalConfig.config.save();
  }

  @action toggleSorting() {
    this.globalConfig.config.premiumSorting =
      !this.globalConfig.config.premiumSorting;
    this.globalConfig.config.save();
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
          // console.debug(item.position + '. ' + item.title);
        });
      } else {
        /*console.debug(
          item.position + '. ' + item.title + ' remained the same.',
        );*/
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
