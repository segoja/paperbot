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
    this.client.isEditing = true;
    this.isViewing = true;
    let newclient = this.store.createRecord('client');
    this.router.transitionTo('clients.client', newclient.save());
  }
  
  @action closeClient() {
    this.client.isEditing = false;
    this.isViewing = false;
    this.router.transitionTo('clients');      
  }
}
