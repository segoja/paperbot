import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

export default class PbClientComponent extends Component {
  @service globalConfig;
  @service cryptoData;

  @tracked saving = false;

  clientTypes = Object.freeze(['twitch', 'youtube', 'discord']);

  @tracked oauth = '';

  constructor() {
    super(...arguments);
    this.oauth = this.args.client.oauth;
  }


  @action async password() {
    if(this.cryptoData.isUnlocked){
      let result = '';
      result = await this.cryptoData.newEncryptForVault(this.oauth);
      console.debug('Encrypted oauth: ', result);
      return result;
    }
    return this.oauth;
  }

  @action async saveAndReturnClient() {
    let password = await this.password();
    if (password != '') {
      console.debug('Saving oauth: ', password);
      this.args.client.oauth = password;
    }
    await this.args.saveAndReturnClient();
  }

  @action async doneEditing() {
    let password = await this.password();
    if (password) {
      this.args.client.oauth = password;
    }

    await this.args.saveClient();
    this.isMasked = true;
    this.saving = true;
    later(() => {
      this.saving = false;
      this.oauth = this.args.client.oauth;
    }, 500);
  }

  @tracked isMasked = true;

  @action toggleMask() {
    if(this.cryptoData.isUnlocked){
      if (this.isMasked && this.args.client.oauth) {
        this.setOauth().then(() => {
          this.isMasked = false
        });
      } else {
        this.isMasked = true;
      }
    } else {
      this.cryptoData.showVaultModal = true;
    }
  }

  @action async setOauth() {
    try {
      // Check if client's oauth is encrypted before decrypting
      const oauthValue = this.args.client.oauth ?? '';
      if (!oauthValue) {
        this.oauth = '';
        return;
      }

      if (oauthValue.includes('vaultId')) {
        if (!this.cryptoData.isUnlocked) {
          this.oauth = '';
          return;
        }

        let oauth = await this.cryptoData.newDecryptFromVault(oauthValue);
        if (oauth) {
          console.debug('Decrypted oauth: ', oauth);
          this.oauth = oauth;
        } else {
          this.oauth = '';
          console.debug('Failed to decrypt oauth');
        }
      } else {
        this.oauth = oauthValue;
      }
    } catch (error) {
      this.oauth = '';
      console.error('Failed to load oauth:', error);
    }
  }
}


