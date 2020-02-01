import Component from '@ember/component';
import { action } from '@ember/object';

export default class BlogPostEditComponent extends Component {
  @action edit() {
    this.isEditing = true;
  }
  @action doneEditing() {
    this.isEditing = false;
    this.saveAction();
  }
  @action deletePost() {
    this.deleteAction();
  }
}
