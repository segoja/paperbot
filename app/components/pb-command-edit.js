import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { run } from '@ember/runloop';

export default class PbCommandEditComponent extends Component {
  @tracked isEditing;
  
  commandTypes = ['','param','audio'];
  
  @action edit(){
    this.isEditing = true;
  }
  
  @action doneEditing() {
    this.isEditing = false;
    this.args.saveCommand();
  }  
}
