import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class pbTooltipComponent extends Component {
  @tracked visible = false;
  @tracked popoverId = '';

  constructor() {
    super(...arguments);
    this.visible = false;

    let elements = document.getElementsByClassName('tooltip-wormhole');

    let randomtext = Math.random().toString(36).slice(2, 7);
    this.popoverId =
      'ttWh' + String(randomtext) + String((elements.length || 0) + 1);
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.visible = false;
  }

  get popoverWormhole() {
    return document.getElementById(this.popoverId);
  }

  @action togglePopover() {
    this.visible = !this.visible;
  }
}
