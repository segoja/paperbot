import Route from '@ember/routing/route';
import { hash } from 'rsvp';
import { inject as service } from '@ember/service';

export default class StreamsRoute extends Route {
  @service store;
  @service router;
  model () {
    var store = this.store;
    return hash({
      model: store.findAll('stream'),
      clients: store.findAll('client'),
      commands: store.findAll('command'),
      songs: store.findAll('song'),
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
        this.router.transitionTo('streams.stream', this.controllerFor('streams').lastStream);
      } 
    }
  }
  
}
