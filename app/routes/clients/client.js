import Route from '@ember/routing/route';
import { action } from "@ember/object";

export default class ClientRoute extends Route {
  async model (params) {
    return this.store.findRecord('client', params.client_id);
  }
  beforeModel(){
    this.controllerFor('clients').isViewing = true;
  }
  @action willTransition(){
    this.controllerFor('clients').isViewing = false;
  }
}
