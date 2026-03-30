import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { action } from '@ember/object';

export default class PbOffcanvasComponent extends Component {
  @tracked visible = false;
  @tracked offcId = '';

  constructor() {
    super(...arguments);
    this.visible = false;

    let elements = document.getElementsByClassName('offcanvas');

    let randomtext = Math.random().toString(36).slice(2, 7);
    this.offcId =
      'OffC' + String(randomtext) + String((elements.length || 0) + 1);
  }

  willDestroy() {
    super.willDestroy(...arguments);
  }

  get isFloating() {
    console.debug('[PbOffcanvas] Is floating? ' + this.args.isFloating);
    return this.args.containerId && !this.args.isFloating ? false : true;
    // return false;
  }

  @action updateStatus() {
    if (this.args.isVisible) {
      let offcanvas = document.getElementById(this.offcId);
      console.debug('Opening offcanvas...');
      offcanvas?.classList?.add('showing');
      later(() => {
        let oldoffcanvas = document.getElementById(this.offcId);
        oldoffcanvas?.classList?.add('show');
        oldoffcanvas?.classList?.remove('showing');
      }, 300);
    } else {
      let offcanvas = document.getElementById(this.offcId);
      console.debug('Hiding offcanvas...');
      offcanvas?.classList?.add('hiding');
      later(() => {
        let oldoffcanvas = document.getElementById(this.offcId);
        oldoffcanvas?.classList?.remove('hiding');
        oldoffcanvas?.classList?.remove('show');
      }, 300);
    }
  }

  @action updateContainerClass() {
    if (this.args.containerId) {
      let container = document.getElementById(this.args.containerId);
      if (container) {
        console.debug(
          'Updating container class for offcanvas: ' + this.args.containerId,
        );
        container.setAttribute('class', '');
        const classes = this.args.containerClass
          ? this.args.containerClass.split(' ')
          : [];
        classes.forEach((cls) => container.classList.add(cls));
      }
    }
  }
}
