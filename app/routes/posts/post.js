import Route from '@ember/routing/route';

export default class PostRoute extends Route {
  model (params) {
    return this.store.findRecord('post', params.post_id);
  }
}
