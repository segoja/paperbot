import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class ClientController extends Controller {
  @inject clients;
  @service router;

  @tracked isEditing;
  
  constructor() {
    super(...arguments);  
    
    // These lines is to allow switching to other routes
    // without losing the active chat history and song queue.
    this.isViewing = true;
  }
  
  @action saveClient() {
    this.model.save();
  }
  @action deleteClient() {
    this.model.destroyRecord().then(() => {
      this.clients.isViewing = false;
      this.router.transitionTo('clients');
    });
  }
}
