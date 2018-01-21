import Component from '@ember/component';
import { get } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';

export default Component.extend({
  authorsSorting: Object.freeze(['name']),
  arrangedContent: sort('authors', 'authorsSorting'),

  pagedContent: pagedArray('arrangedContent', {
    page: alias('parent.page'),
    perPage: alias('parent.perPage')
  }),

  actions: {
    createAuthor: function() {
      get(this, 'createAction')();
    }
  }
});
