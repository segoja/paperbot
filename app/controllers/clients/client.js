import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class ClientController extends Controller {
  @inject clients;
  @service router;

  @tracked isEditing;
  @tracked clientTypes = ['','bot','chat'];

  @action closeClient() {
    this.isEditing = false;
    this.clients.isViewing = false;
    this.router.transitionTo('clients');      
  }
  
  @action editClient(){
    this.isEditing = true;
  }  
  
  @action saveClient () {
    this.isEditing = false;
    this.model.save();
  }
  
  @action deleteClient() {
    this.model.destroyRecord().then(() => {
      this.clients.isViewing = false;
      this.isEditing =  false;
      this.router.transitionTo('clients');
    });
  }
}
