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
  }

  @action newKey() {
    return this.cryptoData.newKey(this.args.client.username);
  }

  @action password() {
    let result = '';
    let key = this.newKey();
    if (key && this.oauth && !this.args.client.publicKey) {
      console.debug('Generating new key and encrypted oauth');
      this.args.client.publicKey = key;
      result = this.cryptoData.encrypt(this.oauth, key);
    } else {
      if (key) {
        // console.debug('New key: '+key);
        let oldOauth = this.cryptoData.decrypt(
          this.args.client.oauth,
          this.args.client.publicKey
        );
        // console.debug('Old oauth: '+oldOauth);

        if (key != this.args.client.publicKey || this.oauth != oldOauth) {
          if (this.oauth || oldOauth) {
            let oauth = oldOauth;
            let update = false;
            if (this.oauth != oldOauth && this.oauth) {
              console.debug('Updating encrypted oauth');
              oauth = this.oauth;
              update = true;
            } else {
              if (
                key != this.args.client.publicKey &&
                this.args.client.publicKey
              ) {
                console.debug('Updating key and re-encrypting oauth');
                update = true;
              }
            }
            if (update) {
              this.args.client.publicKey = key;
              result = this.cryptoData.encrypt(oauth, key);
            } else {
              console.debug('Nothing to update');
            }
          }
        } else {
          console.debug('No changes in key nor oauth.');
        }
      } else {
        console.debug('No key generated.');
      }
    }
    return result;
  }

  @action saveAndReturnClient() {
    let password = this.password();
    if (password != '') {
      this.args.client.oauth = password;
    }
    this.args.saveAndReturnClient();
  }

  @action doneEditing() {
    let password = this.password();
    if (password != '') {
      this.args.client.oauth = password;
    }

    this.args.saveClient();
    this.saving = true;
    later(() => {
      this.saving = false;
      this.isMasked = true;
      this.setOauth();
    }, 500);
  }

  @tracked isMasked = true;

  @action toggleMask() {
    this.isMasked = !this.isMasked;
    if (
      !this.isMasked &&
      this.args.client.oauth &&
      this.args.client.publicKey
    ) {
      this.setOauth();
    }
  }

  @action setOauth() {
    let oauth = this.decryptPass();
    if (oauth != '') {
      this.oauth = oauth;
    }
  }

  @action decryptPass() {
    let data = this.args.client.oauth;
    let key = this.args.client.publicKey;
    return this.cryptoData.decrypt(data, key);
  }
}
