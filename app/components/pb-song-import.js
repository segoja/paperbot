import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { dialog, invoke } from "@tauri-apps/api";
import {
  readDir,
  readTextFile,
  readBinaryFile
} from '@tauri-apps/api/fs';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import { inject as service } from '@ember/service';

export default class PbSongComponent extends Component {
  @tracked page = 1;
  @tracked perPage = 10;
  
  @service store;
  
  get bootstrapWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }  
  
  @tracked isViewing = false;  
  @action toggleModal() {
    this.isViewing = !this.isViewing;
    if(!this.isViewing){
      this.page = 1;
      this.isBulk = false;
      this.bulkType = '';
      this.filterQuery = '';
      this.separator = '';
      this.songs = [];
      this.songsData = [];     
    }
  }
  
  @action generateSongs(){
    let newDate = new Date();
    this.filteredSongs.filterBy('selected', true).forEach(async (song)=>{
      console.debug(song.title+' has been imported!');
      await this.store.createRecord('song', {title: song.title, artist: song.artist, lyrics: song.lyrics, active: true, date_added: newDate, type: song.type }).save();
      song.selected = false;
      song.type = '';
    });
    this.page = 1;
    this.isBulk = false;
    this.bulkType = '';
    //this.filterQuery = '';
    //this.separator = '';
    //this.songs = [];
    //this.songsData = [];   
  }
  
  @tracked songsData = [];  
  @action openSongsFolder(){
    dialog.open({ directory: true }).then((directory) => {
      // console.debug(directory);
      if(directory != null && directory){
        readDir(directory, { recursive: false } ).then((files)=>{
          if(files.length > 0){
            this.songsData = [];
            let idnum = 0;
            files.forEach(async (file)=>{
              //console.debug(file);
              let filename = file.name.slice(0, -4);
              let extension = file.name.substr(file.name.length - 3);              
              if(filename && extension.toLowerCase() === 'txt'){                
                this.songsData.push({id: idnum, name: filename, path: file.path});
                //console.debug(newSong);                
              }
            });
            this.generateList();
            //console.debug(this.songsData);
          }
        });
      }
    });
  }

  @tracked separator = '';
  @tracked songs = [];
  @action generateList(){
    this.resetPage();
    let ansiDecoder = new TextDecoder('windows-1252');
    this.songs = this.songsData.map(async (item)=>{
      let newSong = this.store.createRecord('textfile');
      await invoke('text_reader', { filepath: item.path }).then((filedata)=>{
        newSong.lyrics = filedata;
      }).catch(async (err)=>{ 
        await invoke('binary_loader', { filepath: item.path }).then((fileBinarydata)=>{
          let u8arr = new Uint8Array(fileBinarydata);
          newSong.lyrics = ansiDecoder.decode(u8arr);
        }).catch((binErr)=>{
          console.debug(item.path);
          console.debug(binErr);
        });
      });
       
      if(this.separator){
        let data = item.name.split(this.separator);
        newSong.title = data[1];        
        if(data[2]){ newSong.title = newSong.title+' - '+data[2]; }
        if(data[3]){ newSong.title = newSong.title+' - '+data[3]; }
        if(data[4]){ newSong.title = newSong.title+' - '+data[4]; }        
        if(newSong.title){ newSong.title = newSong.title.trimStart().trimEnd(); }
        newSong.artist = data[0];            
        if(newSong.artist){ newSong.artist = newSong.artist.trimStart().trimEnd(); }
      } else {
        newSong.title = item.name.trimStart().trimEnd();
      } 
      newSong.selected = false;
      return newSong;
    });
  }
  
  @tracked filterQuery = '';
  @computedFilterByQuery(
    'songs',
    ['title','artist'],
    'filterQuery',
    { conjunction: 'and', sort: false}
  ) filteredSongs; 
  
  @pagedArray (
    'filteredSongs',
    { page: alias('parent.page'), perPage: alias('parent.perPage')}
  ) pagedSongs;
  
  @action resetPage() {
    this.page = 1;
    this.isBulk = false;
    this.bulkSelectAll();
  }
  @tracked isBulk = false;
  @action bulkSelectAll(){
    this.filteredSongs.forEach((song)=>{
      song.selected = this.isBulk;
    });
    this.isBulk = !this.isBulk;    
  }
  @tracked bulkType = '';
  @action bulkChangeType(type){
    this.bulkType = type;
    this.filteredSongs.forEach((song)=>{
      song.type = type;
    });
  }
  
  @action addToImport(song){
    song.selected = !song.selected;
  }
}