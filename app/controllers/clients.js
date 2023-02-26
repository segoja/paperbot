import Controller, { inject } from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { all } from 'rsvp';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 20;
  @tracked query = '';
}

export default class ClientController extends Controller {
  @inject('clients.client') client;
  @service router;
  @service store;
  @service currentUser;

  queryParams = [
    { 'queryParamsObj.page': 'page' },
    { 'queryParamsObj.perPage': 'perPage' },
    { 'queryParamsObj.query': 'query' },
  ];

  queryParamsObj = new QueryParamsObj();

  @action createClient() {
    let newclient = this.store.createRecord('client');
    newclient.save().then(() => {
      this.client.isEditing = true;
      this.router.transitionTo('clients.client', newclient);
    });
  }

  @action importClients(client) {
    let newClient = this.store.createRecord('client');
    newClient.set('username', client.username);
    newClient.set('oauth', client.oauth);
    newClient.set('channel', client.channel);
    newClient.set('debug', client.debug);
    newClient.set('reconnect', client.reconnect);
    newClient.set('secure', client.secure);

    newClient.save();
  }

  @action gridEditClient(client) {
    this.router.transitionTo('clients.client', client);
  }

  async unlinkChildren(client) {
    // collect the children before deletion
    var childrenList = [];

    await client.botclientstreams.toArray().forEach((stream) => {
      childrenList.push(stream);
    });

    await client.chatclientstreams.toArray().forEach((stream) => {
      childrenList.push(stream);
    });

    await client.botclientconfigs.toArray().forEach((config) => {
      childrenList.push(config);
    });

    await client.chatclientconfigs.toArray().forEach((config) => {
      childrenList.push(config);
    });

    var processed = all(childrenList);
    return processed;
  }

  @action gridDeleteClient(client) {
    //Wait for children to be destroyed then destroy the client
    this.unlinkChildren(client).then((children) => {
      console.debug('Children unlinked?');
      client.destroyRecord().then(() => {
        this.currentUser.isViewing = false;
        var prevchildId = null;
        children.map(async (child) => {
          // We check for duplicated in the child list.
          // Makes no sense to save same model twice without changes (if you do you will get error).
          if (prevchildId != child.id) {
            console.debug('The id of the child: ' + child.id);
            prevchildId = child.id;
            return child.save();
          }
        });
        this.router.transitionTo('clients');
      });
    });
  }
}
