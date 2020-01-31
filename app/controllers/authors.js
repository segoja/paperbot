import Controller from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

export default class AuthorController extends Controller {
  @inject ('authors.author') author;
  @service router;

  page = 1;
  perPage = 5;

  queryParams = ["page", "perPage"];

  @action createAuthor() {
    this.author.set('globals.isEditing', true);
    let newauthor = this.store.createRecord('author');
    this.router.transitionTo('authors.author', newauthor.save());
  }
}
