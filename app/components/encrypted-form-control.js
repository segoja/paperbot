import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class VaultManagerComponent extends Component {
  @service cryptoData;

  @tracked isMasked = true;
  @tracked value = '';

  constructor() {
    super(...arguments);
  }

  get label() {
    return this.args.label || 'Label';
  }

  get placeholder() {
    return this.args.placeholder || 'Placeholder';
  }

  get title() {
    return this.args.title || 'Title';
  }

  get errorMessages() {
    return this.errors;
  }

  @action updateValue() {
    this.value = this.args.value;
    this.isMasked = true;
  }

  @action onChange() {
    this.args.onChange(this.value);
  }

  @action toggleMask() {
    if (this.cryptoData.isUnlocked) {
      if (this.isMasked) {
        if (this.value !== '') {
          this.setUnmasked().then(() => {
            this.isMasked = false;
          });
        } else {
          this.isMasked = false;
        }
      } else {
        this.isMasked = true;
      }
    } else {
      this.cryptoData.showVaultModal = true;
    }
  }

  @action async setUnmasked() {
    try {
      // Check if value is encrypted before decrypting
      const maskedValue = structuredClone(this.value) ?? '';
      if (!maskedValue) {
        this.value = '';
        return;
      }

      if (this.cryptoData.isVaultEncrypted(maskedValue)) {
        if (!this.cryptoData.isUnlocked) {
          this.value = '';
          return;
        }

        let unmaskedValue =
          await this.cryptoData.newDecryptFromVault(maskedValue);

        if (unmaskedValue) {
          console.debug('Decrypted and Unmasked...');
          this.value = unmaskedValue;
        } else {
          this.value = '';
          console.debug('Failed to decrypt...');
        }
      } else {
        console.debug('Unmasked...');
        this.value = maskedValue;
      }
    } catch (error) {
      this.value = '';
      console.error('Failed to load:', error);
    }
  }
}
