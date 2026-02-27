import Model, { attr } from '@ember-data/model';

export default class VaultModel extends Model {
  @attr('string', { defaultValue: 'v1' }) v;
  @attr('string', { defaultValue: '' }) vaultId;
  @attr('string', { defaultValue: '' }) vaultSalt;
  @attr('string', { defaultValue: 'AES-GCM' }) alg;

  @attr('string', { defaultValue: '' }) kdfName;
  @attr('string', { defaultValue: '' }) kdfHash;
  @attr('number', { defaultValue: 310000 }) kdfIterations;

  @attr('string', { defaultValue: '' }) updatedAt;

  get kdf() {
    return {
      name: this.kdfName,
      hash: this.kdfHash,
      iterations: this.kdfIterations,
    }
  }

  @attr('string') rev;
}
