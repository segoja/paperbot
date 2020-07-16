import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class PbClientEditComponent extends Component {
 
  @action doneEditing() {
    this.args.saveClient();
  }
  
  @tracked isMasked = true;
  
  @action toggleMask() {
    this.isMasked = !this.isMasked;
  }  
}
