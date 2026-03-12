import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { dialog } from '@tauri-apps/api';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';

export default class PbSettingsComponent extends Component {
  @service cloudState;
  @service queueHandler;
  @service lightControl;
  @service globalConfig;
  @service cryptoData;
  @service currentUser;
  @service session;
  @service store;
  @service audio;

  externalEventServices = ['StreamLabs', 'StreamElements'];
  overlayTypes = Object.freeze(['disabled', 'file', 'window']);

  @tracked isViewing = true;
  @tracked saving = false;

  @tracked externaleventskey = '';

  constructor() {
    super(...arguments);
    this.isViewing = false;
    this.externaleventskey = this.globalConfig.config.externaleventskey;
  }

  willDestroy() {
    super.willDestroy(...arguments);
  }

  get modalWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }

  get showUp() {
    return this.isViewing;
  }

  get externalStatus() {
    console.debug(this.externaleventskey);
    return this.externaleventskey;
  }

  @action changeColor(closefunc, color) {
    this.globalConfig.config.chromaColor = color;
    closefunc();
  }

  @action toggleModal() {
    this.isViewing = !this.isViewing;
    if (!this.isViewing && this.globalConfig.config.hasDirtyAttributes) {
      this.globalConfig.config.rollbackAttributes();
    }
  }

  @action async setdefOverlay(overlay) {
    let oldOverlay = await this.globalConfig.config.get('defOverlay');
    this.globalConfig.config.defOverlay = overlay;
    this.globalConfig.config.save().then(() => {
      if (overlay) {
        overlay.save();
      }
      if (oldOverlay) {
        oldOverlay.save();
      }
    });
  }

  @action async setdefBot(client) {
    let oldClient = await this.globalConfig.config.get('defbotclient');
    this.globalConfig.config.defbotclient = client;
    this.globalConfig.config.save().then(() => {
      if (client) {
        client.save();
      }
      if (oldClient) {
        oldClient.save();
      }
    });
  }

  @action async setdefChat(client) {
    let oldClient = await this.globalConfig.config.get('defchatclient');
    this.globalConfig.config.defchatclient = client;
    this.globalConfig.config.save().then(() => {
      if (client) {
        client.save();
      }
      if (oldClient) {
        oldClient.save();
      }
    });
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

  @action updateVolume() {
    this.audio.updateGlobalVolume();
  }

  @action async doneEditing() {
    if (this.cryptoData.isUnlocked) {
      const isEncryptedEvents = this.cryptoData.isEncrypted(
        this.externaleventskey,
      );
      if (!isEncryptedEvents) {
        console.debug('Encrypting external events key...');
        const encryptedData = await this.cryptoData.newEncryptForVault(
          this.externaleventskey,
        );
        this.globalConfig.config.externaleventskey = encryptedData;
        this.externaleventskey = encryptedData;
      }
    }

    this.globalConfig.config.save().then(() => {
      this.saving = true;
      later(() => {
        this.saving = false;
        this.isViewing = false;
      }, 500);
    });
  }
}
