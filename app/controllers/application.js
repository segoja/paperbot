import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import moment from 'moment';
import { dialog } from "@tauri-apps/api";
import { readTextFile } from '@tauri-apps/api/fs';
import { appWindow, getCurrent, getAll, PhysicalPosition, PhysicalSize  } from '@tauri-apps/api/window';
import { emit } from '@tauri-apps/api/event';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';

export default class ApplicationController extends Controller {
  @service cloudState;
  @service currentUser;
  @service audio;
  @service store;
  @service router;
  @service globalConfig;
  @service lightControl; 
  @service eventsExternal;
  
  @tracked collapsed = true;
  // We load the existing config or create a new one.  
  constructor() {
    super(...arguments);
    let currentWindow = getCurrent();
    // We wipe requests on every app start;

    this.store.findAll('config').then(()=>{
      let currentconfig = this.store.peekRecord('config','myconfig');
      if (currentconfig){
        this.globalConfig.showFirstRun = false;
        console.debug("Config found! Loading...");
        this.lightControl.toggleMode(currentconfig.darkmode);
        this.globalConfig.config = currentconfig;
        
        if(this.globalConfig.config.externalevents &&  this.globalConfig.config.externaleventskey){
          this.eventsExternal.token = this.globalConfig.config.externaleventskey;
          this.eventsExternal.type = this.globalConfig.config.externalevents;
        }
        if(currentWindow.label === 'Main'){
          if(this.globalConfig.config.mainMax){
            currentWindow.maximize();
          } else {
            if(this.globalConfig.config.mainPosX === 0 && this.globalConfig.config.mainPosY === 0){
              let position = new PhysicalPosition (this.globalConfig.config.mainPosX, this.globalConfig.config.mainPosY);
              currentWindow.setPosition(position);
            }
            let size = new PhysicalSize (this.globalConfig.config.mainWidth, this.globalConfig.config.mainHeight);          
            currentWindow.setSize(size);
          }
          if(this.globalConfig.config.showOverlay && this.globalConfig.config.overlayType === 'window'){
            this.currentUser.toggleOverlay();
          }
          if(this.globalConfig.config.showLyrics){
            this.currentUser.showLyrics();
          }
        }
      } else{
        this.store.createRecord('config',{id: 'myconfig'}).save().then((newconfig)=>{
          console.debug("Config not found! New config created...");
          this.globalConfig.config = newconfig;
          this.globalConfig.showFirstRun = true;
        }).catch(()=>{
          console.debug("Error creating config!");
        })
      }
      
      if(currentWindow.label === 'Main'){

        currentWindow.listen('tauri://focus', function (response) {
          if(this.globalConfig.config.mainMax){
            currentWindow.unmaximize();
            currentWindow.maximize();
          }
        }.bind(this));
        
        currentWindow.listen('tauri://resize', async function (response) {
          if(!this.globalConfig.config.mainMax){
            this.globalConfig.config.mainWidth = response.payload.width; 
            this.globalConfig.config.mainHeight = response.payload.height;
            await later(async() => {
              if(this.globalConfig.config.mainWidth === response.payload.width && this.globalConfig.config.mainHeight === response.payload.height){
                await this.globalConfig.config.save();
                console.debug('Size saved!');
              }          
            }, 500);
          }
        }.bind(this));
        
        currentWindow.listen('tauri://move', async function (response) { 
          if(!this.globalConfig.config.mainMax){
            this.globalConfig.config.mainPosX = response.payload.x;
            this.globalConfig.config.mainPosY = response.payload.y;
            await later(async() => {
              if(this.globalConfig.config.mainPosX === response.payload.x && this.globalConfig.config.mainPosY === response.payload.y){
                await this.globalConfig.config.save();
                console.debug('Position saved!.');
              }          
            }, 250);
          }
        }.bind(this));
      }
      
      if(currentWindow.label === 'reader'){
        if(this.globalConfig.config.readerMax){
          currentWindow.maximize();
        }
        currentWindow.listen('tauri://resize', async function (response) {
          if(!this.globalConfig.config.readerMax){        
            this.globalConfig.config.readerWidth = response.payload.width; 
            this.globalConfig.config.readerHeight = response.payload.height;
            await later(async() => {            
              if(this.globalConfig.config.readerWidth === response.payload.width && this.globalConfig.config.readerHeight === response.payload.height){
                await this.globalConfig.config.save();
                console.debug('Size saved!');
              }
            }, 500); 
          }
        }.bind(this));
        
        currentWindow.listen('tauri://move', async function (response) { 
          if(!this.globalConfig.config.readerMax){
            this.globalConfig.config.readerPosX = response.payload.x;
            this.globalConfig.config.readerPosY = response.payload.y;
            await later(async () => {
              if(this.globalConfig.config.readerPosX === response.payload.x && this.globalConfig.config.readerPosY === response.payload.y){
                await this.globalConfig.config.save();
                console.debug('Position saved!.');
              }          
            }, 250);
          }
        }.bind(this));
        
        currentWindow.listen('tauri://focus', function (response) {
          if(this.globalConfig.config.readerMax){
            currentWindow.unmaximize();
            currentWindow.maximize();
          }
        }.bind(this));
      }
    });
    //appWindow.listen('tauri://blur', ({ event, payload }) => {
    //  console.debug(payload);
    //});
  }

