import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class PbStreamEditPendingComponent extends Component {
  @service globalConfig;
  @service queueHandler;
    
  constructor() {
    super(...arguments);
  }

  @action togglePan(){
    this.globalConfig.config.cpanpending = !this.globalConfig.config.cpanpending; 
    this.globalConfig.config.save();
  }
}
