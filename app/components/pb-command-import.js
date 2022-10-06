import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { dialog } from "@tauri-apps/api";
import {
  readDir,
  readTextFile,
  readBinaryFile
} from '@tauri-apps/api/fs';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import { inject as service } from '@ember/service';

export default class PbCommandComponent extends Component {
  @tracked page = 1;
  @tracked perPage = 10;
  
  @service store;
  @service audio;
  
  get bootstrapWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }  
  
  @tracked isViewing = false;  
  @action toggleModal() {
    this.isViewing = !this.isViewing;
    if(!this.isViewing){
      this.page = 1;
      this.isBulk = false;
      this.bulkVolume = 0;
      this.filterQuery = '';
      this.separator = '';
      this.commands = [];
      this.commandsData = [];
    }
  }
  
  @action generateCommands(){
    let newDate = new Date();
    this.filteredCommands.filterBy('selected', true).forEach(async (command)=>{
      console.debug(command.name+' has been imported!');
      if(command.volume === ''){
        command.volume = 0;
      }
      if(command.volume < 1){
        command.volume = 0;
      }
      if(command.volume > 100){
        command.volume = 100;
      }
      if(isNaN(command.volume)){
        command.volume = 100;
      }
      
      let newRecord = await this.store.createRecord('command', {
        name: command.command,
        active: true,
        admin: false,
        mod: false,
        vip: false,
        sub: false,
        cooldown: false,
        timer: 0,
        soundfile: command.soundfile,
        volume: command.volume,
        date_added: newDate,
        type: 'audio' 
      });
      newRecord.save().then(()=>{
        // We should not do this
        /*if(newRecord.active){
          this.audio.removeFromRegister(newRecord.name);        
          this.audio.loadSound(newRecord);
        } else {
          this.audio.removeFromRegister(newRecord.name);
        }*/       
      });
      command.selected = false;
    });
    this.page = 1;
    this.isBulk = false;
    this.bulkVolume = 0;
    //this.filterQuery = '';
    //this.separator = '';
    //this.commands = [];
    //this.commandsData = []; 
  }
  
  @tracked commandsData = [];
  @action openCommandsFolder(){
    dialog.open({ directory: true }).then((directory) => {
      // console.debug(directory);
      if(directory != null && directory){
        readDir(directory, { recursive: false } ).then((files)=>{
          if(files.length > 0){
            this.commandsData = [];
            let idnum = 0;
            files.forEach(async (file)=>{
              console.debug(file);
              let filename = file.name.slice(0, -4);
              let extension = file.name.substr(file.name.length - 3).toLowerCase();
              let command = filename.toLowerCase().replace(/[^a-zA-Z ]/g, "").trim();
              
              if(extension === 'mp3' || extension === 'ogg' || extension === 'wav'){
                this.commandsData.push({id: idnum, name: filename, command: command, path: file.path});
                //console.debug(newCommand);
              }
            });
            this.generateList();
            //console.debug(this.commandsData);
          }
        });
      }
    });
  }

  @tracked commands = [];
  @action generateList(){
    this.resetPage();
    this.commands = this.commandsData.map((item)=>{
      console.debug('Test!');
      let newCommand = this.store.createRecord('audiofile');
      newCommand.name = item.name;
      newCommand.command = '!'+item.command;
      newCommand.active = false;
      newCommand.admin = false;
      newCommand.mod = false;
      newCommand.vip = false;
      newCommand.sub = false;
      newCommand.cooldown = false;
      newCommand.timer = 300;
      newCommand.soundfile = item.path;
      newCommand.volume = 100;
      newCommand.selected = false;
      
      return newCommand;
    });
  }
  
  @tracked filterQuery = '';
  @computedFilterByQuery(
    'commands',
    ['name','command','soundfile'],
    'filterQuery',
    { conjunction: 'and', sort: false}
  ) filteredCommands; 
  
  @pagedArray (
    'filteredCommands',
    { page: alias('parent.page'), perPage: alias('parent.perPage')}
  ) pagedCommands;
  
  @action resetPage() {
    this.page = 1;
    this.isBulk = false;
    this.bulkSelectAll();
  }
  @tracked isBulk = false;
  @action bulkSelectAll(){
    this.filteredCommands.forEach((command)=>{
      command.selected = this.isBulk;
    });
    this.isBulk = !this.isBulk;    
  }
  
  @tracked bulkVolume = 0;
  @action bulkChangeVolume(volume){
    this.bulkVolume = volume;
    this.filteredCommands.forEach((command)=>{
      command.volume = volume;
    });
  }
  
  @action addToImport(command){
    command.selected = !command.selected;
  }
}
