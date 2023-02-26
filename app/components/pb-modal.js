import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class pbModalComponent extends Component {
  @tracked visible = false;

  constructor() {
    super(...arguments);
    this.visible = false;
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.visible = false;
  }

  get modalWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }

  @action toggleModal() {
    this.visible = !this.visible;
  }
}
