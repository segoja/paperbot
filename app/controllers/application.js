import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import DarkReader from 'darkreader';
import moment from 'moment';
import { tracked } from '@glimmer/tracking';
import { dialog } from "@tauri-apps/api";
import { readTextFile } from '@tauri-apps/api/fs';

export default class ApplicationController extends Controller {
  @service cloudState;
  @service audio;
  @service store;
  @service router; 
  @service headData;
  @service globalConfig;

  get darkmode(){
    if(this.model){
      var config = this.model.filterBy('isdefault', true).get('firstObject');
      if(config !== undefined){
        //this.darkreader(config.switcher);
        return config.switcher;        
      }
    }
    this.darkreader(true);
    return this.headData.darkMode;
  }

  @action darkreader(status){
    if(status){
      DarkReader.enable({
          brightness: 100,
          contrast: 100,
          sepia: 0
      });      
    } else {
      DarkReader.disable(); 
    }
  }
  
  @tracked isOnline = false;
  get serverStatus(){
    fetch('http://paper.bot', {mode: 'no-cors'}).then(async () => {
      console.log("Server is connected.");
      this.isOnline = true;
    }, ()=>{
      console.log("Server is not connected.");
      this.isOnline = false;
    });
    return this.isOnline;   
  }
  
  get loadConfig(){
    var config = this.model.filterBy('isdefault', true).get('firstObject');
    this.globalConfig.config = config;
    return '';    
  }
  
  @action handleExport () {
    let adapter = this.store.adapterFor('application');
    
    adapter.db.allDocs({include_docs: true, attachments: true}, (error, doc) => {
      if (error) {
        console.error(error);
      } else {
        this.download(JSON.stringify(doc.rows.map(({doc}) => doc), null, "  "),moment(new Date).format("YYYYMMDD-HHmmss")+'paperbot-backup.json','text/plain');
      }
    });
  }
  
  
  // Function to download data to a file
  @action download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(file, filename);
    } else { // Others
      var a = document.createElement("a"), url = URL.createObjectURL(file);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);  
      }, 0); 
    }
  }

  @action handleImport() {
    dialog.open({
      directory: false,
      filters: [{name: "backup file", extensions: ['json']}]
    }).then((path) => {
      if(path != null){
        readTextFile(path).then((data)=>{
          
          let adapter = this.store.adapterFor('application');
          let importable = Object.assign([],JSON.parse(data));
          
          adapter.db.bulkDocs(importable, {new_edits: false}, (...args) => {
            console.log('DONE', args);
            window.location.reload(true);
          });
          
        });
      }
    });
  }
  
  
  @action wipeDatabase(){
    var adapter = this.store.adapterFor('application');
    adapter.wipeDatabase();
  }
  
  @action toggleMode(){
    
    if(this.model){
      var config = this.model.filterBy('isdefault', true).get('firstObject');
      if(config !== undefined){
        config.darkmode = !config.darkmode;
        config.save();
        this.headData.set('darkMode', this.darkmode);
        this.darkreader(this.darkmode);
      } else {
        this.headData.set('darkMode', !this.darkmode);
        this.darkreader(!this.darkmode);
      }
    } else {
      this.headData.set('darkMode', !this.darkmode);
      this.darkreader(!this.darkmode);
    }
  }
}
