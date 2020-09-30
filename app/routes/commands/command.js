import Route from '@ember/routing/route';
import { action } from "@ember/object";

export default class CommandRoute extends Route {
  async model (params) {
    return this.store.findRecord('command', params.command_id);
  }
  
  beforeModel(){
    this.controllerFor('commands').isViewing = true;
  }
  
  @action willTransition(){
    this.controllerFor('commands').isViewing = false;
  }
}