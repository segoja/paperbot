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

  willDestroy() {
    super.willDestroy(...arguments);
    this.isMasked = true;
    this.value = '';
  }

  get groupClass() {
    const inputClass = this.args.size
      ? 'input-group-' + this.args.size
      : 'input-group';
    return inputClass;
  }

  get inputClass() {
    let inputClass = 'form-control';
    if (this.args.isFormGroup) {
      inputClass += ' rounded-0';
    }
    return inputClass + ' ' + this.args.inputClass;
  }

  get autocomplete() {
    return this.args.autocomplete || 'off';
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

  @action async updateValue() {
    this.isMasked = true;
    const value = await this.cryptoData.newDecryptFromVault(this.args.value);
    if (value) {
      this.value = value;
    }
  }

  @action onChange() {
    // console.debug('Changing value...');
    this.changed = true;
    this.args.onChange(this.value);
  }

  @action async toggleMask() {
    if (this.isMasked) {
      if (this.value) {
        this.value = await this.cryptoData.newDecryptFromVault(this.value);
      }
      this.isMasked = false;
    } else {
      this.isMasked = true;
      this.value = await this.cryptoData.newDecryptFromVault(this.args.value);
    }
  }
}
