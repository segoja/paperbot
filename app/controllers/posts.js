import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

export default Controller.extend({
  post: inject('posts.post'),
  router: service(),

  page: 1,
  perPage: 5,
  query: '',

  queryParams: ["page", "perPage", "query"],

  actions: {
    createPost: function() {
      this.post.set('globals.isEditing', true);
      var newPost = this.store.createRecord('post');
      newPost.set('date' , new Date());
      this.router.transitionTo('posts.post', newPost.save());
    }
  }
});
