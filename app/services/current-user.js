import Service from '@ember/service';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { WebviewWindow, getCurrent } from "@tauri-apps/api/window"

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
    if(this.lyricsViewer != ''){
      this.lyricsViewer.close();
      this.lyricsViewer = '';
    } else {
      // loading embedded asset:
      this.lyricsViewer = '';
      let parentWindow = getCurrent();
      let options = { url: 'reader', title: "Paperbot - Lyrics", parent: parentWindow };
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
        console.log('Pues se cierra!');
      }.bind(this));      
    }    
  }  
}