import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { dialog } from "@tauri-apps/api";
import { readDir, readTextFile, readBinaryFile } from '@tauri-apps/api/fs';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';

export default class PbSongComponent extends Component {
  @tracked page = 1;
  @tracked perPage = 10;
  @service store;
  
  @tracked isViewing = false;  
  @action toggleModal(paramFunc) {
    if(paramFunc){
      paramFunc();
      later(() => {
        this.page = 1;
        this.isBulk = false;
        this.bulkType = '';
        this.filterQuery = '';
        this.separator = '';
        this.songs = [];
        this.songsData = [];
        this.isViewing = !this.isViewing;     
      }, 1000);
    } else {
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
  }
  
  @action generateSongs(){
    let newDate = new Date();
    this.filteredSongs.filterBy('selected', true).forEach(async (song)=>{
      console.log(song.title+' has been imported!');
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
  @action async openSongsFolder(){
    dialog.open({ directory: true }).then((directory) => {
      // console.log(directory);
      if(directory != null && directory){
        readDir(directory, { recursive: true } ).then((files)=>{
          if(files.length > 0){
            this.songsData = [];
            let idnum = 0;
            let ansiDecoder = new TextDecoder('windows-1252');
            files.forEach((file)=>{
              //console.log(file);
              let filename = file.name.slice(0, -4);
              let extension = file.name.substr(file.name.length - 3);
              if(filename && extension.toLowerCase() === 'txt'){
                let newSong = {id: idnum, name: '', lyrics: ''};
                newSong.name = filename;
                readTextFile(file.path).then((filedata)=>{
                  newSong.lyrics = filedata;
                }).catch((err)=>{ 
                  readBinaryFile(file.path).then((fileBinarydata)=>{
                    console.log(fileBinarydata);
                    // let string = String.fromCharCode(...fileBinarydata);
                    let u8arr = new Uint8Array(fileBinarydata);
                    let string = ansiDecoder.decode(u8arr);        
                    newSong.lyrics = string;
                  }).catch((binErr)=>{
                    console.log(file.path);
                    console.log(binErr);
                  });
                });
                if(newSong.name){ 
                  this.songsData.push(newSong);
                  idnum = idnum +1;                
                }
                //console.log(newSong);                
              }
            });
            this.generateList();
            //console.log(this.songsData);
          }
        });
      }
    });
  }

  @tracked separator = '';
  @tracked songs = [];
  @action generateList(){
    if(this.separator != ''){
      this.songs = this.songsData.map((song)=>{
        let data = song.name.split(this.separator);
        let title = data[1];
        if(data[2]){ title = title+' - '+data[2]; }
        if(data[3]){ title = title+' - '+data[3]; }
        if(data[4]){ title = title+' - '+data[4]; }        
        if(title){ title = title.trimStart().trimEnd(); }
        let artist = data[0];            
        if(artist){ artist = artist.trimStart().trimEnd(); }
        return this.store.createRecord('textfile', {title: title, artist: artist, lyrics: song.lyrics, selected: false });
      });
    } else {
      this.songs = this.songsData.map((song)=>{        
        return this.store.createRecord('textfile', {title: song.name.trimStart().trimEnd(), artist: '', lyrics: song.lyrics, selected: false });
      });
    }
    this.resetPage();
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
