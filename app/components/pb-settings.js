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

  @action async setdefOverlay(overlay) {
    let oldOverlay = await this.globalConfig.config.get('defOverlay');      
    this.globalConfig.config.defOverlay = overlay;
    this.globalConfig.config.save().then(()=>{
      if(overlay){
        overlay.save();
      }      
      if(oldOverlay){
          oldOverlay.save();
      }
    });
  }

  @action async setdefBot(client) {
    let oldClient = await this.globalConfig.config.get('defbotclient');
    this.globalConfig.config.defbotclient = client;
    this.globalConfig.config.save().then(()=>{
      if(client){
        client.save();
      }      
      if(oldClient){
          oldClient.save();
      }
    });
  }

  @action async setdefChat(client) {
    let oldClient = await this.globalConfig.config.get('defchatclient');
    this.globalConfig.config.defchatclient = client;
    this.globalConfig.config.save().then(()=>{
      if(client){
        client.save();
      }      
      if(oldClient){
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
