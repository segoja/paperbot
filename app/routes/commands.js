import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class CommandsRoute extends Route {
  @service store;
  @service currentUser;

  model() {
    return this.store.findAll('command');
  }
  afterModel() {
    this.currentUser.isViewing = false;
  }
}
