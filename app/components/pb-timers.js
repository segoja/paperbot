import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import PapaParse from 'papaparse';
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
      this.audio.removeFromRegister(timer.id);
      timer.destroyRecord().then(()=>{
        console.debug("Timer wiped.")
      });
    });
  }

  @action resetPage() {
    this.args.queryParamsObj.page = 1;
  }
  
  @tracked importcontent;

  @action async timerImport(file){
    let reference = '"name","type","active","time","message","soundfile","volume"';
    let extension = 'csv';
    let recordType = 'timer';
    let response = '';
    if(file){ 
      response = await file.readAsText();
      this.currentUser.importRecords(reference,extension,recordType,response);
    } else {
      this.currentUser.importRecords(reference,extension,recordType,response);
    }
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
      
      this.currentUser.download(csvdata,filename,'text/csv');
    }
  }
}