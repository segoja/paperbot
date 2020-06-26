import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class PbConfigComponent extends Component {
  
  @action doneEditing() {
    this.args.saveConfig();
  }
  
  @action getSoundsFolder(config){
    if(document.getElementById("folder").files[0]){
      config.soundsfolder = document.getElementById("folder").files[0].path;
    }
    // command.save();
    // console.log(dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] }))
  }
}
