import Route from '@ember/routing/route';
import { hash } from 'rsvp';
import { inject as service } from '@ember/service';

export default class StreamsRoute extends Route {
 
  model () {
    var store = this.store;
    return hash({
      model: store.findAll('stream'),
      clients: store.findAll('client'),
    });
  }
  
  beforeModel() {
    this._super(...arguments)
  }
  
  setupController (controller, models) {
    controller.setProperties(models);
  }

  redirect (model, transition) {
    if (transition.targetName === 'streams.index') {
      if (model.model.get('length') !== 0) {
        this.transitionTo('streams.stream', model.model.sortBy('date').reverse().get('firstObject'));
      }
    }
  }
}
