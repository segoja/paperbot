import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import moment from 'moment';
import { dialog } from "@tauri-apps/api";
import { readTextFile } from '@tauri-apps/api/fs';
import { appWindow, getCurrent, getAll } from '@tauri-apps/api/window';
import { tracked } from '@glimmer/tracking';

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
    
    this.store.findAll('config').then(()=>{
      let currentconfig = this.store.peekRecord('config','myconfig');
      if (currentconfig){
        console.debug("Config found! Loading...");
        this.lightControl.toggleMode(currentconfig.darkmode);
        this.globalConfig.config = currentconfig;
        if(this.globalConfig.config.externalevents &&  this.globalConfig.config.externaleventskey){
          this.eventsExternal.token = this.globalConfig.config.externaleventskey;
          this.eventsExternal.type = this.globalConfig.config.externalevents;
        }
        let currentWindow = getCurrent();
        if(this.globalConfig.config.showOverlay && currentWindow.label === 'Main'){
          this.currentUser.toggleOverlay();
        }
        this.globalConfig.showFirstRun = false;
      } else{
        this.store.createRecord('config',{id: 'myconfig'}).save().then((newconfig)=>{
          console.debug("Config not found! New config created...");
          this.globalConfig.config = newconfig;
          this.globalConfig.showFirstRun = true;
        }).catch(()=>{
          console.debug("Error creating config!");
        })
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
    appWindow.minimize();
  }
  
  @action maximizeWindow(){
    appWindow.minimize();    
    appWindow.toggleMaximize();
  }
  
  @action closeWindow(){
    if(this.isLyrics){
      this.globalConfig.config.showLyrics = false;
      this.globalConfig.config.save().then(()=>{
        appWindow.close();
      });
    } else {
      if(this.isOverlay){
        this.globalConfig.config.showOverlay = false;
        this.currentUser.queueToFile = false;
        this.globalConfig.config.save().then(()=>{
          appWindow.close();
        });
      } else {
        getAll().forEach((item)=>{ item.close(); });        
      }
    }
  }
  
  @action dragWindow(){
    appWindow.startDragging();
  }  
}
