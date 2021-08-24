import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class IndexRoute extends Route {
  @service store;

  model () {
    return this.store.findAll('config');      
  }

  afterModel(model) {    
    if (model.get('length') !== 0) {
      // this.transitionTo('settings.config', model.filterBy('default', true).get('firstObject'));
      this.transitionTo('streams.index');
    } else {
      this.transitionTo('settings.config', this.store.createRecord('config', {id: 'myconfig', name: "Default settings", isdefault: true}));
    }
  }
 
}
