import Route from '@ember/routing/route';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class OverlayRoute extends Route {
  @service store;
  @service currentUser;

  async model(params) {
    return this.store.findRecord('overlay', params.overlay_id);
  }
  beforeModel() {
    this.currentUser.isViewing = true;
  }
  @action willTransition() {
    this.currentUser.isViewing = false;
  }
}
