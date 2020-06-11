import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class PbClientEditComponent extends Component {
  @tracked isEditing;
  
  @tracked types = ['','bot','chat'];

  @action edit() {
    this.isEditing = true;
  }
  @action doneEditing() {
    this.isEditing = false;
    this.args.saveClient();
  }
}
