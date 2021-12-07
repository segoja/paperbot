import Route from '@ember/routing/route';
import { hash } from 'rsvp';
import { inject as service } from '@ember/service';

export default class ReaderRoute extends Route {
  @service store;
  @service currentUser;

  model () {
    return this.store.findAll('song');
  }
    
  afterModel(){
    this.currentUser.isViewing = false;
  }  
}
