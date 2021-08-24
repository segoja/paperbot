import Route from '@ember/routing/route';
import { hash } from 'rsvp';
import { inject as service } from '@ember/service';

export default class SongsRoute extends Route {
  @service store;

  model () {
    return this.store.findAll('song');
  }
    
  afterModel(){
    this.controllerFor('songs').isViewing = false;
  }  
}
