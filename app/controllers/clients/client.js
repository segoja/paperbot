import Controller from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';

export default class ClientController extends Controller {
  @service router;

  @action saveClient() {
    this.model.save();
  }
  @action deleteClient() {
    this.model.destroyRecord().then(() => {
      this.router.transitionTo('clients');
    });
  }
}
