import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class TimersRoute extends Route {
  @service store;
  @service currentUser;

  model () {
    return this.store.findAll('timer');
  }
  afterModel(){
    this.currentUser.isViewing = false;
  }
}
