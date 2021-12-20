import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';

export default class PbSongComponent extends Component {
  @service globalConfig;
  
  @action toggleModal(paramFunc) {
    if(paramFunc){
      paramFunc();
      later(() => {
        this.globalConfig.showFirstRun = false;    
      }, 1000);
    } else {
      this.globalConfig.showFirstRun = false;
    }
  }
}
