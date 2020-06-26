import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { inject as service } from '@ember/service';
import FileReader from 'ember-file-upload/system/file-reader';
import { tracked } from '@glimmer/tracking';
import { compare } from '@ember/utils';
import PapaParse from 'papaparse';

export default class PbSettingsComponent extends Component {
  @service csv;

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
  
  @action configImport(file){
    let reader = new FileReader();
    reader.readAsText(file.blob).then((text) => {    
      let reference = ['name','soundsfolder','couchdbuser','couchdbpassword','couchdburl','darkmode','isdefault'];

      let rows = PapaParse.parse(text,{header: true, skipEmptyLines: true}).data;
      
      let csvfields = text.split('\r\n').slice(0,1).toString().split(',');
      console.log(reference);
      console.log(csvfields);
      
      // We check if the structure is the same.
      if (compare(csvfields, reference) === 0){
        // alert(this.csvfields);
        this.importcontent = rows;
        
        this.importcontent.forEach((config)=>{
          console.log(config);
          this.args.importConfigs(config);
        });      
      } else {
        alert("Wrong column structure in the import csv file.");
      }
    }, function (err) {
      console.error(err);
    });
  }
    
  
  @action configExportFiltered() {
    this.filteredContent;
    var csvdata = [];
    if (this.filteredContent !== 0){
      let header = ['name','soundsfolder','couchdbuser','couchdbpassword','couchdburl','darkmode','isdefault'];
      csvdata.push(header);
      this.filteredContent.forEach((config) => {
        let csvrow = [config.name,config.soundsfolder,config.couchdbuser,config.couchdbpassword,config.couchdburl,config.darkmode,config.isdefault];
        csvdata.push(csvrow);
      });
    }

      //csvdata = PapaParse.unparse(this.filteredContent,{header: true, skipEmptyLines: true,	quoteChar: '"',	escapeChar: '"',	delimiter: ",", newline: "\r\n"});
      this.csv.export(csvdata, {fileName: 'settings.csv', autoQuote: true, withSeparator: false});
  }
}
