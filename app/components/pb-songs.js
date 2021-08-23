import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { compare } from '@ember/utils';
import PapaParse from 'papaparse';
import { dialog } from "@tauri-apps/api";
import { readTextFile } from '@tauri-apps/api/fs';

export default class PbSongsComponent extends Component {
  @service csv;
 
  songsSorting = Object.freeze(['date_added:asc']);
  
  @sort (
    'args.songs',
    'songsSorting'
  ) arrangedContent; 
  
  @computedFilterByQuery(
    'arrangedContent',
    ['type'],
    'args.queryParamsObj.type',
    { conjunction: 'and', sort: false}
  ) filteredByType;  
 
  @computedFilterByQuery(
    'filteredByType',
    ['title','artist','type'],
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
  
  @action songImport(){
    dialog.open({
      directory: false,
      filters: [{name: "csv file", extensions: ['csv']}]
    }).then((path) => {
      if(path != null){        
        readTextFile(path).then((text)=>{   
          let reference = ["title","artist","type","account","active","admin","mod","vip","sub","date_added","last_played","times_requested","times_played","remoteid"];

          let rows = PapaParse.parse(text,{header: true, skipEmptyLines: true}).data;
          
          let csvfields = text.split('\r\n').slice(0,1).toString().split(',');
          console.log(reference);
          console.log(csvfields);
          
          // We check if the structure is the same.
          if (compare(csvfields, reference) === 0){
            // alert(this.csvfields);
            this.importcontent = rows;
            
            this.importcontent.forEach((song)=>{
              console.log(song);
              this.args.importSongs(song);
            });      
          } else {
            alert("Wrong column structure in the import csv file.");
          }
        });
      }
    });
  }    
  
  @action songExportFiltered() {
    this.filteredContent;
    var csvdata = [];
    if (this.filteredContent !== 0){
      let header = ["title","artist","type","account","active","admin","mod","vip","sub","date_added","last_played","times_requested","times_played","remoteid"];
      csvdata.push(header);
      this.filteredContent.forEach((song) => {
        let csvrow = [song.title,song.artist,song.type,song.account,song.active,song.admin,song.mod,song.vip,song.sub,song.date_added,song.last_played,song.times_requested,song.times_played,song.remoteid];
        csvdata.push(csvrow);
      });
    }
    
      //csvdata = PapaParse.unparse(this.filteredContent,{header: true, skipEmptyLines: true,	quoteChar: '"',	escapeChar: '"',	delimiter: ",", newline: "\r\n"});
      this.csv.export(csvdata, {fileName: 'songs.csv', autoQuote: true, withSeparator: false});
  }
  
}
