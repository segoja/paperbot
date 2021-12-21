import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class SongsRoute extends Route {
  @service store;
  @service currentUser;

  model () {
    return this.store.findAll('song');
  }
    
  afterModel(){
    this.currentUser.isViewing = false;
  }  
}
