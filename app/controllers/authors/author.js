import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default Controller.extend({
  router: service(),

  actions: {
    saveAuthor: function() {
      this.model.save();
    },

    deleteAuthor: function() {
      this.model.destroyRecord().then(function() {
        this.router.transitionTo('authors');
      }.bind(this));
    }
  }
});
