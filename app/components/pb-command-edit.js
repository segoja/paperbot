import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class PbCommandEditComponent extends Component {
    
  @action doneEditing() {
    this.args.saveCommand();
  }  
}
