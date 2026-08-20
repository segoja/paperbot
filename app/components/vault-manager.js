import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class VaultManagerComponent extends Component {
  @service cryptoData;
  @service globalConfig;
  @service store;

  @tracked passphrase = '';
  @tracked remotePassphrase = '';

  @tracked invalidPassphrase = true;
  @tracked errors = [];
  @tracked isMigrationForm = false;
  @tracked newVaultMeta = {};
  @tracked keepLocalVault = false;
  @tracked rememberOnDevice = true;

  constructor() {
    super(...arguments);
    this.passphrase = '';
  }

  get isMigration() {
    return this.cryptoData?.conflictData?.hasConflict;
  }

  get modalWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }

  get showVaultModal() {
    return this.cryptoData.showVaultModal && !this.globalConfig.showFirstRun;
  }

  get canRemember() {
    return this.cryptoData.vaultCredentialStore.isSupported;
  }

  get isManaging() {
    return (
      this.cryptoData.isUnlocked &&
      !this.cryptoData.newVaultModal &&
      !this.isMigration
    );
  }

  get isRemembered() {
    return this.cryptoData.vaultCredentialStore.isRemembered;
  }

  get title() {
    if (this.isManaging) return 'Vault Security';
    if (this.cryptoData.newVaultModal) {
      return 'Protect Your Secrets with a Passphrase';
    } else {
      if (this.isMigration) {
        return 'Update Passphrase';
      }
      return 'Unlock Vault';
    }
  }

  get errorMessages() {
    return this.errors;
  }

  @action submitForm() {
    console.debug('Submitting form...');
    if (this.cryptoData.newVaultModal) {
      this.addNewVaultMeta();
    } else {
      if (this.isMigration) {
        if (this.keepLocalVault) {
          this.migrateToNewVault();
        } else {
          this.migrateToRemoteVault();
        }
      } else {
        this.unlock();
      }
    }
  }

  @action async unlock(event) {
    console.debug('Unlocking vault...');
    if (event) {
      event.preventDefault();
    }
    if (!this.passphrase) {
      console.debug('Passphrase is required.');
      return;
    }
    let ok = await this.cryptoData.unlockCurrentVault(this.passphrase, {
      remember: this.canRemember && this.rememberOnDevice,
    });
    if (ok) {
      console.debug('Vault unlocked!', ok);
      this.passphrase = '';
    }
  }

  @action checkPassPhrase(passPhrase) {
    const currentPassphrase = passPhrase;
    this.errors = [];
    if (this.cryptoData.newVaultModal || this.isMigrationForm) {
      if (currentPassphrase.length < 8) {
        this.errors.push('Passphrase must be at least 8 characters long.');
      }
      if (currentPassphrase.length > 100) {
        this.errors.push('Passphrase must be less than 100 characters.');
      }
      if (currentPassphrase.includes(' ')) {
        this.errors.push('Passphrase should not include any spaces.');
      }
      if (!/[A-Za-z]/.test(currentPassphrase)) {
        this.errors.push('Passphrase must include at least one letter.');
      }
      if (!/[0-9]/.test(currentPassphrase)) {
        this.errors.push('Passphrase must include at least one number.');
      }
    }
    this.invalidPassphrase = this.errors.length > 0;
    this.passphrase = this.invalidPassphrase ? '' : currentPassphrase;
  }

  @action checkRemotePassPhrase(passPhrase) {
    this.remotePassphrase = passPhrase;
  }

  @action toggleRemember(event) {
    this.rememberOnDevice = event.target.checked;
  }

  @action async addNewVaultMeta() {
    console.debug('Creating new vault...');
    const newVaultMeta = await this.cryptoData.createVaultMeta(this.passphrase);

    const newVaultMetaRecord = await this.store
      .createRecord('vault', { id: 'ppb-vault', ...newVaultMeta })
      .save();

    if (newVaultMetaRecord) {
      this.newVaultMeta = {};
      await this.cryptoData.vaultCheck();
      await this.cryptoData.unlockCurrentVault(this.passphrase, {
        remember: this.canRemember && this.rememberOnDevice,
      });
      this.passphrase = '';
    }
  }

  @action continueLocked() {
    this.passphrase = '';
    this.cryptoData.rememberError = null;
    this.cryptoData.cancelUnlock();
  }

  @action async migrateToRemoteVault() {
    // this.cryptoData.conflictData = null;
    let localPassphrase = this.passphrase;
    let remotePassphrase = this.remotePassphrase;
    let remoteVault = this.cryptoData.conflictData.remoteVault;
    let localVault = this.cryptoData.conflictData.localVault;
    const result = await this.cryptoData.migrateVault(
      localPassphrase,
      remotePassphrase,
      localVault,
      remoteVault,
    );
    if (result.migrated) {
      this.isMigrationForm = false;
      this.cryptoData.conflictData = null;
      this.errors = [];
      await this.cryptoData.vaultCheck();
      await this.cryptoData.unlockCurrentVault(remotePassphrase, {
        remember: this.canRemember && this.rememberOnDevice,
      });
      this.passphrase = '';
      this.remotePassphrase = '';
    }
  }

  @action async migrateToNewVault() {
    // this.cryptoData.conflictData = null;
    let localPassphrase = this.passphrase;
    let remotePassphrase = this.remotePassphrase;
    let remoteVault = this.cryptoData.conflictData.remoteVault;
    let localVault = this.cryptoData.conflictData.localVault;
    const result = await this.cryptoData.migrateVault(
      remotePassphrase,
      localPassphrase,
      remoteVault,
      localVault,
    );
    if (result.migrated) {
      this.isMigrationForm = false;
      this.keepLocalVault = false;
      this.cryptoData.conflictData = null;
      this.errors = [];
      await this.cryptoData.vaultCheck();
      await this.cryptoData.unlockCurrentVault(localPassphrase, {
        remember: this.canRemember && this.rememberOnDevice,
      });
      this.passphrase = '';
      this.remotePassphrase = '';
    }
  }

  @action async applyRemoteVault() {
    this.isMigrationForm = true;
    this.keepLocalVault = false;
    this.errors = [];
  }

  @action async applyLocalVault() {
    this.isMigrationForm = true;
    this.keepLocalVault = true;
    this.errors = [];
  }

  @action toggleModal() {
    this.cryptoData.showVaultModal = !this.cryptoData.showVaultModal;
  }

  @action async forgetDevice() {
    await this.cryptoData.forgetDevice();
  }
}
