import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class PbCommandEditComponent extends Component {
    
  @action doneEditing() {  
    this.args.saveCommand();
  }
  
  @action getAudioPath(command){
    if(document.getElementById("file").files[0]){
      command.soundfile = document.getElementById("file").files[0].path;
    }
    // command.save();
    // console.log(dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] }))
  }
}
