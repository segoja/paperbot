import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import PapaParse from 'papaparse';
import { dialog, invoke } from "@tauri-apps/api";
import {
  writeFile,
  readTextFile
} from '@tauri-apps/api/fs';
import moment from 'moment';
import { inject as service } from '@ember/service';

export default class PbCommandsComponent extends Component {
  @service currentUser;
  @service audio;
  
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

  @action wipeCommands(){
    this.args.queryParamsObj.page = 1;
    this.filteredContent.forEach((command)=>{
      this.audio.removeFromRegister(command.id);
      console.debug(command.soundfile+ " removed from the soundboard");
      command.destroyRecord().then(()=>{
        console.debug("Command wiped.")
      });
    });
  }

  @action resetPage() {
    this.args.queryParamsObj.page = 1;
  }
  
  @action selectType(type){
    this.args.queryParamsObj.type = type;
    this.resetPage();
  }
  
  @tracked importcontent;
  
  @action commandImport(){
    dialog.open({
      directory: false,
      filters: [{name: "csv file", extensions: ['csv']}]
    }).then(async (path) => {
      if(path != null){
        await invoke('text_reader', { filepath: path }).then((text)=>{
          let reference = '"name","type","active","admin","mod","vip","sub","cooldown","timer","response","soundfile","volume"';

          let rows = PapaParse.parse(text,{ delimiter: ',', header: true, quotes: false, quoteChar: '"', skipEmptyLines: true }).data;
          
          let csvfields = text.split('\r\n').slice(0,1);
          
          // We check if the structure is the same.
          if (csvfields.toString() === reference){
            this.importcontent = rows;
            
            this.importcontent.forEach((command)=>{
              this.args.importCommands(command);
            });      
          } else {
            alert("Wrong column structure in the import csv file.");
          }
        });
      }
    });
  }
  
  @action commandExportFiltered() {
    var csvdata = [];
    if (this.filteredContent.length > 0){
      let header = ['name','type','active','admin','mod','vip','sub','cooldown','timer','response','soundfile','volume'];
      csvdata.push(header);
      this.filteredContent.forEach((command) => {
        let csvrow = [command.name, command.type, command.active, command.admin, command.mod, command.vip, command.sub, command.cooldown, command.timer, command.response, command.soundfile, command.volume];
        csvdata.push(csvrow);
      });
      
      csvdata = PapaParse.unparse(csvdata, { delimiter: ',', header: true, quotes: true, quoteChar: '"' });        
      let filename = moment().format('YYYYMMDD-HHmmss')+'-commands.csv'; 

      dialog.save({
        defaultPath: filename, 
        filters: [{name: '', extensions: ['csv']}]
      }).then(async (path)=>{
        if(path){
          await invoke('file_writer', { filepath: path, filecontent: csvdata}).then(()=>{
            console.debug('Commands export csv file saved!');
          });
        }
      });
    }
  }
}