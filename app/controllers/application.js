import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import moment from 'moment';
import {
  appWindow,
  getCurrent,
  getAll,
  PhysicalPosition,
  PhysicalSize,
  WebviewWindow,
} from '@tauri-apps/api/window';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { TrackedArray } from 'tracked-built-ins';
import { resolve } from 'rsvp';

export default class ApplicationController extends Controller {
  @service cloudState;
  @service currentUser;
  @service audio;
  @service store;
  @service session;
  @service router;
  @service globalConfig;
  @service lightControl;
  @service eventsExternal;
  @service twitchChat;
  @service queueHandler;

  @tracked collapsed = true;
  @tracked minimized = false;

  // We load the existing config or create a new one.
  constructor() {
    super(...arguments);

    if (window.__TAURI_IPC__) {
      this.currentUser.isTauri = true;
      console.debug('Running in Tauri environment.');
    } else {
      this.currentUser.isTauri = false;
      console.debug('Running in the browser.');
    }

    if (this.currentUser.isTauri) {
      this.minimized = false;
    }
    // We wipe requests on every app start;

    this.store.findAll('config').then(async () => {
      let currentconfig = this.store.peekRecord('config', 'ppbconfig');
      if (currentconfig) {
        this.globalConfig.showFirstRun = false;
        console.debug('Config found! Loading...');
        this.globalConfig.config = currentconfig;
        // this.lightControl.toggleMode(this.globalConfig.config);

        if (
          this.globalConfig.config.externalevents &&
          this.globalConfig.config.externaleventskey
        ) {
          this.eventsExternal.token =
            this.globalConfig.config.externaleventskey;
          this.eventsExternal.type = this.globalConfig.config.externalevents;
        }

        if (this.globalConfig.config.canConnect) {
          await this.store
            .adapterFor('application')
            .configRemote()
            .then(async () => {
              await this.store
                .adapterFor('application')
                .connectRemote()
                .then(async () => {
                  if (this.currentUser.isTauri) {
                    let currentWindow = getCurrent();
                    if (currentWindow.label === 'Main') {
                      //if(!this.globalConfig.config.mainMax){
                      //if(this.globalConfig.config.mainPosX === 0 && this.globalConfig.config.mainPosY === 0){
                      let position = new PhysicalPosition(
                        this.globalConfig.config.mainPosX,
                        this.globalConfig.config.mainPosY
                      );
                      currentWindow.setPosition(position);
                      //}
                      let size = new PhysicalSize(
                        this.globalConfig.config.mainWidth,
                        this.globalConfig.config.mainHeight
                      );
                      currentWindow.setSize(size);
                      //}
                      if (
                        this.globalConfig.config.showOverlay &&
                        this.globalConfig.config.overlayType === 'window'
                      ) {
                        this.currentUser.toggleOverlay();
                      }
                      if (this.globalConfig.config.showLyrics) {
                        this.currentUser.showLyrics();
                      }
                    }
                  }
                });
            });
        } else {
          if (this.currentUser.isTauri) {
            let currentWindow = getCurrent();
            if (currentWindow.label === 'Main') {
              //if(!this.globalConfig.config.mainMax){
              //if(this.globalConfig.config.mainPosX === 0 && this.globalConfig.config.mainPosY === 0){
              let position = new PhysicalPosition(
                this.globalConfig.config.mainPosX,
                this.globalConfig.config.mainPosY
              );
              currentWindow.setPosition(position);
              //}
              let size = new PhysicalSize(
                this.globalConfig.config.mainWidth,
                this.globalConfig.config.mainHeight
              );
              currentWindow.setSize(size);
              //}
              if (
                this.globalConfig.config.showOverlay &&
                this.globalConfig.config.overlayType === 'window'
              ) {
                this.currentUser.toggleOverlay();
              }
              if (this.globalConfig.config.showLyrics) {
                this.currentUser.showLyrics();
              }
            }
          }
        }
      } else {
        this.store
          .createRecord('config', { id: 'ppbconfig' })
          .save()
          .then((newconfig) => {
            console.debug('Config not found! New config created...');
            this.globalConfig.config = newconfig;
            this.globalConfig.showFirstRun = true;
          })
          .catch(() => {
            console.debug('Error creating config!');
          });
      }
      if (this.currentUser.isTauri) {
        let currentWindow = getCurrent();
        if (currentWindow.label === 'Main') {
          currentWindow.listen(
            'tauri://focus',
            function () {}.bind(this)
          );

          currentWindow.listen(
            'tauri://resize',
            async function (response) {
              if (!this.globalConfig.config.mainMax && !this.minimized) {
                this.globalConfig.config.mainWidth = response.payload.width;
                this.globalConfig.config.mainHeight = response.payload.height;
                // console.debug('Resizing Main');
              }
            }.bind(this)
          );

          currentWindow.listen(
            'tauri://move',
            async function (response) {
              if (!this.globalConfig.config.mainMax && !this.minimized) {
                this.globalConfig.config.mainPosX = response.payload.x;
                this.globalConfig.config.mainPosY = response.payload.y;
                // console.debug('Moving Main');
              }
            }.bind(this)
          );

          if (this.globalConfig.config.mainMax) {
            currentWindow.maximize();
          }
        }

        if (currentWindow.label === 'reader') {
          currentWindow.listen(
            'tauri://resize',
            async function (response) {
              if (!this.globalConfig.config.readerMax && !this.minimized) {
                this.globalConfig.config.readerWidth = response.payload.width;
                this.globalConfig.config.readerHeight = response.payload.height;
                // console.debug('Resizing reader');
              }
            }.bind(this)
          );

          currentWindow.listen(
            'tauri://move',
            async function (response) {
              if (!this.globalConfig.config.readerMax && !this.minimized) {
                this.globalConfig.config.readerPosX = response.payload.x;
                this.globalConfig.config.readerPosY = response.payload.y;
                // console.debug('Moving reader');
              }
            }.bind(this)
          );

          if (this.globalConfig.config.readerMax) {
            currentWindow.maximize();
          }
        }

        if (currentWindow.label === 'overlay') {
          currentWindow.listen(
            'tauri://resize',
            async function (response) {
              if (!this.minimized) {
                this.globalConfig.config.overlayWidth = response.payload.width;
                this.globalConfig.config.overlayHeight =
                  response.payload.height;
                // console.debug('Resizing overlay');
              }
            }.bind(this)
          );

          currentWindow.listen(
            'tauri://move',
            async function (response) {
              if (!this.minimized) {
                this.globalConfig.config.overlayPosX = response.payload.x;
                this.globalConfig.config.overlayPosY = response.payload.y;
                // console.debug('Moving overlay');
              }
            }.bind(this)
          );
        }
      }
    });

    if (this.currentUser.isTauri) {
      let currentWindow = getCurrent();
      currentWindow.listen(
        'tauri://destroyed',
        function () {
          console.debug('destroyed?');
        }.bind(this)
      );

      currentWindow.listen(
        'tauri://close-requested',
        function () {
          console.debug('Close requested with Alt-F4');
          this.closeWindow();
        }.bind(this)
      );

      currentWindow.listen(
        'tauri://focus',
        function () {
          if (this.minimized) {
            this.minimized = false;
            console.debug('Unminimizing...');
          }
        }.bind(this)
      );

      currentWindow.once('tauri://error', function (e) {
        // an error happened creating the webview window
        console.debug(e);
      });

      appWindow.listen('tauri://blur', () => {
        console.debug('Blurring window...');
        //if(this.globalConfig.config.hasDirtyAttributes){
        this.globalConfig.config.save().then(() => {
          console.debug('Saved config on window blurring');
        });
        //}
      });
    }
  }

