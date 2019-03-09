import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default Controller.extend({
  router: service(),

  actions: {
    saveAuthor: function() {
      this.get('model').save();
    },

    deleteAuthor: function() {
      this.get('model').destroyRecord().then(function() {
        this.get('router').transitionTo('authors');
      }.bind(this));
    }
  }
});
