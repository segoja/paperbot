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
    this.args.song.readerZoom = Number(0.85);
  }

  @action autoColumn() {
    this.args.song.readerColumns = 0;
  }

  @action moreColumn() {
    if (this.args.song.readerColumns < 5) {
      this.args.song.readerColumns = Number(this.args.song.readerColumns) + 1;
    }
  }

  @action lessColumn() {
    if (this.args.song.readerColumns > 0) {
      this.args.song.readerColumns = Number(this.args.song.readerColumns) - 1;
    }
  }

  @action upKey() {
    this.transpose(1);
  }

  @action downKey() {
    this.transpose(-1);
  }

  @action transpose(key){
    if(this.args.song.lyrics){
      let content = Transposer.transpose(this.args.song.lyrics);
      if (!isNaN(key)) {
        content = content.up(key);
        this.args.song.lyrics = String(content);
      }
    }
  }

  @action addZoom() {
    this.args.song.readerZoom = Number(this.args.song.readerZoom) + Number(0.025);
  }

  @action subZoom() {
    this.globalConfig.config.readerZoom = Number(this.args.song.readerZoom) - Number(0.025);
  }
  
  @action modeSwitch(){
    this.args.song.viewMode = !this.args.song.viewMode;
  }
}
