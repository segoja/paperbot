import Controller, { inject }  from '@ember/controller';
import { inject as service } from '@ember/service';

export default Controller.extend({
  posts: inject(),
  router: service(),

  actions: {
    savePost: function() {
      this.model.save();
    },

    deletePost: function() {
      this.model.destroyRecord().then(function() {
        this.router.transitionTo('posts');
      }.bind(this));
    }
  }
});
