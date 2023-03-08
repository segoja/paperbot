import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { dialog } from '@tauri-apps/api';
import { inject as service } from '@ember/service';

export default class PbSettingsComponent extends Component {
  @service cloudState;
  @service queueHandler;
  @service lightControl;
  @service globalConfig;
  @service currentUser;
  @service session;
  @service store;

  constructor() {
    super(...arguments);
    this.isViewing = false;
  }

  willDestroy() {
    super.willDestroy(...arguments);
  }

  get bootstrapWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }

  externalEventServices = ['StreamLabs', 'StreamElements'];
  overlayTypes = Object.freeze(['disabled', 'file', 'window']);

  @tracked isViewing = true;
  @tracked saving = false;

  get showUp() {
    return this.isViewing;
  }

  @action changeColor(closefunc, color) {
    this.globalConfig.config.chromaColor = color.hex;
    closefunc();
  }

  @action toggleModal() {
    this.isViewing = !this.isViewing;
    if (!this.isViewing && this.globalConfig.config.hasDirtyAttributes) {
      this.globalConfig.config.rollbackAttributes();
    }
  }

  @action setdefOverlay(overlay) {
    console.debug('Into the setdefBot function');
    if (this.globalConfig.config.get('defOverlay.id') != undefined) {
      console.debug('Changing defOverlay');
      var oldclient = this.store.peekRecord(
        'overlay',
        this.globalConfig.config.get('defOverlay.id')
      );
      oldOverlay.configs
        .removeObject(this.globalConfig.config)
        .then(() => {
          oldOverlay.save().then(() => {
            this.globalConfig.config.defOverlay = overlay;
            if (overlay) {
              overlay.save().then(() => this.globalConfig.config.save());
            } else {
              this.globalConfig.config.save();
            }
          });
        });
    } else {
      console.debug('Setting defOverlay');
      //Add the defOverlay to our config
      this.globalConfig.config.defOverlay = overlay;
      //Save the child then the parent
      if (overlay) {
        overlay.save().then(() => this.globalConfig.config.save());
      } else {
        this.globalConfig.config.save();
      }
    }
  }

  @action setdefBot(client) {
    console.debug('Into the setdefBot function');
    if (this.globalConfig.config.get('defbotclient.id') != undefined) {
      console.debug('Changing defbotclient');
      var oldclient = this.store.peekRecord(
        'client',
        this.globalConfig.config.get('defbotclient.id')
      );
      oldclient.botclientconfigs
        .removeObject(this.globalConfig.config)
        .then(() => {
          oldclient.save().then(() => {
            this.globalConfig.config.defbotclient = client;
            if (client) {
              client.save().then(() => this.globalConfig.config.save());
            } else {
              this.globalConfig.config.save();
            }
          });
        });
    } else {
      console.debug('Setting defbotclient');
      //Add the defbotclient to our config
      this.globalConfig.config.defbotclient = client;
      //Save the child then the parent
      if (client) {
        client.save().then(() => this.globalConfig.config.save());
      } else {
        this.globalConfig.config.save();
      }
    }
  }

  @action setdefChat(client) {
    console.debug('Into the setdefChat function');
    if (this.globalConfig.config.get('defchatclient.id') != undefined) {
      console.debug('Changing defchatclient');
      var oldclient = this.store.peekRecord(
        'client',
        this.globalConfig.config.get('defchatclient.id')
      );
      oldclient.chatclientconfigs
        .removeObject(this.globalConfig.config)
        .then(() => {
          oldclient.save().then(() => {
            this.globalConfig.config.defchatclient = client;
            if (client) {
              client.save().then(() => this.globalConfig.config.save());
            } else {
              this.globalConfig.config.save();
            }
          });
        });
    } else {
      console.debug('Setting defchatclient');
      //Add the defchatclient to our config
      this.globalConfig.config.defchatclient = client;
      //Save the child then the parent
      if (client) {
        client.save().then(() => this.globalConfig.config.save());
      } else {
        this.globalConfig.config.save();
      }
    }
  }

  @action opendialogfiles(config) {
    dialog.open({ directory: true }).then((directory) => {
      console.debug(directory);
      if (directory) {
        config.overlayfolder = directory;
        this.queueHandler.fileContent(this.queueHandler.pendingSongs, true);
      }
    });
  }

  @action doneEditing() {
    this.globalConfig.config.save().then(() => {
      this.session.invalidate();
      if (!this.cloudState.online) {
        if (this.globalConfig.config.canConnect) {
          console.debug('Setting remote backup...');
          this.store.adapterFor('application').configRemote();
          this.store.adapterFor('application').connectRemote();
        }
      }
      later(
        this,
        function () {
          if (this.cloudState.online) {
            this.cloudState.couchError = false;
          }
          this.isSaving = false;
          this.isViewing = false;
        },
        500
      );

      this.saving = true;
      later(() => {
        this.saving = false;
        this.isViewing = false;
      }, 500);
    });
  }
}