  get serverStatus() {
    let isOnline = false;
    fetch('http://paper.bot', { mode: 'no-cors' }).then(
      async () => {
        console.debug('Server is connected.');
        isOnline = true;
      },
      () => {
        console.debug('Server is not connected.');
        isOnline = false;
      }
    );
    return isOnline;
  }

  get isLyrics() {
    if (this.router.currentURL === '/reader') {
      //if(this.router.location === 'reader'){
      return true;
    }
    return false;
  }

  get isOverlay() {
    if (this.router.currentURL === '/overlay') {
      return true;
    }
    return false;
  }

  get isMain() {
    if (!this.isOverlay && !this.isLyrics) {
      return true;
    }
    return false;
  }

  get showSettings() {
    if (this.currentUser.isTauri) {
      if (this.isOverlay) {
        return false;
      }
      if (this.isLyrics) {
        return false;
      }
      return true;
    } else {
      return true;
    }
  }

  get isWinOverlayAllowed() {
    if (
      this.globalConfig.config.overlayType === 'window' ||
      this.globalConfig.config.overlayType === 'disabled' ||
      !this.globalConfig.config.overlayType
    ) {
      return true;
    }
    return false;
  }


  @action updateCommandList(){
    if(this.commands.length > 0){
      this.twitchChat.commands = new TrackedArray(this.commands);
      console.debug('Commands array changed');
      // console.log(this.twitchChat.commands);
    }
  }

