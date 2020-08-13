import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { all   } from 'rsvp';

export default class ClientController extends Controller {
  @inject clients;
  @inject streams;
  @service router;
  @service globalConfig;

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
  
  get config(){
    return this.globalConfig.get('config');
  }
  
  async unlinkChildren(){
    
   //collect the promises for deletion
    var childrenList = [];
    //get and destroy the posts comments
    this.model.botclientstreams.then((streams) => {
      console.log(streams);
      this.model.botclientstreams.removeObjects(streams);
        streams.forEach((stream) => {
          console.log(stream.date);
          stream.botclient = '';
          stream.save().then((savedstream)=> {
            console.log(savedstream.date);
            childrenList.push(savedstream);
          });
        });        
    }).then(()=>{
      this.model.chatclientstreams.then((streams) => {
      console.log(streams);
      this.model.chatclientstreams.removeObjects(streams);
        streams.forEach((stream) => {
          console.log(stream.date);
          stream.chatclient = '';
          stream.save().then((savedstream)=> {
            console.log(savedstream.date);
            childrenList.push(savedstream);
          });
        });
      }).then(()=>{
        this.model.botclientconfigs.then((configs) => {
          console.log(configs);
          this.model.botclientconfigs.removeObjects(configs);
          configs.forEach((config) => {
            console.log(config.name);
            config.defbotclient =  '';
            config.save().then((savedconfig)=> {
              console.log(savedconfig.name);
              childrenList.push(savedconfig);
            });
          });
        });        
      }).then(()=>{
        this.model.chatclientconfigs.then((configs) => {
          console.log(configs);
          this.model.chatclientconfigs.removeObjects(configs);
          configs.forEach((config) => {
            console.log(config.name);
            config.defchatclient = '';
            config.save().then((savedconfig)=> {
              console.log(savedconfig.name);
              childrenList.push(savedconfig);
            });
          });
        });        
      }).then(()=>{
        console.log(all(childrenList));
        return all(childrenList);        
      });
    });
  }
  
  @action deleteClient() {
    //Wait for children to be destroyed then destroy the client
    this.unlinkChildren().then(() => {
      this.clients.isViewing = false;
      this.model.destroyRecord().then(() => {
        this.router.transitionTo('clients');
      });
    });
  }
}
