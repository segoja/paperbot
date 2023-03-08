import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class OverlaysRoute extends Route {
  @service store;
  @service currentUser;

  model() {
    return this.store.findAll('overlay');
  }
  afterModel() {
    this.currentUser.isViewing = false;
  }
}
