import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { WebviewWindow, getCurrent, getAll } from '@tauri-apps/api/window';
import { alias } from '@ember/object/computed';
import { dialog, invoke } from '@tauri-apps/api';
import PapaParse from 'papaparse';

export default class CurrentUserService extends Service {
  @service globalConfig;
  @service session;
  @service router;
  @service store;

  @alias('session.isAuthenticated') isAuthenticated;
  @alias('session.data.authenticated.name') username;
  @alias('session.data.authenticated.roles') roles;

  @tracked isTauri = false;
  @tracked isViewing = false;
  @tracked isEditing = false;
  @tracked expandMenu = false;
  @tracked expandSubmenu = false;
  @tracked songqueue = [];
  @tracked showSetlist = false;
  @tracked showPlayed = false;
  @tracked lastStream = '';

  @tracked currentConfig = '';

  @tracked online = false;
  @tracked allowed = false;

  // Buttons
  @tracked queueToFile = false;
  @tracked updateQueueOverlay = false;
  @tracked soundBoardEnabled = false;

  @tracked lyricsWindow = '';
  @tracked overlayWindow = '';
  get hideMenu() {
    if (this.isTauri) {
      if (
        this.router.currentURL === '/reader' ||
        this.router.currentURL === '/overlay'
      ) {
        return true;
      }
    } else {
      if (this.router.currentURL === '/overlay') {
        return true;
      }
    }
    return false;
  }

  @action importRecords(reference, extension, recordType, response) {
    // We make an array of properties from the reference header:
    let properties = reference.replace(/"/g, '');
    properties = properties.split(',');

    if (response) {
      let rows = PapaParse.parse(response, {
        delimiter: ',',
        header: true,
        quotes: false,
        quoteChar: '"',
        skipEmptyLines: true,
        dynamicTyping: true,
      }).data;
      let csvfields = response.split('\r\n').slice(0, 1);
      console.debug(rows);
      // We check if the structure is the same.
      if (csvfields.toString() === reference) {
        let importcontent = rows;
        importcontent.forEach((item) => {
          let newRecord = this.store.createRecord(recordType);

          // We iterate through properties to set them in the new record.
          properties.forEach((property) => {
            newRecord.set(property, item[property]);
          });
          newRecord.save();
        });
      } else {
        alert('Wrong column structure in the import ' + extension + ' file.');
      }
    }
    // }
  }

  // Function to download data to a file
  @action download(data, filename, type) {
    let extension = '';
    if (type === 'text/csv') {
      extension = 'csv';
    }
    if (type === 'application/json') {
      extension = 'json';
    }

    if (this.isTauri) {
      dialog
        .save({
          defaultPath: filename,
          filters: [{ name: '', extensions: [extension] }],
        })
        .then(async (path) => {
          if (path) {
            await invoke('file_writer', {
              filepath: path,
              filecontent: data,
            }).then(() => {
              console.debug('Commands export ' + type + ' file saved!');
            });
          }
        });
    } else {
      var file = new Blob([data], { type: type });
      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(file, filename);
      } else {
        // Others
        let a = document.createElement('a');
        let url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 0);
      }
    }
  }
  
  
  @tracked creatingReader = false;
  @action async showLyrics() {
    if (this.isTauri && !this.creatingReader) {
      console.debug('Creating reader window...');
      let readerWindow = '';
      let currentWindow = await getCurrent();
 
      readerWindow = WebviewWindow.getByLabel('reader');
      console.debug('readerWindow', readerWindow);

      if (
        readerWindow == null && 
        !this.creatingReader &&
        currentWindow.label == 'Main'
      ) {
        let options = {
          url: 'reader',
          title: 'Paperbot - Reader',
          decorations: false,
          minWidth: 450,
          minHeight: 600,
          maximized: this.globalConfig.config.readerMax,
          width: Number(this.globalConfig.config.readerWidth),
          height: Number(this.globalConfig.config.readerHeight),
          x: Number(this.globalConfig.config.readerPosX),
          y: Number(this.globalConfig.config.readerPosY),
        };
        console.debug('Creating reader window...');
        this.creatingReader = true;        
        readerWindow = new WebviewWindow('reader', options);
        if(await readerWindow){
          // webview window successfully created
          console.debug('Reader ready!',readerWindow);
          this.creatingReader = false;          
        }        
        // readerWindow.once('tauri://created', function () {});
      } else {
        console.debug('Reader already open, closing!');
        this.creatingReader = false;
        if(readerWindow){
          readerWindow.close();
        } else {
          console.debug('No Reader to close...');          
        }
      }
    } else {
      console.debug('It\'s not tauri or it\'s already creating the Reader window...');          
    }
  }  
  
  @tracked creatingOverlay = false;
  @action async toggleOverlay() {
    if (this.isTauri && !this.creatingOverlay) {
      console.debug('Creating overlay window...');
      let overlayWindow = '';
      let currentWindow = await getCurrent();

      overlayWindow = WebviewWindow.getByLabel('overlay');
      console.debug('overlayWindow', overlayWindow);
      
      if (
        overlayWindow == null && 
        !this.creatingOverlay &&
        currentWindow.label == 'Main'
      ) {
        let options = {
          url: 'overlay',
          title: 'Paperbot - Overlay',
          decorations: false,
          minWidth: 312,
          minHeight: 103,
          width: Number(this.globalConfig.config.overlayWidth),
          height: Number(this.globalConfig.config.overlayHeight),
          x: Number(this.globalConfig.config.overlayPosX),
          y: Number(this.globalConfig.config.overlayPosY),
        };
        
        this.creatingOverlay = true;
        overlayWindow = new WebviewWindow('overlay', options);
        if(await overlayWindow){
          // webview window successfully created
          console.debug('Overlay ready!', overlayWindow);
          this.creatingOverlay = false; 
        }
        // overlayWindow.once('tauri://created', function () {});
      } else {
        console.debug('Overlay already open, closing!');
        this.creatingOverlay = false;
        if(overlayWindow){
          overlayWindow.close();
        } else {
          console.debug('No Overlay to close...');          
        }
      }
    } else {
      console.debug('It\'s not tauri or it\'s already creating the Overlay window...');          
    }
  }
}
