import Route from '@ember/routing/route';
import { hash } from 'rsvp';
import { action } from '@ember/object';

export default class StreamsRoute extends Route {

  model () {
    var store = this.store;
    return hash({
      model: store.findAll('stream'),
      clients: store.findAll('client'),
    });
  }

  setupController (controller, models) {
    controller.setProperties(models);
  }

  afterModel() {
    if(this.controllerFor('streams').lastStream && this.controllerFor('streams').isViewing){
      this.transitionTo('streams.stream', this.controllerFor('streams').lastStream);
    } else {
      this.controllerFor('streams').isViewing = false;
      this.controllerFor('streams').lastStream = [];    
    }   
  }  
  @action willTransition(transition){
    if(transition.targetName === "streams.index" || transition.targetName === "streams"){
      transition.abort();
    }
  }
}
