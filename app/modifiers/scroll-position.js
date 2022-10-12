import Modifier from 'ember-modifier';

export default class ScrollPositionModifier extends Modifier {
  modify(element, [scrollPosition], { position, relative }) {
    
    if(relative) {
      element.scrollTop = position;
    } else {
      element.scrollTop = element.scrollHeight;
    }
  }
}