/* global require */
import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class PbConfigComponent extends Component {

  @action doneEditing() {
    this.args.saveConfig();
  }

  @action opendialogfiles(config){
    let dialog = require('electron').remote.dialog;    
    dialog.showOpenDialog({ properties: ['openDirectory'] }).then((folder) => {
      console.log(folder);
      config.soundsfolder = folder.filePaths[0];
    });
  }
}
