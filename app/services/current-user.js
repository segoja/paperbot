import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { WebviewWindow, getCurrent, getAll } from '@tauri-apps/api/window';
import { alias } from '@ember/object/computed';
import { fs, dialog, invoke } from '@tauri-apps/api';
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

    /*if(this.isTauri){
      dialog.open({
        directory: false,
        filters: [{name: extension+" file", extensions: [extension]}]
      }).then(async (path) => {
        if(path != null){
          await invoke('text_reader', { filepath: path }).then((textData)=>{
            let rows = PapaParse.parse(textData,{ delimiter: ',', header: true, quotes: false, quoteChar: '"', skipEmptyLines: true }).data;
            let csvfields = textData.split('\r\n').slice(0,1);
            
            // We check if the structure is the same.
            if (csvfields.toString() === reference){
              let importcontent = rows;              
              importcontent.forEach((item)=>{
                let newRecord = this.store.createRecord(recordType);
                
                // We iterate through properties to set them in the new record.
                properties.forEach((property)=>{
                  newRecord.set(property, item[property]);                  
                });                
                newRecord.save();
              });      
            } else {
              alert("Wrong column structure in the import csv file.");
            }
          });
        }
      });
    } else {*/
    if (response) {
      let rows = PapaParse.parse(response, {
        delimiter: ',',
        header: true,
        quotes: false,
        quoteChar: '"',
        skipEmptyLines: true,
      }).data;
      let csvfields = response.split('\r\n').slice(0, 1);

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

  @action async showLyrics() {
    if (this.isTauri) {
      let readerWindow = '';
      let currentWindow = getCurrent();
      let parentWindow = await WebviewWindow.getByLabel('Main');

      getAll().forEach((windowItem) => {
        if (windowItem.label === 'reader') {
          readerWindow = windowItem;
        }
      });

      if (
        readerWindow === '' &&
        currentWindow.label != 'overlay' &&
        currentWindow.label != 'reader'
      ) {
        let options = {
          url: 'reader',
          label: 'reader',
          title: 'Paperbot - Lyrics',
          /* parent: currentWindow, */
          decorations: false,
          minWidth: 450,
          minHeight: 600,
          maximized: this.globalConfig.config.readerMax,
          width: Number(this.globalConfig.config.readerWidth),
          height: Number(this.globalConfig.config.readerHeight),
          x: Number(this.globalConfig.config.readerPosX),
          y: Number(this.globalConfig.config.readerPosY),
        };
        readerWindow = new WebviewWindow('reader', options);

        readerWindow.once('tauri://window-created', function () {
          // webview window successfully created
          console.debug('Reader ready!');
        });
      } else {
        // readerWindow.close();
      }
    }
  }

  @action async toggleOverlay() {
    if (this.isTauri) {
      let overlayWindow = '';
      let currentWindow = getCurrent();
      let parentWindow = await WebviewWindow.getByLabel('Main');
      getAll().forEach((windowItem) => {
        if (windowItem.label === 'overlay') {
          overlayWindow = windowItem;
        }
      });
      if (
        overlayWindow === '' &&
        currentWindow.label != 'overlay' &&
        currentWindow.label != 'reader'
      ) {
        let options = {
          url: 'overlay',
          label: 'overlay',
          title: 'Paperbot - Overlay',
          /* parent:  currentWindow, */
          decorations: false,
          minWidth: 312,
          minHeight: 103,
          width: Number(this.globalConfig.config.overlayWidth),
          height: Number(this.globalConfig.config.overlayHeight),
          x: Number(this.globalConfig.config.overlayPosX),
          y: Number(this.globalConfig.config.overlayPosY),
        };
        overlayWindow = new WebviewWindow('overlay', options);

        overlayWindow.once('tauri://window-created', function () {
          // webview window successfully created
          console.debug('Overlay ready!');
        });
      } else {
        // overlayWindow.close();
      }
    }
  }
}
