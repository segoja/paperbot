import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class PbStreamsComponent extends Component {
  @service currentUser;

  // take in `streams` from our view
  // and sort it via `streamsSorting`
  // into `arrangedContent`
  constructor() {
    super(...arguments);
    this.sortString = 'date:desc';
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.sortString = 'date:desc';
  }

  @tracked sortString = 'date:desc';
  get streamsSorting(){    
    return Object.freeze(this.sortString.split(','));
  }
  
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
  
  @action clearSearch(){
    this.args.queryParamsObj.query = '';
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
  
  @action sortColumn(attribute){
    let sortData = this.sortString.split(',');
    this.sortString = '';
    if(attribute){
      let newSort = '';
      let exist = sortData.filter(row => row.includes(attribute));
      if(exist.length > 0){
        if(exist.toString().includes(':asc')){
          newSort = attribute+':desc,';
        } else {
          newSort = attribute+':asc,';
        }
      } else {
        newSort = attribute+':asc,';
      }
      if(sortData.length > 0){
        let others = sortData.filter(row => !row.includes(attribute));
        if(others.length > 0){
          newSort += others.join(',');
        }
      }
      this.sortString = newSort.toString();
    }
  }  
}
