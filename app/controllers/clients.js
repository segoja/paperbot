import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

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

  @action gridDeleteClient(client) {
    var streambotList = [];
    //get and unlink the client streams
    client.botclientstreams.forEach((stream)=>{
      // We get the streams
      streambotList.push(stream);    
    }).then(()=>{
      // We unlink them all from the model
      client.botclientstreams.removeObjects(streambotList).then(()=>{
        // We save each stream to update the relationship.
        streambotList.forEach((stream)=>{
          stream.save();
        });
      }).then(()=>{
        var streamchatList = [];
        client.chatclientstreams.forEach((stream)=>{
          // We get the streams
          streamchatList.push(stream);    
        }).then(()=>{
          // We unlink them all from the model
          client.chatclientstreams.removeObjects(streamchatList).then(()=>{
            // We save each stream to update the relationship.
            streamchatList.forEach((stream)=>{
              stream.save();
            });
          }).then(()=>{
            var configdefbotList = [];
            client.botclientconfigs.forEach((config)=>{
              // We get the configs
              configdefbotList.push(config);    
            }).then(()=>{
              // We unlink them all from the model
              client.botclientconfigs.removeObjects(configdefbotList).then(()=>{
                // We save each config to update the relationship.
                configdefbotList.forEach((config)=>{
                  config.save();
                });
              }).then(()=>{
                var configdefchatList = [];
                client.chatclientconfigs.forEach((config)=>{
                  // We get the configs
                  configdefchatList.push(config);    
                }).then(()=>{
                  // We unlink them all from the model
                  client.chatclientconfigs.removeObjects(configdefchatList).then(()=>{
                    // We save each config to update the relationship.
                    configdefchatList.forEach((config)=>{
                      config.save();
                    });
                  }).then(()=>{
                    this.isViewing = false;
                    client.destroyRecord().then(() => {
                      this.router.transitionTo('clients');
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  } 
}

