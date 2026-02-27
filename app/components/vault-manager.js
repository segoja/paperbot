import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { client } from 'tmi.js';

export default class VaultManagerComponent extends Component {
  @service cryptoData;
  @service store;

  @tracked passphrase = '';
  @tracked existingPassphrase = '';

  @tracked invalidPassphrase = true;
  @tracked errors = [];
  @tracked isMigration = false;
  @tracked isMigrationForm = false;
  @tracked newVaultMeta = {};


  get modalWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }

  get showVaultModal() {
    return this.cryptoData.showVaultModal;
  }

  get title() {
    if(this.cryptoData.newVaultModal) {
      return 'Protect Your Secrets with a Dataset Passphrase';
    }
    return this.cryptoData.unlockAllowCreate
      ? 'Set Dataset Passphrase'
      : 'Unlock Vault';
  }

  get errorMessages() {
    return this.errors
  }

  @action async unlock(event) {
    event?.preventDefault();

    let ok = await this.cryptoData.unlockCurrentVault(this.passphrase);

    if (ok) {
      this.passphrase = "";
    }
  }

  @action checkPassPhrase(passPhrase) {
    const currentPassphrase = passPhrase;
    this.errors = [];
    if(currentPassphrase.length < 8) {
      this.errors.push('Passphrase must be at least 8 characters long.');
    }
    if(currentPassphrase.length > 100){
      this.errors.push('Passphrase must be less than 100 characters.');
    }
    if(currentPassphrase.includes(' ')){
      this.errors.push('Passphrase should not include any spaces.');
    }
    if(!(/[A-Za-z]/.test(currentPassphrase))){
      this.errors.push('Passphrase must include at least one letter.');
    }
    if(!(/[0-9]/.test(currentPassphrase))){
      this.errors.push('Passphrase must include at least one number.');
    }
    this.invalidPassphrase = (this.errors.length > 0);
    this.passphrase = (this.invalidPassphrase? '' : currentPassphrase);
  }

  @action async addNewVaultMeta() {
    const store = this.store;
    const newVaultMeta = await this.cryptoData.createVaultMeta(this.passphrase);
    console.log("New Vault meta content generated:", newVaultMeta);

    const existingVaultMeta = await store.peekRecord('vault', 'ppb-vault');

    console.debug('Existing vault meta:', existingVaultMeta);

    if(existingVaultMeta && existingVaultMeta.id === "ppb-vault") {
      console.debug('Vault meta already exists, please choose which one to keep....');
      this.errors = ['A vault meta already exists. Please choose which one to keep.'];
      this.newVaultMeta = newVaultMeta;
      this.isMigration = true;
    } else {
      console.debug('No existing vault meta found, creating new one...');
      const newVaultMetaRecord = await store.createRecord('vault', { id: "ppb-vault", ...newVaultMeta }).save();
      console.debug('Created vault meta record:', newVaultMetaRecord);

      await this.cryptoData.migrateCryptoJsToVault(newVaultMetaRecord, this.passphrase);

      this.passphrase = '';
      this.newVaultMeta = {};
      this.cryptoData.showVaultModal = false;
    }
  }

  @action continueLocked() {
    this.passphrase = '';
    this.cryptoData.showVaultModal = false;
  }

  @action migrateVaultMeta() {
    this.isMigration = false;
    this.isMigrationForm = false;
  }

  @action keepExistingVault() {
    this.isMigrationForm = true;
    this.errors = [];
  }

  @action migrateToNewVault() {
    this.isMigrationForm = true;
    this.errors = [];
  }
}
