import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class DraggableButtonComponent extends Component {
  @tracked isDragging = false;
  @tracked initialX = 0;
  @tracked initialY = 0;
  @tracked offsetX = 0;
  @tracked offsetY = 0;
  
  constructor() {
    super(...arguments);
  }

  @action handleMouseDown(event) {
    this.isDragging = true;
    this.initialX = event.clientX - this.offsetX;
    this.initialY = event.clientY - this.offsetY;
  }

  @action
  handleMouseMove(event) {
    if (this.isDragging) {
      this.offsetX = event.clientX - this.initialX;
      this.offsetY = event.clientY - this.initialY;
      var btn = document.getElementById("lockbutton");
      btn.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px)`;
    }
  }

  @action
  handleMouseUp() {
    this.isDragging = false;
  }
}