import Component from '@ember/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class BlogAuthorEditComponent extends Component {
  @tracked isEditing;

  @action edit() {
    this.isEditing = true;
  }
  @action doneEditing() {
    this.isEditing = false;
    this.saveAction();
  }
  @action deleteAuthor() {
    this.deleteAction();
  }
}
