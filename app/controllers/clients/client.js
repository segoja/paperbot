import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';

export default class ClientController extends Controller {
  @inject clients;
  @service router;

  @action closeClient() {
    this.clients.isViewing = false;
    this.router.transitionTo('clients');      
  }
  
  @action editClient(){
  }  

  @action saveAndReturnClient(){
    this.saveClient();
    this.router.transitionTo('clients');
    
  }
  
  @action saveClient () {
    this.model.save();
  }
  
  @action deleteClient() {
    this.model.destroyRecord().then(() => {
      this.clients.isViewing = false;
      this.router.transitionTo('clients');
    });
  }
}
