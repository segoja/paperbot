import Modifier from 'ember-modifier';

export default class ScrollPositionModifier extends Modifier {
  modify(element, [scrollPosition], { position, relative }) {
    if (relative && !scrollPosition) {
      // console.log('Positioning at: '+position);
      element.scrollTop = position;
    } else {
      element.scrollTop = element.scrollHeight;
    }
  }
}
