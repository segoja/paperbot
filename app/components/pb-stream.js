import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import {WebviewWindow, WindowOptions, getCurrent} from "@tauri-apps/api/window"

export default class PbStreamComponent extends Component {
  @service twitchChat;
  @service eventsExternal;

  @tracked restore = true;
  
  @action reloadStream(){
    this.restore = false;
    later(() => { this.restore = true; }, 10);    
  }
  
  @action showLyrics(){
    // loading embedded asset:
    const webview = new WebviewWindow('second', {
      url: 'reader',
      title: "Paperbot - Lyrics",
    })

    webview.once('tauri://created', function () {
     // webview window successfully created
     console.log('Pues fufa!');
    })
    webview.once('tauri://error', function (e) {
     // an error happened creating the webview window
     console.log('Pues no fufa!');
    })
    /*
        const id = e.detail;
        const window = getCurrent()
        const position = await window.outerPosition()
        const options: WindowOptions = {
            url: dev ? `http://localhost:4200/reader`,
            title: "Tadaaaaa!!!",
            height: 700,
            width: 1200,
            focus: true,
        }
        new WebviewWindow(label, options)
    */
  }
}
