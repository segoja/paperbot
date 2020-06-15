import Route from '@ember/routing/route';

export default class CommandsRoute extends Route {
  model () {
    return this.store.findAll('command');
  }
  afterModel(){
    this.controllerFor('commands').isViewing = false;
  }  
}
