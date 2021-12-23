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
  get hideMenu(){
    if(this.router.currentURL === '/reader'){
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
      console.log('close!');
    } else {
      console.log('open!');
      // loading embedded asset:
      this.globalConfig.config.showLyrics = true;
      this.globalConfig.config.save().then(()=>{
        this.lyricsViewer = '';
        
        let parentWindow = getCurrent();
        let options = { url: 'reader', title: 'Paperbot Reader', parent: parentWindow, decorations: false, minWidth: 450, minHeight: 600 };
        this.lyricsViewer = new WebviewWindow('second', options);

        this.lyricsViewer.once('tauri://created', function () {
         // webview window successfully created
         console.log('Pues fufa!');
        })
        this.lyricsViewer.once('tauri://error', function (e) {
         // an error happened creating the webview window
         console.log('Pues no fufa!');
         console.log(e);
        });
        this.lyricsViewer.listen('tauri://close-requested', function () {
         // an error happened creating the webview window
          this.globalConfig.config.showLyrics = false;
          this.globalConfig.config.save();
          console.log('Pues se cierra!');
        }.bind(this));
      });
    }
  } 
}