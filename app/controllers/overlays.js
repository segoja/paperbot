import Controller, { inject } from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { all } from 'rsvp';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 20;
  @tracked query = '';
}

export default class OverlaysController extends Controller {
  @inject('overlays.overlay') overlay;
  @service router;
  @service store;
  @service currentUser;

  queryParams = [
    { 'queryParamsObj.page': 'page' },
    { 'queryParamsObj.perPage': 'perPage' },
    { 'queryParamsObj.query': 'query' },
  ];

  queryParamsObj = new QueryParamsObj();

  @action createOverlay() {
    let newoverlay = this.store.createRecord('overlay');
    newoverlay.save().then(() => {
      this.overlay.isEditing = true;
      this.router.transitionTo('overlays.overlay', newoverlay);
    });
  }

  @action importOverlays(overlay) {
    let newOverlay = this.store.createRecord('overlay');
    newOverlay.set('name', overlay.name);

    // Queue overlay parts:
    newOverlay.set('qContainer', overlay.qContainer);
    newOverlay.set('qHeader', overlay.qHeader);
    newOverlay.set('qItems', overlay.qItems);

    // Notifications overlay parts:
    newOverlay.set('nContainer', overlay.nContainer);
    newOverlay.set('nHeader', overlay.nHeader);
    newOverlay.set('nItems', overlay.nItems);

    newOverlay.save();
  }

  @action gridEditOverlay(overlay) {
    this.router.transitionTo('overlays.overlay', overlay);
  }

  async unlinkChildren(overlay) {
    // collect the children before deletion
    var childrenList = [];

    await overlay.configs.slice().forEach((config) => {
      childrenList.push(config);
    });

    var processed = all(childrenList);
    return processed;
  }

  @action gridDeleteOverlay(overlay) {
    this.unlinkChildren(overlay).then((children) => {
      overlay.destroyRecord().then(() => {
        this.currentUser.isViewing = false;
        if (children.length > 0) {
          console.debug('Unlinking chidren...');
          children.map(async (child) => {
            return await child.save();
          });
        }
        this.router.transitionTo('overlays');
      });
    });
  }
}
