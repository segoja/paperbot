import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';

export default class PbClientComponent extends Component { 

  @tracked saving = false;
  
  @action doneEditing() {  
    this.args.saveClient();
    this.saving = true;
    later(() => { this.saving = false; }, 500);    
  }

  @tracked isMasked = true;
  
  @action toggleMask() {
    this.isMasked = !this.isMasked;
  }  
  
}
