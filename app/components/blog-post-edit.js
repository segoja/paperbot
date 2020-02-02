import Component from '@ember/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class BlogPostEditComponent extends Component {
  @tracked isEditing;

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
