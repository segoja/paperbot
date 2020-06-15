import Route from '@ember/routing/route';

export default class ClientsRoute extends Route {
  model () {
    return this.store.findAll('client');
  }
  afterModel(){
    this.controllerFor('clients').isViewing = false;
  }
}
