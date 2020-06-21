import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class PbClientComponent extends Component {
  @action doneEditing() {
    this.args.saveClient();
  }
}
