import Route from '@ember/routing/route';
import { hash } from 'rsvp';

export default class PostsRoute extends Route {
  model () {
    var store = this.store;
    return hash({
      model: store.findAll('post'),
      authors: store.findAll('author')
    });
  }

  setupController (controller, models) {
    controller.setProperties(models);
  }

  redirect (model, transition) {
    if (transition.targetName === 'posts.index') {
      if (model.model.get('length') !== 0) {
        this.transitionTo('posts.post', model.model.sortBy('date').reverse().get('firstObject'));
      }
    }
  }
}
