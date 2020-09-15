/* global require */
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import StreamlabsSocketClient from 'streamlabs-socket-client';

export default class PbConfigComponent extends Component {
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
  

  @action connectExternal(){
    const client = new StreamlabsSocketClient({
      token: this.args.config.externaleventskey,
      emitTests: true // true if you want alerts triggered by the test buttons on the streamlabs dashboard to be emitted. default false.
    });

    // Twitch notifications:
    client.on('follow', (data) => {
      console.log(data);
    });
    client.on('subscription', (data) => {
      console.log(data);
    });
    client.on('resub', (data) => {
      console.log(data);
    }); 
    client.on('host', (data) => {
      console.log(data);
    });      
    client.on('raid', (data) => {
      console.log(data);
    }); 
    client.on('bits', (data) => {
      console.log(data);
    });
    
    // Streamlabs notifications:
    client.on('redemption', (data) => {
      console.log(data);
    });
    client.on('donation', (data) => {
      console.log(data);
    });
    client.on('merch', (data) => {
      console.log(data);
    });
    
    client.connect();  
  }  
}
