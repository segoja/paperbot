import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 5;
}

export default class ClientController extends Controller {
  @inject ('clients.client') client;
  @service router;

  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'}
  ];
  queryParamsObj = new QueryParamsObj();

  @action createClient() {
    this.client.set('globals.isEditing', true);
    let newclient = this.store.createRecord('client');
    this.router.transitionTo('clients.client', newclient.save());
  }
}