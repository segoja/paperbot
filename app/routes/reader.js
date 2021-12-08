import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ReaderRoute extends Route {
  @service store;
  @service currentUser;

  model () {
    return this.store.findAll('song');
  }
    
  afterModel(){
    this.currentUser.isViewing = false;
    this.currentUser.isReader = true;
  }
  
  @action willTransition (transition) {
    if (transition.targetName != 'reader') {
      this.currentUser.isReader = false;
    }
  }
}
