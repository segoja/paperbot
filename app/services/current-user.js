import Service, { inject as service } from '@ember/service';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { WebviewWindow, getCurrent } from "@tauri-apps/api/window"
import { fs } from "@tauri-apps/api";

export default class CurrentUserService extends Service {
  @service globalConfig;
  @service router;
  @tracked isViewing = false;
  @tracked expandMenu = false;
  @tracked expandSubmenu = false;
  @tracked songqueue = []; 
  @tracked lastStream = '';
    
  // Buttons
  @tracked queueToFile = false;
  @tracked soundBoardEnabled = false;  

  @tracked lyricsViewer = '';
  @tracked overlayWindow = '';  
  get hideMenu(){
    if(this.router.currentURL === '/reader' || this.router.currentURL === '/overlay' ){
      return true;
    }
    return false;
  }
  
  @action showLyrics(){
    if(this.globalConfig.config.showLyrics && this.lyricsViewer != ''){
      this.globalConfig.config.showLyrics = false;
      this.globalConfig.config.save().then(()=>{
        this.lyricsViewer.close();
        this.lyricsViewer = '';
      });
      console.debug('close!');
    } else {
      console.debug('open!');
      // loading embedded asset:
      this.globalConfig.config.showLyrics = true;
      this.globalConfig.config.save().then(()=>{
        this.lyricsViewer = '';
        
        let parentWindow = getCurrent();
        let options = { url: 'reader', label: 'reader', title: 'Paperbot - Lyrics', parent: parentWindow, decorations: false, minWidth: 450, minHeight: 600 };
        this.lyricsViewer = new WebviewWindow('reader', options);

        this.lyricsViewer.once('tauri://created', function () {
         // webview window successfully created
        })
        this.lyricsViewer.once('tauri://error', function (e) {
         // an error happened creating the webview window
         console.debug(e);
        });
        this.lyricsViewer.listen('tauri://close-requested', function () {
         // an error happened creating the webview window
          this.globalConfig.config.showLyrics = false;
          this.globalConfig.config.save();
        }.bind(this));
      });
    }
  }
  
  @action toggleOverlay(){
    if(this.globalConfig.config.showOverlay && this.overlayWindow != ''){
      this.globalConfig.config.showOverlay = false;
      this.globalConfig.config.save().then(()=>{
        this.overlayWindow.close();
        this.overlayWindow = '';
      });
      console.debug('close!');
    } else {
      console.debug('open!');
      // loading embedded asset:
      this.globalConfig.config.showOverlay = true;
      this.globalConfig.config.save().then(()=>{
        this.overlayWindow = '';
        
        let parentWindow = getCurrent();
        let options = { url: 'overlay', label: 'overlay',  title: 'Paperbot - Overlay', parent: parentWindow, decorations: false, minWidth: 550, minHeight: 250 };
        this.overlayWindow = new WebviewWindow('overlay', options);

        this.overlayWindow.once('tauri://created', function () {
         // webview window successfully created
        })
        this.overlayWindow.once('tauri://error', function (e) {
         // an error happened creating the webview window
         console.debug(e);
        });
        this.overlayWindow.listen('tauri://close-requested', function () {
         // an error happened creating the webview window
          this.globalConfig.config.showOverlay = false;
          this.globalConfig.config.save();
        }.bind(this));
      });
    }
  } 
}