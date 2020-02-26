import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 5;
}

export default class AuthorController extends Controller {
  @inject ('authors.author') author;
  @service router;

  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'}
  ];
  queryParamsObj = new QueryParamsObj();

  @action createAuthor() {
    this.author.set('globals.isEditing', true);
    let newauthor = this.store.createRecord('author');
    this.router.transitionTo('authors.author', newauthor.save());
  }
}
