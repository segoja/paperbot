import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { dialog, invoke } from "@tauri-apps/api";
import { readDir } from '@tauri-apps/api/fs';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import { inject as service } from '@ember/service';
import { FileState } from 'ember-file-upload';

export default class PbSongComponent extends Component {
  @tracked page = 1;
  @tracked perPage = 10;
  
  @service store;
  @service currentUser;
  @service fileQueue;
  
  @tracked queueLenght = 0;
 
  get queue() {
    let queue = this.fileQueue.find('massSongs');
    return queue;
  } 
 
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
  @action async openSongsFolder(file){
    if(this.currentUser.isTauri){
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
    } else {
      if(file){
        this.songsData = [];
        //console.log(this.fileQueue.files.length);
        let idnum = this.fileQueue.files.length;
        if(this.queueLenght == 0){
          this.queueLenght = idnum;
        }
        let filename  = await file.name.slice(0, -4);
        let extension = await file.name.substr(file.name.length - 3);
        let content = await file.readAsText();
        // console.log(idnum + ' - ' + filename);
        if(filename && extension.toLowerCase() === 'txt'){                
          this.songsData.push({id: idnum, name: filename, path: file.path, content: content, extension: extension});
        }
        this.queue.remove(file);
        
        if(this.queue.files.length == 0){
          this.generateList();
        }
        
        //this.generateList();
      }  
    }
  }

  @tracked separator = '';
  @tracked songs = [];
  
  @action generateList(){
    this.resetPage();
    let ansiDecoder = new TextDecoder('windows-1252');
    let utf8Decoder = new TextDecoder();
    this.songs = this.songsData.map((item)=>{      
      let extension = ''; 
      if(this.currentUser.isTauri){
        extension = item.path.split(/[#?]/)[0].split('.').pop().trim();
      } else {
        extension = item.extension;
      }
      if(extension === 'txt'){
        let newSong = this.store.createRecord('textfile');
        if(this.currentUser.isTauri){
          invoke('binary_loader', { filepath: item.path }).then((fileBinarydata)=>{          
            var arrayBufferView = new Uint8Array(fileBinarydata);

            // create a blob from this
            let lyrics = utf8Decoder.decode(arrayBufferView);            
            
            if(lyrics === ''){
              console.log('Lyrics are ANSI encoded.');
              lyrics = ansiDecoder.decode(arrayBufferView);
            }
            newSong.lyrics = lyrics;
          }).catch((binErr)=>{
            console.debug(item.path);
            console.debug(binErr);
          });
        } else {
          newSong.lyrics = item.content;
        }
        
        if(this.separator != ''){
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
      }
    });
  }
  
  @tracked filterQuery = '';
  
  get newSongs(){
    if(this.songs.length > 0){
      return this.songs;
    }
    return '';
  }
  
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