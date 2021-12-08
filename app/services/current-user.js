import Service from '@ember/service';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { WebviewWindow, appWindow } from "@tauri-apps/api/window"

export default class CurrentUserService extends Service {
  @tracked isViewing = false;
  @tracked expandMenu = false;
  @tracked expandSubmenu = false;
  @tracked songqueue = []; 
  @tracked lastStream = '';
    
  // Buttons
  @tracked queueToFile = false;
  @tracked soundBoardEnabled = false;  
  
  // Pannels
  @tracked cpanpending = false;
  @tracked cpanplayed = false;
  @tracked cpanmessages = false;
  @tracked cpanevents = false;  
  @tracked extraPanRight = true;
  @tracked extraPanRightTop = true;
  @tracked extraPanRightBottom = true;  
  @tracked extraPanLeft = true;  
  @tracked extraPanLeftTop = true;  
  @tracked extraPanLeftBottom = true;

  get noPanels(){
    if(!this.extraPanLeft && !this.extraPanRight){
      return true;
    } else {
      return false;
    }
  }

  @tracked isReader = false;
  @tracked lyricsViewer = '';
  get hideMenu(){
    if(this.isReader){
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
      let options = { url: 'reader', title: "Paperbot - Lyrics" };
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