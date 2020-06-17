import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class PbClientEditComponent extends Component {
 
  @action doneEditing() {
    this.args.saveClient();
  }
}
