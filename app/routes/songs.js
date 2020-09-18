import Route from '@ember/routing/route';

export default class SongsRoute extends Route {
  model () {
    return this.store.findAll('song');
  }
  afterModel(){
    this.controllerFor('songs').isViewing = false;
  }  
}
