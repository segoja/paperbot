/* global require */
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class PbCommandEditComponent extends Component {
  @service audio;

  @action doneEditing() {  
    this.args.saveCommand();
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
