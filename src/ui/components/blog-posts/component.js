import Component from '@ember/component';
import { set } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';

// define the handling of the `templates/components/blog-posts.hbs` view, which is used by `posts.hbs` like so:
// => {{#blog-posts posts=model page=page perPage=perPage query=query createAction="createPost"}}{{outlet}}{{/blog-posts}}
// `posts.hbs` gets its params by defining
// => queryParams: ["page", "perPage", "query"]
// inside its controller located at `controllers/posts.js`
export default Component.extend({
  // take in `posts` from our view
  // and sort it via `postsSorting`
  // into `arrangedContent`
  postsSorting: Object.freeze(['date:desc']),
  arrangedContent: sort('posts', 'postsSorting'),

  // `arrangedContent` is then used by this filter to create `filteredContent`
  filteredContent: computedFilterByQuery(
    'arrangedContent',
    ['title', 'body', 'authorName', 'excerpt'],
    'query',
    { conjunction: 'and', sort: false}
  ),

  // `filteredContent` is then used by this to create the paged array
  // which is used by our view like so
  // => {{#each pagedContent as |post|}}
  // => {{page-numbers content=pagedContent}}
  pagedContent: pagedArray('filteredContent', {
    page: alias('parent.page'),
    perPage: alias('parent.perPage')
  }),

  // define the actions, used by our view like so:
  // => <button {{action 'createPost'}}>Create</button>
  actions: {
    resetPage: function() {
      set(this, 'page', 1);
    },
    createPost: function() {
      this.createAction();
    }
  }
});
