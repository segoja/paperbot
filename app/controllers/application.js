import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import DarkReader from 'darkreader';
import FileReader from 'ember-file-upload/system/file-reader';
import moment from 'moment';

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


  @action handleImport (file) {
    if (file) {
      var reader = new FileReader();
      reader.readAsText(file.blob).then((result)=>{
        var adapter = this.store.adapterFor('application');
        adapter.db.bulkDocs(
          JSON.parse(result),
          {new_edits: false}, // not change revision
          (...args) => {
            console.log('DONE', args);
            window.location.reload(true);
          });
      });
    } 
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
