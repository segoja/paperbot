import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import moment from 'moment';
import { dialog, invoke } from "@tauri-apps/api";
import {
  writeFile,
  readTextFile
} from '@tauri-apps/api/fs';
import { appWindow, getCurrent, getAll, PhysicalPosition, PhysicalSize, WebviewWindow  } from '@tauri-apps/api/window';
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
          //if(!this.globalConfig.config.mainMax){
            if(this.globalConfig.config.mainPosX === 0 && this.globalConfig.config.mainPosY === 0){
              let position = new PhysicalPosition (this.globalConfig.config.mainPosX, this.globalConfig.config.mainPosY);
              currentWindow.setPosition(position);
            }
            let size = new PhysicalSize (this.globalConfig.config.mainWidth, this.globalConfig.config.mainHeight);          
            currentWindow.setSize(size);
          //}
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

        }.bind(this));
        
        currentWindow.listen('tauri://resize', async function (response) {
          if(!this.globalConfig.config.mainMax){
            this.globalConfig.config.mainWidth = response.payload.width; 
            this.globalConfig.config.mainHeight = response.payload.height;
            console.debug('Resizing Main');
          }
        }.bind(this));
        
        currentWindow.listen('tauri://move', async function (response) { 
          if(!this.globalConfig.config.mainMax){
            this.globalConfig.config.mainPosX = response.payload.x;
            this.globalConfig.config.mainPosY = response.payload.y;
            console.debug('Moving Main');
          }
        }.bind(this));
        
        if(this.globalConfig.config.mainMax){
            currentWindow.maximize();
        }
      }
      
      if(currentWindow.label === 'reader'){
        currentWindow.listen('tauri://resize', async function (response) {
          if(!this.globalConfig.config.readerMax){        
            this.globalConfig.config.readerWidth = response.payload.width; 
            this.globalConfig.config.readerHeight = response.payload.height;
            console.debug('Resizing reader');
          }
        }.bind(this));
        
        currentWindow.listen('tauri://move', async function (response) { 
          if(!this.globalConfig.config.readerMax){
            this.globalConfig.config.readerPosX = response.payload.x;
            this.globalConfig.config.readerPosY = response.payload.y;
            console.debug('Moving reader');
          }
        }.bind(this));
        
        if(this.globalConfig.config.readerMax){
          currentWindow.maximize();
        }
      } 

      if(currentWindow.label === 'overlay'){            
        currentWindow.listen('tauri://resize', async function (response) {
          this.globalConfig.config.overlayWidth = response.payload.width; 
          this.globalConfig.config.overlayHeight = response.payload.height;
            console.debug('Resizing overlay');
        }.bind(this));
        
        currentWindow.listen('tauri://move', async function (response) { 
          this.globalConfig.config.overlayPosX = response.payload.x;
          this.globalConfig.config.overlayPosY = response.payload.y;
            console.debug('Moving overlay');
        }.bind(this));
      }      
    });
    
    currentWindow.listen('tauri://destroyed', function () {
      console.log('destroyed?');
    }.bind(this));
    
    currentWindow.listen('tauri://close-requested', function () {
      console.log('Close requested with Alt-F4');
      this.closeWindow();
    }.bind(this));
    
    currentWindow.once('tauri://error', function (e) {
     // an error happened creating the webview window
     console.debug(e);
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
        let content = JSON.stringify(doc.rows.map(({doc}) => doc), null, "  ");
        let filename = moment().format('YYYYMMDD-HHmmss')+'-paperbot-backup.json'; 

        dialog.save({
          defaultPath: filename, 
          filters: [{name: '', extensions: ['json']}]
        }).then((path)=>{
          if(path){
            writeFile({'path': path, 'contents': content}).then(()=>{
              console.debug('Database backup file saved!');
            });
          }
        });
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
    }).then(async (path) => {
      if(path != null){
        await invoke('text_reader', { filepath: path }).then((data)=>{
          
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
  

  @action async minimizeWindow(){
    let currentWindow = getCurrent();
    if(currentWindow.label === 'Main'){
      this.globalConfig.config.mainMax = false;
      currentWindow.unmaximize();
      currentWindow.minimize();
      console.debug('Minimized Main.');
    }
    if(currentWindow.label === 'reader'){
      this.globalConfig.config.readerMax = false; 
      currentWindow.unmaximize();
      currentWindow.minimize();
      console.debug('Minimized Reader.');
    }   
  }
  
  @action maximizeWindow(){
    let currentWindow = getCurrent();
    if(currentWindow.label === 'Main'){
      if(this.globalConfig.config.mainMax){
        this.globalConfig.config.mainMax = false; 
        currentWindow.unmaximize();
        console.debug('Unmaximized Main.');      
      } else {
        this.globalConfig.config.mainMax = true;
        currentWindow.maximize();
        if(this.globalConfig.config.hasDirtyAttributes){
          // We save to preserve last unmaximized size;
          this.globalConfig.config.save().then(()=>{
            console.debug('Saved Main size after maximize');
          });
        }
        console.debug('Maximized Main.');
      }
    }
    if(currentWindow.label === 'reader'){
      if(this.globalConfig.config.readerMax){
        this.globalConfig.config.readerMax = false;  
        currentWindow.unmaximize();
        console.debug('Unmaximized Reader.');
      } else {
        this.globalConfig.config.readerMax = true;
        currentWindow.maximize();
        if(this.globalConfig.config.hasDirtyAttributes){
          // We save to preserve last unmaximized size;
          this.globalConfig.config.save().then(()=>{
            console.debug('Saved Reader size after maximize');
          });
        }
        console.debug('Maximized Reader.');
      }   
    }
  }
  
  @action async closeWindow(){
    // Never forget: when you are developing if you reload ember server the relationship between
    // all WebView windows disappears and only the main window gets closed, as it has no children.
    // This also implies that the changes on position and size only get updated and saved for the
    // window that is getting closed as changes are only shared between WebView windows when saved
    // in the local storage.
    
    let currentWindow = getCurrent();
    if(currentWindow.label === 'Main'){      
      let main = await WebviewWindow.getByLabel('Main');
      if(main){
        let maximized = await main.isMaximized();
        let position  = await main.outerPosition();
        let size      = await main.outerSize();        
        this.globalConfig.config.mainMax    = maximized;
        if(!maximized){   // We do this to preserve unmaximized size and position;
          this.globalConfig.config.mainPosX   = position.x;
          this.globalConfig.config.mainPosY   = position.y;
          this.globalConfig.config.mainWidth  = size.width;
          this.globalConfig.config.mainHeight = size.height;
        }
        console.debug('Updated Main position and size in config.');
      }
      
      let reader = await WebviewWindow.getByLabel('reader');
      if(reader){
        let maximized = await reader.isMaximized();
        let position  = await reader.outerPosition();
        let size      = await reader.outerSize();        
        this.globalConfig.config.readerMax    = maximized;
        if(!maximized){   // We do this to preserve unmaximized size and position;
          this.globalConfig.config.readerPosX   = position.x;
          this.globalConfig.config.readerPosY   = position.y;
          this.globalConfig.config.readerWidth  = size.width;
          this.globalConfig.config.readerHeight = size.height;
        }
        console.debug('Updated reader position and size in config.');
      }

      let overlay = await WebviewWindow.getByLabel('overlay');
      if(overlay){
        // let maximized = await overlay.isMaximized();
        let position  = await overlay.outerPosition();
        let size      = await overlay.outerSize();        
        // this.globalConfig.config.overlayMax    = maximized;
        this.globalConfig.config.overlayPosX   = position.x;
        this.globalConfig.config.overlayPosY   = position.y;
        this.globalConfig.config.overlayWidth  = size.width;
        this.globalConfig.config.overlayHeight = size.height;
        console.debug('Updated overlay position and size in config.');
      } 
    }
    await this.globalConfig.config.save().then(async (config)=>{
      console.debug('Saved config. Closing windows');
      later (async function() {
        if(currentWindow.label === 'reader'){
           currentWindow.close();
        } else {
          if(currentWindow.label === 'overlay'){
            currentWindow.close();
          } else {          
            await getAll().forEach(async (item)=>{
                await item.close();
            });
          }
        }
      });
    });
  }
  
  @action dragWindow(){
    let currentWindow = getCurrent();    
    currentWindow.startDragging();
  }  
}