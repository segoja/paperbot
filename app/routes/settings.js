import Route from '@ember/routing/route';
import { hash } from 'rsvp';

export default class SettingsRoute extends Route {
  model () {
    var store = this.store;
    return hash({
      model: store.findAll('config'),
      clients: store.findAll('client')     
    });
  }

  setupController (controller, models) {
    super.setupController(controller, models);
    controller.setProperties(models);
  }
  
  afterModel(){
    this.controllerFor('settings').isViewing = false;
  }
  
  redirect (model, transition) {
    if (transition.targetName === 'settings.index') {
      if (model.model.get('length') !== 0) {
        // this.transitionTo('settings.config', model.filterBy('default', true).get('firstObject'));
        this.controllerFor('settings').isViewing = false;
        this.transitionTo('settings.config', model.model.get('firstObject'));
      } else {
        this.transitionTo('settings.config', this.store.createRecord('config', {id: 'myconfig', name: "Default settings"}));
      }
    }
  }
}
