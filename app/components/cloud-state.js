import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class PbCloudComponent extends Component {
  @service cloudState;
  @service globalConfig;
  @service currentUser;
  @service session;
  @service store;

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
}
