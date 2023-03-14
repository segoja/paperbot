import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { dialog } from '@tauri-apps/api';
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
  }

  willDestroy() {
    super.willDestroy(...arguments);
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
    if (this.isOnline & this.isCloudSynced & this.isLocalSynced) {
      return 'Connected and synced';
    }
    if (this.isOnline) {
      return 'Connected but not synced';
    }
    return 'Offline';
  }

  get showUp() {
    return this.visible;
  }

  @action toggleModal() {
    this.visible = !this.visible;
    /*if (!this.visible && this.globalConfig.config.hasDirtyAttributes) {
      this.globalConfig.config.rollbackAttributes();
    }*/
  }

  @action reConnect(){
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
        this.visible = false;
      },
      500
    )
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
          this.visible = false;
        },
        500
      );

      this.saving = true;
      later(() => {
        this.saving = false;
        this.visible = false;
      }, 500);
    });
  }
}
