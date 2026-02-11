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
    newClient.set('type', client.type);
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

    childrenList.push(...(await client.botclientstreams));
    childrenList.push(...(await client.chatclientstreams));
    childrenList.push(...(await client.botclientconfigs));
    childrenList.push(...(await client.chatclientconfigs));

    var processed = all(childrenList);
    return processed;
  }

  @action gridDeleteClient(client) {
    //Wait for children to be destroyed then destroy the client
    this.unlinkChildren(client).then((children) => {
      console.debug('Children unlinked?');
      client.destroyRecord().then(async () => {
        console.debug('Client deleted...');
        this.currentUser.isViewing = false;
        const uniqueChildren = [ ...new Map(children.map(child => [child.id, child])).values() ];
        for (let i = 0; i < uniqueChildren.length; i++) {
          await uniqueChildren[i].save();
        }
        this.router.transitionTo('clients');
      });
    });
  }
}
