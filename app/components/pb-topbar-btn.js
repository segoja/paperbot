import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class pbTopbarBtnComponent extends Component {
  @tracked visible = false;

  constructor() {
    super(...arguments);
    this.visible = false;
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.visible = false;
  }

  get topbarWormholeSmall() {
    return  document.getElementById('topbar-wormhole-small');    
  }
  
  get topbarWormholeFull() {
    return document.getElementById('topbar-wormhole-full');
  }
  
  get modalWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }

  @action toggleModal() {
    this.visible = !this.visible;
  }
}
