import Route from '@ember/routing/route';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';

export default class ClientRoute extends Route {
  @service store;
  @service currentUser;
  
  async model (params) {
    return this.store.findRecord('client', params.client_id);
  }
  beforeModel(){
    this.currentUser.isViewing = true;
  }
  @action willTransition(){
    this.currentUser.isViewing = false;
  }
}
