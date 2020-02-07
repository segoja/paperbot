import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class BlogAuthorEditComponent extends Component {
  @tracked isEditing;

  @action edit() {
    this.isEditing = true;
  }
  @action doneEditing() {
    this.isEditing = false;
    this.args.saveAction();
  }
  @action deleteAuthor() {
    this.args.deleteAction();
  }
}
