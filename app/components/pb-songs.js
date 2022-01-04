import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import PapaParse from 'papaparse';
import { dialog } from "@tauri-apps/api";
import { readTextFile } from '@tauri-apps/api/fs';
import { inject as service } from '@ember/service';
import moment from 'moment';

export default class PbSongsComponent extends Component {
  @service currentUser;
  @service queueHandler;
  @service twitchChat;
  @service globalConfig;
  
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
    ['title','artist'],
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
  
  
  @action songToQueue(selected){
    // changing this could break the reader.
    let song = '"'+selected.title+'"';
    if(selected.artist){
      song = song+' by '+selected.artist+'.';
    }
    let queuesong = {
      id: 'songsys',
      timestamp: moment().format(),
      type: null,
      song: song,
      songId: selected.get('id'),
      title: selected.title? selected.title:'',
      artist: selected.artist? selected.artist:'',
      user: '',
      displayname: '',
      color: 'orange',
      csscolor: '#ffcc00',
      emotes: null,
      processed: false,
    };
    
    this.twitchChat.songqueue.push(this.twitchChat.lastsongrequest);
    this.queueHandler.songqueue = this.songqueue;
    if(this.twitchChat.songqueue.length == 1){
      this.globalConfig.config.lastPlayed = song;
    }
    this.globalConfig.config.songQueue = this.queueHandler.pendingSongs;
    // Song statistics:
    selected.times_requested = Number(selected.times_requested) + 1;
    selected.last_request = new Date();
    selected.save();
  }

  @action wipeSongs(){
    this.args.queryParamsObj.page = 1;
    this.filteredContent.forEach((song)=>{
      song.destroyRecord().then(()=>{
        console.debug("Song wiped.")
      });
    });
  }
  
  @action songImport(){
    dialog.open({
      directory: false,
      filters: [{name: "csv file", extensions: ['csv']}]
    }).then((path) => {
      if(path != null){        
        readTextFile(path).then((text)=>{   
          let reference = '"title","artist","lyrics","type","account","active","admin","mod","vip","sub","date_added","last_played","times_requested","times_played","remoteid"';

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
  
  @action songExportFiltered() {
    var csvdata = [];
    if (this.filteredContent.length > 0){
      let header = ['title','artist','lyrics','type','account','active','admin','mod','vip','sub','date_added','last_played','times_requested','times_played','remoteid'];
      csvdata.push(header);
      this.filteredContent.forEach((song) => {
        let csvrow = [song.title,song.artist,song.lyrics,song.type,song.account,song.active,song.admin,song.mod,song.vip,song.sub,song.date_added,song.last_played,song.times_requested,song.times_played,song.remoteid];
        csvdata.push(csvrow);
      });
      
      csvdata = PapaParse.unparse(csvdata, { delimiter: ',', header: true, quotes: true, quoteChar: '"' });        

      let { document, URL } = window;
      let anchor = document.createElement('a');
      anchor.download = 'songs.csv';
      anchor.href = URL.createObjectURL(new Blob([csvdata], { type: 'text/csv' }));

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
  }
  
}
