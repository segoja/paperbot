import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

export default class PbOverlayComponent extends Component {
  @service globalConfig;

  @tracked saving = false;

  @action doneEditing() {
    this.args.saveOverlay();
    this.saving = true;
    later(() => {
      this.saving = false;
    }, 500);
  }
}
