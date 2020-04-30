import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";

export default class ActiveClientService extends Service {
  @service store;
  
  @tracked clientlist = this.store.queryRecord('client').then(function(contents) {
  
  }.bind(this));
  
  constructor() {
    super(...arguments); 
    this.clientlist = this.store.findAll('client');
  }
  
  async activeBot(){    
    let botclient = '';
    let optsbot = '';    
    this.clientlist.forEach((client) => { 
      let opts = {
        options: { 
          debug: client.debug, 
        },
        connection: {
          reconnect: client.reconnect,
          secure: client.secure
        },
        identity: {
          username: client.username,
          password: client.oauth
        },
        channels: [client.channel]
      };
      
      if(client.type === 'bot' && client.defaultbot === true){
        optsbot = opts;
      }   
    });
    return optsbot;
  }
  
  async activeChat(){    
    let chatclient = '';
    let optschat = '';    
    this.clientlist.forEach((client) => { 
      let opts = {
        options: { 
          debug: client.debug, 
        },
        connection: {
          reconnect: client.reconnect,
          secure: client.secure
        },
        identity: {
          username: client.username,
          password: client.oauth
        },
        channels: client.channel
      };
      
      if(client.type === 'chat' && client.defaultchat === true){
        optschat = opts;
      }   
    });
    return optschat;
  }   
}
