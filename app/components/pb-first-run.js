import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class PbSongComponent extends Component {
  @service globalConfig;

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
