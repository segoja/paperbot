import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';

export default class PbCommandsComponent extends Component {
  commandsSorting = Object.freeze(['date:desc']);
  
  @sort (
    'args.commands',
    'commandsSorting'
  ) arrangedContent;  

  @computedFilterByQuery(
    'arrangedContent',
    ['name','type','cooldown','timer','response','soundfile','volume'],
    'args.queryParamsObj.query',
    { conjunction: 'and', sort: false}
  ) filteredContent;
 
  @pagedArray (
    'filteredContent',
    { page: alias('parent.args.queryParamsObj.page'), perPage: alias('parent.args.queryParamsObj.perPage')}
  ) pagedContent;

  @action resetPage() {
    this.args.queryParamsObj.page = 1;
  }
}
