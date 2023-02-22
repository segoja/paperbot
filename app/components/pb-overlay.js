import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { getCurrent } from '@tauri-apps/api/window';
import { later } from '@ember/runloop';
import { sort } from '@ember/object/computed';

export default class PbReaderComponent extends Component {
  @service globalConfig;

  constructor() {
    super(...arguments);
  }

  requestSorting = Object.freeze(['position:asc', 'timestamp:desc']);
  @sort('args.requests', 'requestSorting') arrangedContent;

  get pendingRequests() {
    let count = 0;
    return this.arrangedContent.filter((request) => {
      if (
        !request.processed &&
        count < this.globalConfig.config.overlayLength
      ) {
        count = Number(count) + 1;
        return request;
      }
    });
  }
}
