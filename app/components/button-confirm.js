import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class PbSongComponent extends Component {
  @service globalConfig;
  @tracked isViewing = false;

  constructor() {
    super(...arguments);
    this.isViewing = false;
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.isViewing = false;
  }

  @action toggleModal() {
    this.isViewing = !this.isViewing;
  }

  @action confirmModal() {
    this.isViewing = !this.isViewing;
    if (!this.isViewing && this.args.targetAction) {
      this.args.targetAction();
    }
  }
}
