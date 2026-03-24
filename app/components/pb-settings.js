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
  @service midi;

  externalEventServices = ['StreamLabs', 'StreamElements'];
  overlayTypes = Object.freeze(['disabled', 'file', 'window']);

  @tracked isViewing = true;
  @tracked saving = false;

  constructor() {
    super(...arguments);
    this.isViewing = false;
    this.setupMidi();
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.saving = false;
    this.isViewing = false;
  }

  get modalWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }

  get showUp() {
    return this.isViewing;
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

  @action
  async setupMidi() {
    await this.midi.initMidi();
    let outputs = this.midi.getAvailableMidiOutputs();

    if (outputs.length) {
      this.midi.setSelectedChordOutput(outputs[0].id);
      this.midi.setSelectedNoteOutput(outputs[0].id);
    }

    this.midi.setKeyAndMode(this.midi.key, this.midi.mode);
  }

  @action async doneEditing() {
    const externaleventskey = this.globalConfig.config.externaleventskey;
    this.globalConfig.config.externaleventskey =
      await this.cryptoData.newEncryptForVault(externaleventskey);

    console.debug('Saving settings...');
    this.globalConfig.config.save().then(() => {
      this.saving = true;
      later(() => {
        this.saving = false;
        this.isViewing = false;
      }, 500);
    });
  }
}
