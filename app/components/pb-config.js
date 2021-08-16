import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { dialog } from "@tauri-apps/api";

export default class PbConfigComponent extends Component {
  
  @tracked saving = false;

  @action doneEditing() {  
    this.args.saveConfig();
    this.saving = true;
    later(() => { this.saving = false; }, 500);    
  }

  externalEventServices = ["StreamLabs", "StreamElements"];

  @action opendialogfiles(config){
    dialog.open({ directory: true }).then((directory) => {
      console.log(directory);
      if(directory){
        config.overlayfolder = directory;
      }
    });
  }
}
