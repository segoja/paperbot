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

export default class PbClientsComponent extends Component {
  @service currentUser;

  clientsSorting = Object.freeze(['name']);
  
  @sort (
    'args.clients',
    'clientsSorting'
  ) arrangedContent;

  @computedFilterByQuery(
    'arrangedContent',
    ['username'],
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
  
  @action clientImport(){
    dialog.open({
      directory: false,
      filters: [{name: "csv file", extensions: ['csv']}]
    }).then((path) => {
      if(path != null){
        readTextFile(path).then((text)=>{
          let reference = '"username","oauth","channel","debug","reconnect","secure"';

          let rows = PapaParse.parse(text,{ delimiter: ',', header: true, quotes: false, quoteChar: '"', skipEmptyLines: true }).data;
          
          let csvfields = text.split('\r\n').slice(0,1);
          
          // We check if the structure is the same.
          if (csvfields.toString() === reference){
            this.importcontent = rows;
            
            this.importcontent.forEach((client)=>{
              this.args.importClients(client);
            });      
          } else {
            alert("Wrong column structure in the import csv file.");
          }
        });
      }
    });
  }
    
  
  @action clientExportFiltered() {
    var csvdata = [];
    if (this.filteredContent.length > 0){
      
      let header = ['username','oauth','channel','debug','reconnect','secure'];
      csvdata.push(header);
      
      this.filteredContent.forEach((client) => {
        let csvrow = [client.username,client.oauth,client.channel,client.debug,client.reconnect,client.secure];
        csvdata.push(csvrow);
      });
      
      csvdata = PapaParse.unparse(csvdata, { delimiter: ',', header: true, quotes: true, quoteChar: '"' });        

      let filename = moment().format('YYYYMMDD-HHmmss')+'-clients.csv'; 

        dialog.save({
          defaultPath: filename, 
          filters: [{name: '', extensions: ['csv']}]
        }).then((path)=>{
        if(path){
          writeFile({'path': path, 'contents': csvdata}).then(()=>{
            console.debug('Clients export csv file saved!');
          });
        }
      });
    }
  }
}