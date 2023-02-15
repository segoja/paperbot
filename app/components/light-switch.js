import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class lightSwitchComponent extends Component {
  @service globalConfig;
  @service lightControl;

  
  @action toggleLight(){
    
  }
}
