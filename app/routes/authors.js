import Route from '@ember/routing/route';
import { hash } from 'rsvp';

export default Route.extend({
  model: function() {
    var store = this.store;
    return hash({
      model: store.findAll('author'),
      posts: store.findAll('post')
    });
  },

  setupController: function(controller, models) {
    controller.setProperties(models);
  },

  actions: {
    createAuthor: function() {
      this.controllerFor('author').set('globals.isEditing', true);
      var newauthor = this.store.createRecord('author');
      this.transitionTo('author', newauthor.save());
    },

    saveAuthor: function() {
      this.modelFor('author').save();
    },

    deleteAuthor: function() {
      this.modelFor('author').destroyRecord().then(function() {
        this.transitionTo('authors');
      }.bind(this));
    }
  }

});
