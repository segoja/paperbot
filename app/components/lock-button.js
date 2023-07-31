import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { later, cancel } from '@ember/runloop';

const DRAG_DELAY_MS = 0; // Adjust the delay as needed
const MAX_CLICK_MOVEMENT = 0; // Adjust the value as needed

export default class PbSongComponent extends Component {
  constructor() {
    super(...arguments);
    // Add a listener for the 'resize' event
    window.addEventListener('resize', this.handleWindowResize);
  }
  willDestroy() {
    super.willDestroy();

    // Clean up the event listener when the component is destroyed
    window.removeEventListener('resize', this.handleWindowResize);
    this.removeEventListeners();
  }
  @tracked wasDragged = false;
  @tracked swipping = false;
  @tracked startX = 0;
  @tracked startY = 0;
  @tracked left = 20;
  @tracked top = window.innerHeight - 100;
  
  @action handleWindowResize() {
    this.clampPosition();
  }
  
  clampPosition() {
    const maxWidth = window.innerWidth - 100;
    const maxHeight = window.innerHeight - 100;
    this.left = Math.max(20, Math.min(this.left, maxWidth));
    this.top = Math.max(0, Math.min(this.top, maxHeight));
  }  
  

  hasExceededClickMovement(event) {
    const deltaX = Math.abs(event.clientX - this.startX - this.left);
    const deltaY = Math.abs(event.clientY - this.startY - this.top);
    return deltaX > MAX_CLICK_MOVEMENT || deltaY > MAX_CLICK_MOVEMENT;
  }  
  
  @action handleClick(event){
    if(!this.swipping && !this.wasDragged){
      this.args.lockFunction()
    }
  }
  
  @action moveBtn(event){
      // Touch surface
    switch (event.type) {
      case 'touchstart':
        if (!this.swipping) {
          event.preventDefault();
          //cancel(this.dragStartTimeoutId);
          this.dragStartTimeoutId = later(()=>{
            this.swipping = true;
            this.wasDragged = false;
            this.startX = event.changedTouches[0].pageX - this.left;
            this.startY = event.changedTouches[0].pageY - this.top;  
          }, DRAG_DELAY_MS);
        }
      break; 
      case 'touchmove':
        if (this.swipping) {
          this.left = event.changedTouches[0].pageX - this.startX;
          this.top = event.changedTouches[0].pageY - this.starty;
          this.swipping = false;
          this.clampPosition();
          this.wasDragged = true;
          if (this.hasExceededClickMovement(event.changedTouches[0])) {
            this.wasDragged = true; 
          }
        }
        break;
      case 'touchend':
        this.swipping = false;
        cancel(this.dragStartTimeoutId);
        if (!this.wasDragged) {
          this.args.lockFunction()
        }
        break;
      case 'mousedown':
        event.preventDefault();
        //cancel(this.dragStartTimeoutId);
        this.dragStartTimeoutId = later(()=>{
          this.swipping = true;
          this.wasDragged = false;
          this.startX = event.clientX - this.left;
          this.startY = event.clientY - this.top;
        }, DRAG_DELAY_MS);
        break;
      case 'mousemove':
        if (this.swipping) {
          this.left = event.clientX - this.startX;
          this.top = event.clientY - this.startY;
          this.clampPosition();
          if (this.hasExceededClickMovement(event)) {
            this.wasDragged = true;
          }
        }
        break;
      case 'mouseup':
        this.swipping = false;
        cancel(this.dragStartTimeoutId);
        break;
      default:
        console.log(event.type+' not wanted!');
    }
      
  }
}
