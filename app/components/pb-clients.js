import Component from '@glimmer/component';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';

export default class PbClientsComponent extends Component {
  clientsSorting = Object.freeze(['name']);
  @sort (
    'args.clients',
    'clientsSorting'
  ) arrangedContent;

  @pagedArray (
    'arrangedContent',
    { page: alias('parent.args.queryParamsObj.page'), perPage: alias('parent.args.queryParamsObj.perPage')}
  ) pagedContent;
}