  @action updateTimerList(){
    if(this.timers.length > 0){
      this.twitchChat.timers = new TrackedArray(this.timers);
      console.debug('Timers array changed');
      if(this.twitchChat.botConnected){
        console.debug('Updating active bot timers');
        this.twitchChat.timersLauncher();
      }
      // console.log(this.twitchChat.commands);
    }
  }
  
  @action updateSongList(){
    if(this.songs.length > 0){
      this.queueHandler.songs = new TrackedArray(this.songs);
      console.debug('Songs array changed');
      // console.log(this.queueHandler.songs);
    }
  }
  
  @action updateRequestList(){
    if(this.requests.length > 0){
      this.queueHandler.requests = new TrackedArray(this.requests);
      console.debug('Request array changed');
    }
  }

  @action handleExport() {
    let filename = moment().format('YYYYMMDD-HHmmss') + '-paperbot-backup.json';
    let type = 'application/json';
    let adapter = this.store.adapterFor('application');
    adapter.db.allDocs(
      { include_docs: true, attachments: true },
      (error, doc) => {
        if (error) {
          console.error(error);
        } else {
          let data = JSON.stringify(
            doc.rows.map(({ doc }) => doc),
            null,
            '  '
          );
          this.currentUser.download(data, filename, type);
        }
      }
    );
  }

  @action async handleImport(file) {
    if (file) {
      const response = await file.readAsText();
      let adapter = this.store.adapterFor('application');
      let importable = Object.assign([], JSON.parse(response));
      console.debug(importable);
      // importable.shift();
      /*adapter.db.bulkDocs(importable, {new_edits: false}, (...args) => {
        console.debug('DONE', args);
        //window.location.reload(true);
      });*/

      adapter.db
        .bulkDocs(importable, { new_edits: false })
        .then(function () {
          console.debug('Success!');
          window.location.reload(true);
        })
        .catch(function () {
          console.debug('FAIL!');
        });
    }
  }

  @action wipeDatabase() {
    if (this.currentUser.isTauri) {
      getAll().forEach((item) => {
        if (item.label != 'Main') {
          item.close();
        }
      });
    }
    var adapter = this.store.adapterFor('application');
    adapter.wipeDatabase().then(() => {
      console.debug('The database has been wiped.');
      window.location.reload(true);
    });
  }

  @action rollBackSettings() {
    this.globalConfig.config.rollbackAttributes();
  }

  @action saveSettings() {
    return this.globalConfig.config.save().then((config) => {
      if (!this.cloudState.online) {
        if (config.remoteUrl && config.username && config.password) {
          console.debug('Setting remote backup...');
          this.store.adapterFor('application').configRemote();
          if (!this.session.isAuthenticated) {
            this.store.adapterFor('application').connectRemote();
          }
        }
      }
    });
  }

  @action toggleMenu() {
    this.currentUser.expandMenu = !this.currentUser.expandMenu;
  }

  @action toggleSubmenu() {
    this.currentUser.expandSubmenu = !this.currentUser.expandSubmenu;
  }

  @action closeMenu() {
    this.currentUser.expandMenu = false;
  }

  @action toggleLyrics() {
    if (!this.isOverlay && !this.isLyrics && this.currentUser.isTauri) {
      // Never forget: when you are developing if you reload ember server the relationship between
      // all WebView windows disappears and only the main window gets closed, as it has no children.
      // This also implies that the changes on position and size only get updated and saved for the
      // window that is getting closed as changes are only shared between WebView windows when saved
      // in the local storage.
      this.store.findAll('config').then(async () => {
        let currentconfig = this.store.peekRecord('config', 'ppbconfig');
        if (currentconfig) {
          let currentWindow = getCurrent();
          if (currentWindow.label === 'Main') {
            let reader = await WebviewWindow.getByLabel('reader');

            if (reader) {
              // We do this to prevent saving a minimized window position and size.
              await reader.unminimize();
              let maximized = await reader.isMaximized();
              let position = await reader.outerPosition();
              let size = await reader.outerSize();

              if (!maximized || !currentconfig.readerMax) {
                // We do this to preserve unmaximized size and position;
                console.debug('Reader is not maximized');
                currentconfig.readerPosX = position.x;
                currentconfig.readerPosY = position.y;
                currentconfig.readerWidth = size.width;
                currentconfig.readerHeight = size.height;
                console.debug('Updated reader position and size in config.');
              } else {
                console.debug('Reader is maximized');
              }
              later(
                this,
                async () => {
                  currentconfig.showLyrics = false;
                  await currentconfig.save().then(async () => {
                    console.debug('Saved config. Closing reader window');
                    reader.close();
                  });
                },
                0
              );
            } else {
              currentconfig.showLyrics = true;
              await currentconfig.save().then(async () => {
                this.currentUser.showLyrics();
              });
            }
          }
        }
      });
    }
  }

