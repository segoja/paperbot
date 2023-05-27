import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class PbSongComponent extends Component {
  @service globalConfig;
  
  @tracked version = '';

  constructor() {
    super(...arguments);
    
    this.version = this.globalConfig.appVersion();
  }

  get currentVersion(){
    return this.version;
  }

  willDestroy() {
    super.willDestroy(...arguments);
  }

  get bootstrapWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }

  @action toggleModal() {
    this.globalConfig.showFirstRun = !this.globalConfig.showFirstRun;
  }
}
