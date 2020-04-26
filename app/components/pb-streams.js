import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';


// define the handling of the `templates/components/blog-streams.hbs` view, which is used by `streams.hbs` like so:
// => {{#blog-streams streams=model page=page perPage=perPage query=query createAction="createStream"}}{{outlet}}{{/blog-streams}}
// `streams.hbs` gets its params by defining
// => queryParams: ["page", "perPage", "query"]
// inside its controller located at `controllers/streams.js`
export default class PbStreamsComponent extends Component {
  // take in `streams` from our view
  // and sort it via `streamsSorting`
  // into `arrangedContent`
  
  streamsSorting = Object.freeze(['date:desc']);
  @sort (
    'args.streams',
    'streamsSorting'
  ) arrangedContent;

  // `arrangedContent` is then used by this filter to create `filteredContent`
  @computedFilterByQuery(
    'arrangedContent',
    ['title', 'date', 'channel'],
    'args.queryParamsObj.query',
    { conjunction: 'and', sort: false}
  ) filteredContent;

  // `filteredContent` is then used by this to create the paged array
  // which is used by our view like so
  // => {{#each pagedContent as |stream|}}
  // => {{page-numbers content=pagedContent}}
 
  @pagedArray (
    'filteredContent',
    { page: alias('parent.args.queryParamsObj.page'), perPage: alias('parent.args.queryParamsObj.perPage')}
  ) pagedContent;

  // define the actions, used by our view like so:
  // => <button {{action 'createStream'}}>Create</button>
  @action resetPage() {
    this.args.queryParamsObj.page = 1;
  }
}
