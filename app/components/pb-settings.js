import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import PapaParse from 'papaparse';
import { dialog } from "@tauri-apps/api";
import { readTextFile } from '@tauri-apps/api/fs';

export default class PbSettingsComponent extends Component {

  settingsSorting = Object.freeze(['name']);
  
  @sort (
    'args.settings',
    'settingsSorting'
  ) arrangedContent;

  @computedFilterByQuery(
    'arrangedContent',
    ['name','soundsfolder','couchdbuser','couchdburl'],
    'args.queryParamsObj.query',
    { conjunction: 'and', sort: false}
  ) filteredContent;

  @pagedArray (
    'filteredContent',
    { page: alias('parent.args.queryParamsObj.page'), perPage: alias('parent.args.queryParamsObj.perPage')}
  ) pagedContent;

  @action resetPage() {
    this.args.queryParamsObj.page = 1;
  }
  
  @tracked importcontent;
  
  @action configImport(){
    dialog.open({
      directory: false,
      filters: [{name: "csv file", extensions: ['csv']}]
    }).then((path) => {
      if(path != null){        
        readTextFile(path).then((text)=>{      
          let reference = '"name","soundsfolder","couchdbuser","couchdbpassword","couchdburl","darkmode","isdefault"';

          let rows = PapaParse.parse(text,{ delimiter: ',', header: true, quotes: false, quoteChar: '"', skipEmptyLines: true }).data;
          
          let csvfields = text.split('\r\n').slice(0,1);
          
          // We check if the structure is the same.
          if (csvfields.toString() === reference){
            this.importcontent = rows;
            
            this.importcontent.forEach((song)=>{
              this.args.importSongs(song);
            });      
          } else {
            alert("Wrong column structure in the import csv file.");
          }
        });
      }
    });
  }
    
  
  @action configExportFiltered() {
    this.filteredContent;
    var csvdata = [];
    if (this.filteredContent.length > 0){
      let header = ['name','soundsfolder','couchdbuser','couchdbpassword','couchdburl','darkmode','isdefault'];
      csvdata.push(header);
      this.filteredContent.forEach((config) => {
        let csvrow = [config.name,config.soundsfolder,config.couchdbuser,config.couchdbpassword,config.couchdburl,config.darkmode,config.isdefault];
        csvdata.push(csvrow);
      });
      
      csvdata = PapaParse.unparse(csvdata, { delimiter: ',', header: true, quotes: true, quoteChar: '"' });        

      let { document, URL } = window;
      let anchor = document.createElement('a');
      anchor.download = 'settings.csv';
      anchor.href = URL.createObjectURL(new Blob([csvdata], { type: 'text/csv' }));

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
  }
}
