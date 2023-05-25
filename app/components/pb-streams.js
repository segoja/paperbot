import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { inject as service } from '@ember/service';

export default class PbStreamsComponent extends Component {
  @service currentUser;

  // take in `streams` from our view
  // and sort it via `streamsSorting`
  // into `arrangedContent`

  streamsSorting = Object.freeze(['date:desc']);
  @sort('args.streams', 'streamsSorting') arrangedContent;

  // `arrangedContent` is then used by this filter to create `filteredContent`
  @computedFilterByQuery(
    'arrangedContent',
    ['title', 'date', 'channel'],
    'args.queryParamsObj.query',
    { conjunction: 'and', sort: false }
  )
  filteredContent;

  // `filteredContent` is then used by this to create the paged array
  // which is used by our view like so
  // => {{#each pagedContent as |stream|}}
  // => {{page-numbers content=pagedContent}}

  @pagedArray('filteredContent', {
    page: alias('parent.args.queryParamsObj.page'),
    perPage: alias('parent.args.queryParamsObj.perPage'),
  })
  pagedContent;

  // define the actions, used by our view like so:
  // => <button {{action 'createStream'}}>Create</button>
  @action resetPage() {
    this.args.queryParamsObj.page = 1;
  }
  
  get dynamicHeight(){
    let elmnt = document.getElementById('bodycontainer');
    let height = 0;
    if(elmnt){
      height = Number(elmnt.offsetHeight) || 0;
    }
    return height;
  }
  
  @action updateRowNr(){
    if(this.dynamicHeight){
      let height = this.dynamicHeight;
      let rows = Math.floor(height / 43);
      if(!isNaN(rows) && rows > 1){
        this.args.queryParamsObj.perPage = rows -1;
        this.args.queryParamsObj.page = 1;
      }
    }
  }  
}
