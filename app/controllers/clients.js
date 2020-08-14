import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';
import { all } from 'rsvp';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 20;
  @tracked query = '';
}

export default class ClientController extends Controller {
  @inject ('clients.client') client;
  @service router;

  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'}
  ];
  
  queryParamsObj = new QueryParamsObj();
  
  @tracked isViewing;

  @action createClient() {
    let newclient = this.store.createRecord('client');
    this.client.isEditing = true;
    this.router.transitionTo('clients.client', newclient.save());
  }


  @action importClients(client){
    let newClient = this.store.createRecord('client');
    newClient.set('username',client.username);
    newClient.set('oauth',client.oauth);
    newClient.set('channel',client.channel);
    newClient.set('debug',client.debug);
    newClient.set('reconnect',client.reconnect);
    newClient.set('secure',client.secure);
    
    newClient.save();
  }

  @action gridEditClient(client) {
    this.router.transitionTo('clients.client', client);
  } 


  async unlinkChildren(client){
    
   // collect the children before deletion
    var childrenList = [];
    
    var botclientstreams = await client.botclientstreams;
    botclientstreams.forEach((stream) => {
      childrenList.push(stream);
    });
    
    var chatclientstreams = await client.chatclientstreams;
    chatclientstreams.forEach((stream) => {
      childrenList.push(stream);
    });
      
    var botclientconfigs = await client.botclientconfigs;
    botclientconfigs.forEach((config) => {
      childrenList.push(config);
    });

    var chatclientconfigs = await client.chatclientconfigs;
    chatclientconfigs.forEach((config) => {
      childrenList.push(config);
    });
    
    var processed = all(childrenList);
    return processed;
  }

  @action gridDeleteClient(client) {
    //Wait for children to be destroyed then destroy the client      
    this.unlinkChildren(client).then((children)=>{
      client.destroyRecord().then(() => {
        this.isViewing = false;
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

