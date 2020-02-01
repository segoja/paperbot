import Component from '@ember/component';
import { action } from '@ember/object';
import { set } from '@ember/object';

export default class BlogPostEditComponent extends Component {
  @action edit() {
    set(this, 'isEditing', true);
  }
  @action doneEditing() {
    set(this, 'isEditing', false);
    this.saveAction();
  }
  @action deletePost() {
    this.deleteAction();
  }
}
