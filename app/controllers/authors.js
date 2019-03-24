import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

export default Controller.extend({
  author: inject('authors.author'),
  router: service(),

  page: 1,
  perPage: 5,

  queryParams: ["page", "perPage"],

  actions: {
    createAuthor: function() {
      this.author.set('globals.isEditing', true);
      var newauthor = this.store.createRecord('author');
      this.router.transitionTo('authors.author', newauthor.save());
    }
  }
});
