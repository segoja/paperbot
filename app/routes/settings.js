import Route from '@ember/routing/route';
import { hash } from 'rsvp';
import { inject as service } from '@ember/service';

export default class SettingsRoute extends Route {
  @service store;
  @service router;
  
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
        this.controllerFor('settings').isViewing = false;
        this.router.transitionTo('settings.config', model.model.get('firstObject'));
      } else {
        this.router.transitionTo('settings.config', this.store.createRecord('config', {id: 'myconfig', name: "Default settings", isdefault: true}));
      }
    }
  }
}
