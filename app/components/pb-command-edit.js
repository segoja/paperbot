/* global require */
import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class PbCommandEditComponent extends Component {
    
  @action doneEditing() {  
    this.args.saveCommand();
  }
  
  @action getAudioPath(command){
    let dialog = require('electron').remote.dialog;    
    dialog.showOpenDialog({ properties: ['openFile'] }).then((file) => {
      console.log(file);
      command.soundfile = file.filePaths[0];
      
    });
  }
}
