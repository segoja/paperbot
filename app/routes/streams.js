import Route from '@ember/routing/route';
import { hash } from 'rsvp';

export default class StreamsRoute extends Route {

  model () {
    var store = this.store;
    return hash({
      model: store.findAll('stream'),
      clients: store.findAll('client'),
    });
  }

  setupController (controller, models) {
    super.setupController(controller, models);
    controller.setProperties(models);
    
    this.controllerFor('streams').set('isViewing', false);
  }

  redirect (model, transition) {
    if (transition.targetName === 'streams.index') {
      if (this.controllerFor('streams').lastStream) {
        this.transitionTo('streams.stream', this.controllerFor('streams').lastStream);
      } 
    }
  }
  
}
