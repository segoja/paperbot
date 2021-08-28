import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class IndexRoute extends Route {
  @service store;
  @service router;
  
  model () {
    return this.store.findAll('config');      
  }

  afterModel(model) {    
    if (model.get('length') !== 0) {
      this.router.transitionTo('streams.index');
    } else {
      this.router.transitionTo('settings.config', this.store.createRecord('config', {id: 'myconfig', name: "Default settings", isdefault: true}));
    }
  }
 
}
