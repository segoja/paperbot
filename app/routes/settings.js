import Route from '@ember/routing/route';

export default class SettingsRoute extends Route {

  model () {
    return this.store.findAll('config');      
  }
  
  afterModel(){
    this.controllerFor('settings').isViewing = false;
  }
  
  redirect (model, transition) {
    if (transition.targetName === 'settings.index') {
      if (model.get('length') !== 0) {
        // this.transitionTo('settings.config', model.filterBy('default', true).get('firstObject'));
        this.controllerFor('settings').isViewing = false;
        this.transitionTo('settings.config', model.get('firstObject'));
      } else {
        this.transitionTo('settings.config', this.store.createRecord('config', {id: 'myconfig'}));
      }
    }
  }
}
