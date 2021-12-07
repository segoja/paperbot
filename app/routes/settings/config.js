import Route from '@ember/routing/route';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';

export default class ConfigRoute extends Route {
  @service store;
  @service currentUser;
  
  async model (params) {
    // Using peekRecord the promise is instanctly solved, so we can do checks. wooooooo
    return this.store.findRecord('config', params.config_id);
  }  
  
  beforeModel(){
    this.currentUser.isViewing = true;
  }

  @action willTransition (transition) {
    if (transition.targetName === 'settings.index') {
      transition.abort();
    }
  }  
}