  @action toggleOverlay() {
    if (!this.isOverlay && this.currentUser.isTauri) {
      // Never forget: when you are developing if you reload ember server the relationship between
      // all WebView windows disappears and only the main window gets closed, as it has no children.
      // This also implies that the changes on position and size only get updated and saved for the
      // window that is getting closed as changes are only shared between WebView windows when saved
      // in the local storage.
      this.store.findAll('config').then(async () => {
        let currentconfig = this.store.peekRecord('config', 'ppbconfig');
        if (currentconfig) {
          let currentWindow = getCurrent();
          if (
            currentWindow.label === 'Main' ||
            currentWindow.label === 'reader'
          ) {
            let overlay = await WebviewWindow.getByLabel('overlay');

            if (overlay) {
              // We do this to prevent saving a minimized window position and size.
              await overlay.unminimize();
              let maximized = await overlay.isMaximized();
              let position = await overlay.outerPosition();
              let size = await overlay.outerSize();
              // currentconfig.overlayMax    = maximized;
              if (!maximized || !currentconfig.overlayMax) {
                // We do this to preserve unmaximized size and position;
                console.debug('Overlay is not maximized');
                currentconfig.overlayPosX = position.x;
                currentconfig.overlayPosY = position.y;
                currentconfig.overlayWidth = size.width;
                currentconfig.overlayHeight = size.height;
                console.debug('Updated overlay position and size in config.');
              } else {
                console.debug('Overlay is maximized');
              }
              later(
                this,
                async () => {
                  currentconfig.showOverlay = false;
                  await currentconfig.save().then(async () => {
                    console.debug('Saved config. Closing overlay window');
                    overlay.close();
                  });
                },
                0
              );
            } else {
              if (this.isWinOverlayAllowed) {
                currentconfig.overlayType = 'window';
              }
              currentconfig.showOverlay = true;
              await currentconfig.save().then(async () => {
                this.currentUser.toggleOverlay();
              });
            }
          }
        }
      });
    }
  }

  @action async minimizeWindow() {
    if (this.currentUser.isTauri) {
      let currentWindow = getCurrent();
      this.minimized = true;

      if (currentWindow.label === 'Main') {
        if (!this.globalConfig.config.mainMax) {
          this.globalConfig.config.save().then(() => {
            console.debug(
              "Saved Main size before minimize when wasn't maximized"
            );
            currentWindow.minimize();
            console.debug('Main Minimized.');
          });
        } else {
          currentWindow.minimize();
          console.debug('Main Minimized.');
        }
      }
      if (currentWindow.label === 'reader') {
        if (!this.globalConfig.config.readerMax) {
          this.globalConfig.config.save().then(() => {
            console.debug(
              "Saved Reader size before minimize when wasn't maximized"
            );
            currentWindow.minimize();
            console.debug('Reader Minimized.');
          });
        } else {
          currentWindow.minimize();
          console.debug('Reader Minimized.');
        }
      }
    }
  }

  @action maximizeWindow() {
    if (this.currentUser.isTauri) {
      let currentWindow = getCurrent();
      if (currentWindow.label === 'Main') {
        if (this.globalConfig.config.mainMax) {
          this.globalConfig.config.mainMax = false;
          currentWindow.unmaximize();
          console.debug('Unmaximized Main.');
        } else {
          this.globalConfig.config.mainMax = true;
          currentWindow.maximize();
          console.debug('Maximized Main.');
        }
        if (this.globalConfig.config.hasDirtyAttributes) {
          // We save to preserve last unmaximized size;
          this.globalConfig.config.save().then(() => {
            console.debug('Saved Main size after maximize');
          });
        }
      }
      if (currentWindow.label === 'reader') {
        if (this.globalConfig.config.readerMax) {
          this.globalConfig.config.readerMax = false;
          currentWindow.unmaximize();
          console.debug('Unmaximized Reader.');
        } else {
          this.globalConfig.config.readerMax = true;
          currentWindow.maximize();
          console.debug('Maximized Reader.');
        }
        if (this.globalConfig.config.hasDirtyAttributes) {
          // We save to preserve last unmaximized size;
          this.globalConfig.config.save().then(() => {
            console.debug('Saved Reader size after maximize');
          });
        }
      }
    }
  }

