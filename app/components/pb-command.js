/* global require */
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';

export default class PbCommandComponent extends Component {
  @service audio;

  @tracked saving = false;
  
  @action doneEditing() {  
    this.args.saveCommand();
    this.saving = true;
    later(() => { this.saving = false; }, 500);    
  }
  
  @action getAudioPath(command){
    let dialog = require('electron').remote.dialog;    
    dialog.showOpenDialog({ properties: ['openFile'] }).then((file) => {
      // console.log(file);
      if(file.filePaths[0] != undefined){
        command.soundfile = file.filePaths[0];
        command.save();
      }
    });
  }  
  
  get loadPreview(){
    if(this.args.command.soundfile){
      this.audio.removeFromRegister('sound', 'preview');    
      return this.audio.load(this.args.command.soundfile).asSound('preview');      
    } else {
      return false;
    }
  }
  
  @action soundPreview(){
    var sound = this.audio.getSound('preview');
    sound.changeGainTo(this.args.command.volume).from('percent');
    sound.play();
  }
}
