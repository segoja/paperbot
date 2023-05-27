import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class bsOffcanvasComponent extends Component {
  @tracked visible = false;
  @tracked popoverId = '';

  constructor() {
    super(...arguments);
    this.visible = false;

    let elements = document.getElementsByClassName('offcanvas');

    let randomtext = Math.random().toString(36).slice(2, 7);
    this.popoverId =
      'OffC' + String(randomtext) + String((elements.length || 0) + 1);
  }

  willDestroy() {
    super.willDestroy(...arguments);
  }
}
