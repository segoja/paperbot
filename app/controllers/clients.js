import Controller, { inject } from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

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
  @service recordLifecycle;

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

  @action async gridDeleteClient(client) {
    await this.recordLifecycle.deleteClient(client);
    this.currentUser.isViewing = false;
    this.router.transitionTo('clients');
  }
}
