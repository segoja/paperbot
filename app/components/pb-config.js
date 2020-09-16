/* global require */
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

export default class PbConfigComponent extends Component {
  @service eventsExternal;

  @tracked saving = false;

  @action doneEditing() {  
    this.args.saveConfig();
    this.saving = true;
    later(() => { this.saving = false; }, 500);    
  }

  externalEventServices = ["StreamLabs", "StreamElements"];

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
  

  @action connectExternalEvents(){
    this.eventsExternal.type = this.args.config.externalevents;
    this.eventsExternal.token = this.args.config.externaleventskey;

    this.eventsExternal.createClient();
  } 

  @action disconnectExternalEvents(){
    this.eventsExternal.disconnectClient();
  }
  
}