  get serverStatus(){
    let isOnline = false;
    fetch('http://paper.bot', {mode: 'no-cors'}).then(async () => {
      console.debug("Server is connected.");
      isOnline = true;
    }, ()=>{
      console.debug("Server is not connected.");
      isOnline = false;
    });
    return isOnline;   
  }
  
  get isLyrics(){
    console.debug(this.router.currentURL);
    if(this.router.currentURL === '/reader'){
    //if(this.router.location === 'reader'){
      return true;
    }
    return false;
  }
  
  get isOverlay(){
    if(this.router.currentURL === '/overlay'){
    //if(this.router.location === 'reader'){
      return true;
    }
    return false;
  }  
  
  get updateLight(){
    if(this.globalConfig.config.darkmode){
      this.lightControl.toggleMode(true);
      return true;
    } else {
      this.lightControl.toggleMode(false);
      return false;
    }
  }
  
  @action handleExport () {
    let adapter = this.store.adapterFor('application');
    
    adapter.db.allDocs({include_docs: true, attachments: true}, (error, doc) => {
      if (error) {
        console.error(error);
      } else {
        this.download(JSON.stringify(doc.rows.map(({doc}) => doc), null, "  "),moment(new Date).format("YYYYMMDD-HHmmss")+'paperbot-backup.json','text/plain');
      }
    });
  }
  
  
  // Function to download data to a file
  @action download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(file, filename);
    } else { // Others
      var a = document.createElement("a"), url = URL.createObjectURL(file);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);  
      }, 0); 
    }
  }

  @action handleImport() {
    dialog.open({
      directory: false,
      filters: [{name: "backup file", extensions: ['json']}]
    }).then((path) => {
      if(path != null){
        readTextFile(path).then((data)=>{
          
          let adapter = this.store.adapterFor('application');
          let importable = Object.assign([],JSON.parse(data));
          
          adapter.db.bulkDocs(importable, {new_edits: false}, (...args) => {
            console.debug('DONE', args);
            window.location.reload(true);
          });
          
        });
      }
    });
  }
  
  
  @action wipeDatabase(){
    getAll().forEach((item)=>{ 
      if(item.label != 'Main'){ item.close(); }
    }); 
    var adapter = this.store.adapterFor('application');
    adapter.wipeDatabase().then(()=>{
      console.debug('The database has been wiped.');
      window.location.reload(true);      
    });
  }
  
  @action toggleMode(){
    if(this.globalConfig.config.isLoaded && !this.globalConfig.config.isSaving){
      this.globalConfig.config.darkmode = !this.globalConfig.config.darkmode;
      this.globalConfig.config.save().then(()=>{
        this.lightControl.toggleMode(this.globalConfig.config.darkmode); 
      });
    }
  }
  
  @action toggleMenu(){
    this.currentUser.expandMenu = !this.currentUser.expandMenu;
  }

  @action toggleSubmenu(){
    this.currentUser.expandSubmenu = !this.currentUser.expandSubmenu;
  }
  
  @action closeMenu(){
    this.currentUser.expandMenu = false;
  }
  

  @action minimizeWindow(){
    let currentWindow = getCurrent();
    if(currentWindow.label === 'Main'){
      //console.debug('Minimize is buggy. Waiting for tauri fix.');
      if(this.globalConfig.config.mainMax){
        currentWindow.unmaximize();
      }
      currentWindow.minimize();
    }
    if(currentWindow.label === 'reader'){      
      if(this.globalConfig.config.readerMax){
        currentWindow.unmaximize();
      }
      currentWindow.minimize();
    }    
  }
  
  @action maximizeWindow(){
    let currentWindow = getCurrent();
    if(currentWindow.label === 'Main'){
      if(this.globalConfig.config.mainMax){
        currentWindow.unmaximize();        
        this.globalConfig.config.mainMax = false;        
      } else {
        currentWindow.maximize();
        this.globalConfig.config.mainMax = true;
        later(() => {
          this.globalConfig.config.save();
          console.debug('Main maximized saved!');
        }, 500);
      }      
    }
    if(currentWindow.label === 'reader'){
      if(this.globalConfig.config.readerMax){
        currentWindow.unmaximize();        
        this.globalConfig.config.readerMax = false;        
      } else {
        currentWindow.maximize();
        this.globalConfig.config.readerMax = true;
        later(() => {
          this.globalConfig.config.save();
          console.debug('Reader maximized saved!');
        }, 500);
      }   
    }
  }
  
  @action closeWindow(){
    let currentWindow = getCurrent();
    if(currentWindow.label === 'reader'){
      this.globalConfig.config.save().then(()=>{
        currentWindow.close();
      });
    } else {
      if(currentWindow.label === 'overlay'){
        this.globalConfig.config.save().then(()=>{
          currentWindow.close();
        });
      } else {
        this.globalConfig.config.save().then(()=>{
          getAll().forEach((item)=>{ item.close(); });        
        });
      }
    }
  }
  
  @action dragWindow(){
    let currentWindow = getCurrent();    
    currentWindow.startDragging();
  }  
}
