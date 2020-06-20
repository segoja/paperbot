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

export default class PbCommandsComponent extends Component {
  @service csv;
  
  commandsSorting = Object.freeze(['date:desc']);
  
  @sort (
    'args.commands',
    'commandsSorting'
  ) arrangedContent; 
  
  @computedFilterByQuery(
    'arrangedContent',
    ['type'],
    'args.queryParamsObj.type',
    { conjunction: 'and', sort: false}
  ) filteredByType;  
 
  @computedFilterByQuery(
    'filteredByType',
    ['name','type','active','cooldown','timer','response','soundfile','volume'],
    'args.queryParamsObj.query',
    { conjunction: 'and', sort: false}
  ) filteredContent;
  

  @pagedArray (
    'filteredContent',
    { page: alias('parent.args.queryParamsObj.page'), perPage: alias('parent.args.queryParamsObj.perPage')}
  ) pagedContent;


  constructor() {
    super(...arguments);  
    
  }


  @action resetPage() {
    this.args.queryParamsObj.page = 1;
  }
  
  @tracked importcontent;
  
  @action commandImport(file){
    let reader = new FileReader();
    reader.readAsText(file.blob).then((text) => {    
      let reference = ["name","type","active","cooldown","timer","response","soundfile","volume"];

      let rows = PapaParse.parse(text,{header: true, skipEmptyLines: true}).data;
      
      let csvfields = text.split('\r\n').slice(0,1).toString().split(',');
      console.log(reference);
      console.log(csvfields);
      
      // We check if the structure is the same.
      if (compare(csvfields, reference) === 0){
        // alert(this.csvfields);
        this.importcontent = rows;
        
        this.importcontent.forEach((command)=>{
          console.log(command);
          this.args.importCommands(command);
        });      
      } else {
        alert("Wrong column structure in the import csv file.");
      }
    }, function (err) {
      console.error(err);
    });
  }
  
  @action exportFiltered() {
    this.filteredContent;
    var csvdata = [];
    if (this.filteredContent !== 0){
      let header = ["name","type","active","cooldown","timer","response","soundfile","volume"];
      csvdata.push(header);
      this.filteredContent.forEach((command) => {
        let csvrow = [command.name, command.type, command.active, command.cooldown, command.timer, command.response, command.soundfile, command.volume];
        csvdata.push(csvrow);
      });
    }
    
      //csvdata = PapaParse.unparse(this.filteredContent,{header: true, skipEmptyLines: true,	quoteChar: '"',	escapeChar: '"',	delimiter: ",", newline: "\r\n"});
      this.csv.export(csvdata, {fileName: 'commands.csv', autoQuote: true, withSeparator: false});
  }
}
