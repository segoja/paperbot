import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class PbStreamEditPlayedComponent extends Component {
  @service globalConfig;
  @service queueHandler;
    
  constructor() {
    super(...arguments);
  }
   
  @action togglePan(){
    this.globalConfig.config.cpanplayed = !this.globalConfig.config.cpanplayed;
    this.globalConfig.config.save();
  }
}
