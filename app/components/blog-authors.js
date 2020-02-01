import Component from '@ember/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';

export default class BlogAuthorsComponent extends Component {
  authorsSorting = Object.freeze(['name']);
  @sort (
    'authors',
    'authorsSorting'
  ) arrangedContent;

  @pagedArray (
    'arrangedContent',
    { page: alias('parent.page'), perPage: alias('parent.perPage')}
  ) pagedContent;

  @action createAuthor() {
    this.createAction();
  }
}
