import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class VaultManagerComponent extends Component {
  @service cryptoData;
  @service globalConfig;
  @service store;

  @tracked passphrase = '';
  @tracked existingPassphrase = '';

  @tracked invalidPassphrase = true;
  @tracked errors = [];
  @tracked isMigration = false;
  @tracked isMigrationForm = false;
  @tracked newVaultMeta = {};

  constructor() {
    super(...arguments);
  }

  get modalWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }

  get showVaultModal() {
    return this.cryptoData.showVaultModal && !this.globalConfig.showFirstRun;
  }

  get title() {
    if (this.cryptoData.newVaultModal) {
      return 'Protect Your Secrets with a Dataset Passphrase';
    } else {
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
      this.unlock();
    }
  }

  @action async unlock(event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.passphrase) {
      return;
    }
    let ok = await this.cryptoData.unlockCurrentVault(this.passphrase);
    if (ok) {
      console.debug('Vault unlocked!', ok);
      this.passphrase = '';
    }
  }

  @action checkPassPhrase(passPhrase) {
    const currentPassphrase = passPhrase;
    this.errors = [];
    if (this.cryptoData.newVaultModal) {
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

  @action async addNewVaultMeta() {
    const newVaultMeta = await this.cryptoData.createVaultMeta(this.passphrase);
    const newVaultMetaRecord = await this.store
      .createRecord('vault', { id: 'ppb-vault', ...newVaultMeta })
      .save();

    if (newVaultMetaRecord) {
      this.passphrase = '';
      this.newVaultMeta = {};
      this.cryptoData.showVaultModal = false;
      await this.cryptoData.vaultCheck();
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

  @action toggleModal() {
    this.cryptoData.showVaultModal = !this.cryptoData.showVaultModal;
  }
}
