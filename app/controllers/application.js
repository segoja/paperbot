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
  @tracked minimized = false;
  
  // We load the existing config or create a new one.  
  constructor() {
    super(...arguments);
    let currentWindow = getCurrent();
    this.minimized = false;
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
            //if(this.globalConfig.config.mainPosX === 0 && this.globalConfig.config.mainPosY === 0){
            let position = new PhysicalPosition (this.globalConfig.config.mainPosX, this.globalConfig.config.mainPosY);
            currentWindow.setPosition(position);
            //}
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
          if(!this.globalConfig.config.mainMax && !this.minimized){
            this.globalConfig.config.mainWidth = response.payload.width; 
            this.globalConfig.config.mainHeight = response.payload.height;
            console.debug('Resizing Main');
          }
        }.bind(this));
        
        currentWindow.listen('tauri://move', async function (response) { 
          if(!this.globalConfig.config.mainMax && !this.minimized){
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
          if(!this.globalConfig.config.readerMax && !this.minimized){        
            this.globalConfig.config.readerWidth = response.payload.width; 
            this.globalConfig.config.readerHeight = response.payload.height;
            console.debug('Resizing reader');
          }
        }.bind(this));
        
        currentWindow.listen('tauri://move', async function (response) { 
          if(!this.globalConfig.config.readerMax && !this.minimized){
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
          if(!this.minimized){      
            this.globalConfig.config.overlayWidth = response.payload.width; 
            this.globalConfig.config.overlayHeight = response.payload.height;
            console.debug('Resizing overlay');
          }
        }.bind(this));
        
        currentWindow.listen('tauri://move', async function (response) {
          if(!this.minimized){      
            this.globalConfig.config.overlayPosX = response.payload.x;
            this.globalConfig.config.overlayPosY = response.payload.y;
            console.debug('Moving overlay');
          }
        }.bind(this));
      }      
    });
    
    currentWindow.listen('tauri://destroyed', function () {
      console.debug('destroyed?');
    }.bind(this));
    
    currentWindow.listen('tauri://close-requested', function () {
      console.debug('Close requested with Alt-F4');
      this.closeWindow();
    }.bind(this));
   
    currentWindow.listen('tauri://focus', function () {
      if(this.minimized){
        this.minimized = false;
        console.debug('Unminimizing...');
      }
    }.bind(this));   
    
    
    currentWindow.once('tauri://error', function (e) {
     // an error happened creating the webview window
     console.debug(e);
    });
    
    appWindow.listen('tauri://blur', ({ event, payload }) => {
      //console.debug(payload);
      //console.debug(event);
      console.debug('Blurring window...');
    });
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
    this.minimized = true;
    
    if(currentWindow.label === 'Main'){
      if(!this.globalConfig.config.mainMax){
        this.globalConfig.config.save().then(()=>{
          console.debug("Saved Main size before minimize when wasn't maximized");
          currentWindow.minimize();
          console.debug('Main Minimized.');
        });        
      } else {
        currentWindow.minimize();
        console.debug('Main Minimized.');        
      }
    }
    if(currentWindow.label === 'reader'){
      if(!this.globalConfig.config.readerMax){
        this.globalConfig.config.save().then(()=>{
          console.debug("Saved Reader size before minimize when wasn't maximized");
          currentWindow.minimize();
          console.debug('Reader Minimized.');
        });
      } else {
        currentWindow.minimize();
        console.debug('Reader Minimized.');
      }
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
        console.debug('Maximized Main.');
      }
      if(this.globalConfig.config.hasDirtyAttributes){
        // We save to preserve last unmaximized size;
        this.globalConfig.config.save().then(()=>{
          console.debug('Saved Main size after maximize');
        });
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
        console.debug('Maximized Reader.');
      }
      if(this.globalConfig.config.hasDirtyAttributes){
        // We save to preserve last unmaximized size;
        this.globalConfig.config.save().then(()=>{
          console.debug('Saved Reader size after maximize');
        });
      }   
    }
  }
  
  @action async closeWindow(){
    // Never forget: when you are developing if you reload ember server the relationship between
    // all WebView windows disappears and only the main window gets closed, as it has no children.
    // This also implies that the changes on position and size only get updated and saved for the
    // window that is getting closed as changes are only shared between WebView windows when saved
    // in the local storage.
    this.store.findAll('config').then(async()=>{      
      let currentconfig = this.store.peekRecord('config','myconfig');
      
      if (currentconfig){
        let currentWindow = getCurrent();
        if(currentWindow.label === 'Main'){      
          let main = await WebviewWindow.getByLabel('Main');
          console.log(main);
          if(main){
            let maximized = await main.isMaximized();
            let minimized = await !main.isVisible();
            let position  = await main.outerPosition();
            let size      = await main.outerSize();
            // currentconfig.mainMax = currentconfig.mainMax ? currentconfig.mainMax : maximized;
            //if(!maximized && !this.minimized){   // We do this to preserve unmaximized size and position;
              // We do this to prevent saving positions off the screen when minimized
              if(!minimized || !currentconfig.mainMax){
                currentconfig.mainPosX   = position.x;
                currentconfig.mainPosY   = position.y;
                currentconfig.mainWidth  = size.width;
                currentconfig.mainHeight = size.height;
              }
              console.debug('Updated Main position and size in config.');
            //}            
          }          
        }  
        
        if(currentWindow.label === 'Main' || currentWindow.label === 'reader'){   
          let reader = await WebviewWindow.getByLabel('reader');
          if(reader){
            let maximized = await reader.isMaximized();
            let minimized = await !reader.isVisible();
            let position  = await reader.outerPosition();
            let size      = await reader.outerSize();
            // currentconfig.readerMax = currentconfig.readerMax ? currentconfig.readerMax : maximized;
            // if(!maximized && !this.minimized && !minimized){   // We do this to preserve unmaximized size and position;
              // We do this to prevent saving positions off the screen when minimized
              if(!minimized || !currentconfig.readerMax){
                currentconfig.readerPosX   = position.x;
                currentconfig.readerPosY   = position.y;
                currentconfig.readerWidth  = size.width;
                currentconfig.readerHeight = size.height;
              }
              console.debug('Updated reader position and size in config.');
            // }
          }
        }
            
        if(currentWindow.label === 'Main' || currentWindow.label === 'overlay'){ 
          let overlay = await WebviewWindow.getByLabel('overlay');
          if(overlay){
            // let maximized = await overlay.isMaximized();
            let minimized = await !overlay.isVisible();
            let position  = await overlay.outerPosition();
            let size      = await overlay.outerSize();
            // currentconfig.overlayMax    = maximized;
            if(!minimized){ // We do this to prevent saving positions off the screen when minimized
              currentconfig.overlayPosX   = position.x;
              currentconfig.overlayPosY   = position.y;
              currentconfig.overlayWidth  = size.width;
              currentconfig.overlayHeight = size.height;
              console.debug('Updated overlay position and size in config.');
            }
            
          } 
        }
      
        later(this, async () => {
          await currentconfig.save().then(async (config)=>{
            console.debug('Saved config. Closing windows');
            if(currentWindow.label === 'reader'){
               await currentWindow.close();
            } else {
              if(currentWindow.label === 'overlay'){
                await currentWindow.close();
              } else {          
                await getAll().forEach(async (item)=>{
                    await item.close();
                });
              }
            }
          });
        }, 250);
      }
    });
  }
  
  @action dragWindow(){
    let currentWindow = getCurrent();    
    currentWindow.startDragging();
  }  
}