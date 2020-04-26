import Route from '@ember/routing/route';

export default class ClientRoute extends Route {
  model (params) {
    return this.store.findRecord('client', params.client_id);
  }
}
