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

  constructor() {
    super(...arguments);
    this.sortString = 'name:asc';
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.sortString = 'name:asc';
  }

  @tracked sortString = 'name:asc';
  get timersSorting(){    
    return Object.freeze(this.sortString.split(','));
  }
  
  @sort('args.timers', 'timersSorting') arrangedContent;

  @computedFilterByQuery(
    'arrangedContent',
    ['type'],
    'args.queryParamsObj.type',
    { conjunction: 'and', sort: false }
  )
  filteredByType;

  @computedFilterByQuery(
    'filteredByType',
    ['name', 'message'],
    'args.queryParamsObj.query',
    { conjunction: 'and', sort: false }
  )
  filteredContent;

  @pagedArray('filteredContent', {
    page: alias('parent.args.queryParamsObj.page'),
    perPage: alias('parent.args.queryParamsObj.perPage'),
  })
  pagedContent;

  get dynamicHeight(){
    let elmnt = document.getElementById('bodycontainer');
    let height = 0;
    if(elmnt){
      height = Number(elmnt.offsetHeight) || 0;
    }
    return height;
  }
  
  @action wipeTimers() {
    this.args.queryParamsObj.page = 1;
    this.filteredContent.forEach((timer) => {
      this.audio.removeFromRegister(timer.id);
      timer.destroyRecord().then(() => {
        console.debug('Timer wiped.');
      });
    });
  }

  @action resetPage() {
    this.args.queryParamsObj.page = 1;
  }
  
  @action clearSearch(){
    this.args.queryParamsObj.query = '';
    this.args.queryParamsObj.page = 1;
  }
  
  @action updateRowNr(){
    if(this.dynamicHeight){
      let height = this.dynamicHeight;
      let rows = Math.floor(height / 43);
      if(!isNaN(rows) && rows > 1){
        this.args.queryParamsObj.perPage = rows -1;
        this.args.queryParamsObj.page = 1;
      }
    }
  }

  @action sortColumn(attribute){
    let sortData = this.sortString.split(',');
    this.sortString = '';
    if(attribute){
      let newSort = '';
      let exist = sortData.filter(row => row.includes(attribute));
      if(exist.length > 0){
        if(exist.toString().includes(':asc')){
          newSort = attribute+':desc,';
        } else {
          newSort = attribute+':asc,';
        }
      } else {
        newSort = attribute+':asc,';
      }
      if(sortData.length > 0){
        let others = sortData.filter(row => !row.includes(attribute));
        if(others.length > 0){
          newSort += others.join(',');
        }
      }
      this.sortString = newSort.toString();
    }
  }

  @tracked importcontent;

  @action async timerImport(file) {
    let reference =
      '"name","type","active","time","message","soundfile","volume"';
    let extension = 'csv';
    let recordType = 'timer';
    let response = '';
    if (file) {
      response = await file.readAsText();
      this.currentUser.importRecords(
        reference,
        extension,
        recordType,
        response
      );
    } else {
      this.currentUser.importRecords(
        reference,
        extension,
        recordType,
        response
      );
    }
  }

  @action timerExportFiltered() {
    var csvdata = [];
    if (this.filteredContent.length > 0) {
      let header = [
        'name',
        'type',
        'active',
        'time',
        'message',
        'soundfile',
        'volume',
      ];
      csvdata.push(header);
      this.filteredContent.forEach((timer) => {
        let csvrow = [
          timer.name,
          timer.type,
          timer.active,
          timer.time,
          timer.message,
          timer.soundfile,
          timer.volume,
        ];
        csvdata.push(csvrow);
      });

      csvdata = PapaParse.unparse(csvdata, {
        delimiter: ',',
        header: true,
        quotes: true,
        quoteChar: '"',
      });
      let filename = moment().format('YYYYMMDD-HHmmss') + '-timers.csv';

      this.currentUser.download(csvdata, filename, 'text/csv');
    }
  }
}
