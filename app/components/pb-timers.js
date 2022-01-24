import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import PapaParse from 'papaparse';
import { dialog } from "@tauri-apps/api";
import {
  writeFile,
  readTextFile
} from '@tauri-apps/api/fs';
import moment from 'moment';
import { inject as service } from '@ember/service';

export default class PbTimersComponent extends Component {
  @service currentUser;
  @service audio;
  
  timersSorting = Object.freeze(['date:desc']);
  
  @sort (
    'args.timers',
    'timersSorting'
  ) arrangedContent; 
  
  @computedFilterByQuery(
    'arrangedContent',
    ['type'],
    'args.queryParamsObj.type',
    { conjunction: 'and', sort: false}
  ) filteredByType;  
 
  @computedFilterByQuery(
    'filteredByType',
    ['name','type','active','time','message','soundfile','volume'],
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

  @action wipeTimers(){
    this.args.queryParamsObj.page = 1;
    this.filteredContent.forEach((timer)=>{
      this.audio.removeFromRegister('sound', timer.name);
      console.debug(timer.soundfile+ " removed from the soundboard");
      timer.destroyRecord().then(()=>{
        console.debug("Timer wiped.")
      });
    });
  }

  @action resetPage() {
    this.args.queryParamsObj.page = 1;
  }
  
  @tracked importcontent;
  
  @action timerImport(){
    dialog.open({
      directory: false,
      filters: [{name: "csv file", extensions: ['csv']}]
    }).then((path) => {
      if(path != null){
        readTextFile(path).then((text)=>{
          let reference = '"name","type","active","time","message","soundfile","volume"';

          let rows = PapaParse.parse(text,{ delimiter: ',', header: true, quotes: false, quoteChar: '"', skipEmptyLines: true }).data;
          
          let csvfields = text.split('\r\n').slice(0,1);
          
          // We check if the structure is the same.
          if (csvfields.toString() === reference){
            this.importcontent = rows;
            
            this.importcontent.forEach((timer)=>{
              this.args.importTimers(timer);
            });      
          } else {
            alert("Wrong column structure in the import csv file.");
          }
        });
      }
    });
  }
  
  @action timerExportFiltered() {
    var csvdata = [];
    if (this.filteredContent.length > 0){
      let header = ['name','type','active','time','message','soundfile','volume'];
      csvdata.push(header);
      this.filteredContent.forEach((timer) => {
        let csvrow = [timer.name, timer.type, timer.active, timer.time, timer.message, timer.soundfile, timer.volume];
        csvdata.push(csvrow);
      });
      
      csvdata = PapaParse.unparse(csvdata, { delimiter: ',', header: true, quotes: true, quoteChar: '"' });        
      let filename = moment().format('YYYYMMDD-HHmmss')+'-timers.csv'; 

      dialog.save({
        defaultPath: filename, 
        filters: [{name: '', extensions: ['csv']}]
      }).then((path)=>{
        if(path){
          writeFile({'path': path, 'contents': csvdata}).then(()=>{
            console.debug('Timers export csv file saved!');
          });
        }
      });
    }
  }
}