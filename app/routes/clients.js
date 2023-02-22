import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ClientsRoute extends Route {
  @service store;
  @service currentUser;

  model() {
    return this.store.findAll('client');
  }
  afterModel() {
    this.currentUser.isViewing = false;
  }
}
