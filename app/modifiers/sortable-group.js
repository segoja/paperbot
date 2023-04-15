import SortableGroup from 'ember-sortable/modifiers/sortable-group';
import { action, computed, set } from '@ember/object';
import { registerDestructor, isDestroyed } from '@ember/destroyable';
import { tracked } from '@glimmer/tracking';

export default class SortableGroupModifier extends SortableGroup {
  /*
  @computed('direction', 'sortedItems')
  get firstItemPosition() {

    let distance = 0;
    let diff = this.sortedItems[0][`${this.direction}`] - this.sortedItems[0].spacing;
    
   // let prevElement = document.getElementById('playedSlSongs');
   // let coords = prevElement.getBoundingClientRect();
    
   // if(this.direction == 'width' || this.direction == 'x'){
   //   distance = coords.x;
   // } else {
   //   distance = coords.bottom;
   // }
   //
    return diff;
  }
  */
  @action update() {
    let sortedItems = this.sortedItems;
    
    // Position of the first element
    let position = this._firstItemPosition;
    // Just in case we haven’t called prepare first.
    if (position === undefined) {
      position = this.firstItemPosition;
    }

    let prevElement = document.getElementById('playedSlSongs');
    
    let prevPos = 0;
    if(prevElement){
      let prevCoords = prevElement.getBoundingClientRect();
      console.log('Played block: ',prevCoords);
      
      if(this.direction == 'width' || this.direction == 'x'){
        prevPos = prevCoords.right;
      } else {
        prevPos = prevCoords.bottom - 28;
      }
      console.log('Ref position: '+prevPos);
    }
    
    position += prevPos;
    
    //if(position == 0 || position === undefined){
    //  let firstElement = document.getElementById(sortedItems[0].element.id);
    //  let coords = firstElement.getBoundingClientRect();
    //  console.log(coords)
    //  position = coords.top;
    //}

    sortedItems.forEach((item) => {
      let dimension;
      let direction = this.direction;

      if (!isDestroyed(item) && !item.isDragging) {
        set(item, direction, position);
      }

      // add additional spacing around active element
      if (item.isBusy) {
        position += item.spacing * 2;
      }

      if (direction === 'x') {
        dimension = 'width';
      }
      if (direction === 'y') {
        dimension = 'height';
      }
      position += item[dimension];
    });
  }
}