  @action async closeWindow() {
    if (this.currentUser.isTauri) {
      // Never forget: when you are developing if you reload ember server the relationship between
      // all WebView windows disappears and only the main window gets closed, as it has no children.
      // This also implies that the changes on position and size only get updated and saved for the
      // window that is getting closed as changes are only shared between WebView windows when saved
      // in the local storage.
      this.store.findAll('config').then(async () => {
        let currentconfig = this.store.peekRecord('config', 'ppbconfig');

        if (currentconfig) {
          let currentWindow = getCurrent();
          if (currentWindow.label === 'Main') {
            let main = await WebviewWindow.getByLabel('Main');

            if (main) {
              // We do this to prevent saving a minimized window position and size.
              await main.unminimize();
              console.debug(main);

              let maximized = await main.isMaximized();
              let position = await main.outerPosition();
              let size = await main.outerSize();
              // currentconfig.mainMax = currentconfig.mainMax ? currentconfig.mainMax : maximized;
              if (!maximized && !currentconfig.mainMax) {
                // We do this to preserve unmaximized size and position;
                console.debug('Main is not maximized');
                currentconfig.mainPosX = position.x;
                currentconfig.mainPosY = position.y;
                currentconfig.mainWidth = size.width;
                currentconfig.mainHeight = size.height;
                console.debug('Updated Main position and size in config.');
              } else {
                console.debug('Main is maximized');
              }
              //}
            }
          }

          if (
            currentWindow.label === 'Main' ||
            currentWindow.label === 'reader'
          ) {
            let reader = await WebviewWindow.getByLabel('reader');

            if (reader) {
              // We do this to prevent saving a minimized window position and size.
              await reader.unminimize();
              let maximized = await reader.isMaximized();
              let position = await reader.outerPosition();
              let size = await reader.outerSize();
              // currentconfig.readerMax = currentconfig.readerMax ? currentconfig.readerMax : maximized;
              if (!maximized || !currentconfig.readerMax) {
                // We do this to preserve unmaximized size and position;
                console.debug('Reader is not maximized');
                currentconfig.readerPosX = position.x;
                currentconfig.readerPosY = position.y;
                currentconfig.readerWidth = size.width;
                currentconfig.readerHeight = size.height;
                console.debug('Updated reader position and size in config.');
              } else {
                console.debug('Reader is maximized');
              }
              // }
            }
          }

          if (
            currentWindow.label === 'Main' ||
            currentWindow.label === 'overlay'
          ) {
            let overlay = await WebviewWindow.getByLabel('overlay');

            if (overlay) {
              // We do this to prevent saving a minimized window position and size.
              await overlay.unminimize();
              let maximized = await overlay.isMaximized();
              let position = await overlay.outerPosition();
              let size = await overlay.outerSize();
              // currentconfig.overlayMax    = maximized;
              if (!maximized || !currentconfig.overlayMax) {
                // We do this to preserve unmaximized size and position;
                console.debug('Overlay is not maximized');
                currentconfig.overlayPosX = position.x;
                currentconfig.overlayPosY = position.y;
                currentconfig.overlayWidth = size.width;
                currentconfig.overlayHeight = size.height;
                console.debug('Updated overlay position and size in config.');
              } else {
                console.debug('Overlay is maximized');
              }
            }
          }

          later(
            this,
            async () => {
              await currentconfig.save().then(async () => {
                console.debug('Saved config. Closing windows');
                if (currentWindow.label === 'reader') {
                  await currentWindow.close();
                } else {
                  if (currentWindow.label === 'overlay') {
                    await currentWindow.close();
                  } else {
                    await getAll().forEach(async (item) => {
                      await item.close();
                    });
                  }
                }
              });
            },
            0
          );
        }
      });
    }
  }

  @action dragWindow(event) {
    event.preventDefault();
    // console.debug(event);
    if (this.currentUser.isTauri) {
      appWindow.startDragging();
    }
  }

  @action dropWindow(event) {
    event.preventDefault();
  }

  @action logout() {
    this.session.invalidate();
  }
}
