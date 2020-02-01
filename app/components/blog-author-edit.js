import Component from '@ember/component';
import { action } from '@ember/object';

export default class BlogAuthorEditComponent extends Component {
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
