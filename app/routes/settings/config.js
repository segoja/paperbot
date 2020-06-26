import Route from '@ember/routing/route';
import { action } from "@ember/object";

export default class ConfigRoute extends Route {

  model (params) {
    // Using peekRecord the promise is instanctly solved, so we can do checks. wooooooo
    return this.store.findRecord('config', params.config_id);
  }  
  
  beforeModel(){
    this.controllerFor('settings').isViewing = true;
  }
  @action willTransition(){
    this.controllerFor('settings').isViewing = false;
  }
  
}
