import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';
import * as Transposer from 'chord-transposer';

export default class PbLyricsComponent extends Component {
  @service globalConfig;
  
  constructor(){
    super(...arguments);
    this.isEditing = false;
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.isEditing = false;
  }

  @tracked isEditing = false;
  
  @action toggleEdit(){
    this.isEditing = !this.isEditing;
  }
  
  @action resetZoom() {
    this.args.song.zoomLevel = Number(0.85);
  }

  @action autoColumn() {
    this.args.song.columns = 0;
  }

  @action moreColumn() {
    if (this.args.song.columns < 5) {
      this.args.song.columns = Number(this.args.song.columns) + 1;
    }
  }

  @action lessColumn() {
    if (this.args.song.columns > 0) {
      this.args.song.columns = Number(this.args.song.columns) - 1;
    }
  }

  @action upKey() {
    this.transpose(1);
  }

  @action downKey() {
    this.transpose(-1);
  }

  @action transpose(step){    
    if(this.args.song.lyrics){
      let content = String(this.args.song.lyrics);
      content = content.replace(/\)/g, '¶)¶');
      content = content.replace(/\[/g, '¶[¶');
      content = content.replace(/\]/g, '¶]¶');
      content = content.replace(/\{/g, '¶{¶');
      content = content.replace(/\}/g, '¶}¶');
      content = content.replace(/\-/g, '¶-¶');
      content = content.replace(/\,/g, '¶,¶');
      content = content.replace(/\./g, '¶.¶');
      content = content.replace(/\*/g, '¶\*¶');
      content = content.replace(/\+/g, '¶\+¶');
      content = content.replace(/\n/g, '¶\n¶');
      content = content.replace(/\r/g, '¶\r¶');
      content = content.replace(/¶/g, ' ¶ ');
      
      content = Transposer.transpose(content);
      
      if (!isNaN(step)) {        
        content = content.up(step);
        this.args.song.transSteps += step;
        content = String(content);
        content = content.replace(/\s¶\s\s¶\s/g, '');
        content = content.replace(/\s¶\s/g, '');
        content = content.replace(/¶\s/g, '');
        content = content.replace(/\s¶/g, '');
        content = content.replace(/¶/g, '');
        this.args.song.lyrics = content;
      }
    }
  }

  @action addZoom() {
    this.args.song.zoomLevel = Number(this.args.song.zoomLevel) + Number(0.05);
  }

  @action subZoom() {
    this.args.song.zoomLevel = Number(this.args.song.zoomLevel) - Number(0.05);
  }
  
  @action modeSwitch(){
    this.args.song.viewMode = !this.args.song.viewMode;
  }
}
