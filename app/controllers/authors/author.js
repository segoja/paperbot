import Controller from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';

export default class AuthorController extends Controller {
  @service router;

  @action saveAuthor() {
    this.model.save();
  }
  @action deleteAuthor() {
    this.model.destroyRecord().then(() => {
      this.router.transitionTo('authors');
    });
  }
}
