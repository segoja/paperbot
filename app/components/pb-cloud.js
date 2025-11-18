import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

export default class PbCloudComponent extends Component {
  @service cloudState;
  @service globalConfig;
  @service currentUser;
  @service session;
  @service store;

  constructor() {
    super(...arguments);
    this.visible = false;
    this.saving = false;
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.visible = false;
    this.saving = false;
  }

  @tracked visible = false;
  @tracked saving = false;

  get modalWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }

  get isOnline() {
    return this.cloudState.online;
  }

  get isCloudSynced() {
    return this.cloudState.cloudPush;
  }

  get isLocalSynced() {
    return this.cloudState.cloudPull;
  }

  get cloudIcon() {
    if (this.isOnline & this.isCloudSynced & this.isLocalSynced) {
      return 'cloud';
    }
    if (this.isOnline) {
      return 'sync-alt';
    }
    return 'cloud';
  }

  get cloudColor() {
    if (this.isOnline) {
      if (this.isCloudSynced & this.isLocalSynced) {
        return 'text-success';
      }
      if (this.cloudState.couchError) {
        return 'text-danger';
      }
      return 'text-warning';
    }
    if (this.cloudState.couchError) {
      return 'text-danger';
    }
    return 'text-light';
  }

  get showArrows() {
    if (!this.isCloudSynced || !this.isLocalSynced) {
      return false;
    }
    return true;
  }

  get cloudText() {
    if (!this.globalConfig.config.canConnect) {
      return 'Cloud settings | Status: Not configured';
    }
    if (this.isOnline & this.isCloudSynced & this.isLocalSynced) {
      return 'Cloud settings | Status: Connected and synced';
    }
    if (this.isOnline) {
      return 'Cloud settings | Status: Connected but not synced';
    }
    return 'Cloud settings | Status: Offline';
  }

  get showUp() {
    return this.visible;
  }

  cloudTypes = Object.freeze(['disabled', 'cloudstation', 'custom']);

  @action setCloudType(type) {
    this.globalConfig.config.cloudType = type;
    if (type == 'cloudstation') {
      this.globalConfig.config.remoteUrl = '';
    } else {
      this.globalConfig.config.database = '';
      this.globalConfig.config.remoteUrl = '';
    }
  }

  @action toggleModal() {
    this.visible = !this.visible;
    /*if (!this.visible && this.globalConfig.config.hasDirtyAttributes) {
      this.globalConfig.config.rollbackAttributes();
    }*/
  }

  @action reConnect() {
    this.session.invalidate();
    if (!this.isOnline) {
      if (this.globalConfig.config.canConnect) {
        console.debug('Setting remote backup...');
        this.store
          .adapterFor('application')
          .configRemote()
          .then(() => {
            this.store.adapterFor('application').connectRemote();
          });
      }
    }
    later(
      this,
      function () {
        if (this.isOnline) {
          this.cloudState.couchError = false;
        }
        this.isSaving = false;
        // this.visible = false;
      },
      500,
    );
  }

  @action toggleConnection() {
    if (this.isOnline) {
      console.log('Disconnecting...');
      this.globalConfig.config.autoConnect = false;
      this.globalConfig.config.save().then(() => {
        this.session.invalidate().then(
          (success) => {
            console.log('Disconnected!', success);
          },
          (error) => {
            console.log('Could not disconnect!', error);
          },
        );
        // this.globalConfig.config.autoConnect = true;
        // this.globalConfig.config.save();
      });
    } else {
      console.log('Reconnecting');
      this.reConnect();
    }
  }

  @action doneEditing() {
    this.globalConfig.config.save().then(() => {
      this.saving = true;
      later(() => {
        this.saving = false;
        this.visible = false;
      }, 500);
    });
  }
}
