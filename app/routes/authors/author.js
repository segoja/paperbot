import Route from '@ember/routing/route';

export default class AuthorRoute extends Route {
  model (params) {
    return this.store.findRecord('author', params.author_id);
  }
}
