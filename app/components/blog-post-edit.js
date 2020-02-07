import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class BlogPostEditComponent extends Component {
  @tracked isEditing;

  @action edit() {
    this.isEditing = true;
  }
  @action doneEditing() {
    this.isEditing = false;
    this.args.saveAction();
  }
  @action deletePost() {
    this.args.deleteAction();
  }
}
