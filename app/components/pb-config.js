/* global require */
import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class PbConfigComponent extends Component {

  @action doneEditing() {
    this.args.saveConfig();
  }

  @action opendialogfiles(config){
    // This functionality is tied to node. Only works with ember-electorn.
    // To make it work you have to add to your ember electorn main.js file in the browserWindow definition, under webPreferences:
    // webSecurity: false,
    // allowRunningInsecureContent: false,
    // nodeIntegration: true,
    
    let dialog = require('electron').remote.dialog;
    dialog.showOpenDialog({ properties: ['openDirectory'] }).then((folder) => {
      console.log(folder);
      config.overlayfolder = folder.filePaths[0];
    });
  }
}
