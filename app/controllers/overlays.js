import Controller, { inject } from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

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
  @service recordLifecycle;

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

  @action async gridDeleteOverlay(overlay) {
    await this.recordLifecycle.deleteOverlay(overlay);
    this.currentUser.isViewing = false;
    this.router.transitionTo('overlays');
  }
}
