import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';

export default class BlogAuthorsComponent extends Component {
  authorsSorting = Object.freeze(['name']);
  @sort (
    'args.authors',
    'authorsSorting'
  ) arrangedContent;

  @pagedArray (
    'arrangedContent',
    { page: alias('parent.args.queryParamsObj.page'), perPage: alias('parent.args.queryParamsObj.perPage')}
  ) pagedContent;

  @action createAuthor() {
    this.args.createAction();
  }
}
