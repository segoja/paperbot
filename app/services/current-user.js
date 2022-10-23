import Service, { inject as service } from '@ember/service';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { WebviewWindow, getCurrent, getAll } from "@tauri-apps/api/window"
import { fs } from "@tauri-apps/api";

export default class CurrentUserService extends Service {
  @service globalConfig;
  @service router;
  @tracked isViewing = false;
  @tracked isEditing = false;
  @tracked expandMenu = false;
  @tracked expandSubmenu = false;
  @tracked songqueue = [];
  @tracked showSetlist = false;
  @tracked lastStream = '';
    
  // Buttons
  @tracked queueToFile = false;
  @tracked updateQueueOverlay = false;
  @tracked soundBoardEnabled = false;  

  @tracked lyricsWindow = '';
  @tracked overlayWindow = '';  
  get hideMenu(){
    if(this.router.currentURL === '/reader' || this.router.currentURL === '/overlay' ){
      return true;
    }
    return false;
  }
  
  @action showLyrics(){
    let readerWindow = '';
    let currentWindow = getCurrent();

    getAll().forEach((windowItem)=>{  
      if(windowItem.label === 'reader'){
        readerWindow = windowItem;
      }
    });
    
    if(readerWindow === '' && currentWindow.label != 'overlay' && currentWindow.label != 'reader'){
      let options = { 
        url: 'reader',
        label: 'reader', 
        title: 'Paperbot - Lyrics',
        // parent: currentWindow,
        decorations: false,
        minWidth: 450,
        minHeight: 600,
        maximized: this.globalConfig.config.readerMax,
        width: Number(this.globalConfig.config.readerWidth), 
        height: Number(this.globalConfig.config.readerHeight),
        x: Number(this.globalConfig.config.readerPosX),
        y: Number(this.globalConfig.config.readerPosY)
      };
      readerWindow = new WebviewWindow('reader', options);

      readerWindow.once('tauri://window-created', function () {
       // webview window successfully created
       console.debug('Reader ready!')
      })
    
    } else {
      // readerWindow.close();
    }
  }
  
  @action toggleOverlay(){
    let overlayWindow = '';
    let currentWindow = getCurrent();

    getAll().forEach((windowItem)=>{  
      if(windowItem.label === 'overlay'){
        overlayWindow = windowItem;
      }
    });
    if(overlayWindow === '' && currentWindow.label != 'overlay' && currentWindow.label != 'reader'){
      let options = { 
        url: 'overlay', 
        label: 'overlay',  
        title: 'Paperbot - Overlay', 
        // parent: currentWindow, 
        decorations: false, 
        minWidth: 312, 
        minHeight: 103, 
        width: Number(this.globalConfig.config.overlayWidth), 
        height: Number(this.globalConfig.config.overlayHeight),
        x: Number(this.globalConfig.config.overlayPosX),
        y: Number(this.globalConfig.config.overlayPosY)
      };
      overlayWindow = new WebviewWindow('overlay', options);

      overlayWindow.once('tauri://window-created', function () {
       // webview window successfully created
       console.debug('Overlay ready!')
      });
    } else {
      // overlayWindow.close();
    }
  }
}