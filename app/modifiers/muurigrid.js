import Modifier from 'ember-modifier';
import Muuri from 'muuri';
import 'web-animations-js';

export default class MuurigridModifier extends Modifier {

  mygrid = '';

  get isGrid() {
    return this.args.named.mgrid
  }

  didReceiveArguments() {
    if(this.isGrid) {
      this.mygrid = new Muuri('.grid', {
        items: '.item',
        dragEnabled: true,
        layout: { horizontal: true }
      });
    } 
  }
}