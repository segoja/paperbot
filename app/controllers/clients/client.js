import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { all } from 'rsvp';

export default class ClientController extends Controller {
  @inject clients;
  @inject streams;
  @service router;
  @service globalConfig;
  @service currentUser;

  @action closeClient() {
    this.currentUser.isViewing = false;
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
  
  get config(){
    return this.globalConfig.get('config');
  }
  
  async unlinkChildren(){
    
   // collect the children before deletion
    var childrenList = [];
    
    var botclientstreams = await this.model.botclientstreams;
    botclientstreams.forEach(async (stream) => {
      childrenList.push(stream);
    });
    
    var chatclientstreams = await this.model.chatclientstreams;
    chatclientstreams.forEach(async (stream) => {
      childrenList.push(stream);
    });
      
    var botclientconfigs = await this.model.botclientconfigs;
    botclientconfigs.forEach(async (config) => {
      childrenList.push(config);
    });

    var chatclientconfigs = await this.model.chatclientconfigs;
    chatclientconfigs.forEach(async (config) => {
      childrenList.push(config);
    });
    
    var processed = all(childrenList);
    return processed;
  }
  
  @action deleteClient() {
    //Wait for children to be destroyed then destroy the client      
    this.unlinkChildren().then((children)=>{
      this.model.destroyRecord().then(() => {
        this.currentUser.isViewing = false;
        var prevchildId = null;
        children.map(async (child)=>{
          // We check for duplicated in the child list.
          // Makes no sense to save same model twice without changes (if you do you will get error).
          if(prevchildId != child.id){
            console.log("The id of the child: "+child.id);
            prevchildId = child.id;
            return await child.save();      
          }          
        });
        this.router.transitionTo('clients');        
      }); 
    });
  }
}
