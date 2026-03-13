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

  constructor() {
    super(...arguments);
    this.oauth = this.args.client.oauth;
  }

  @action async saveAndReturnClient() {
    const oauth = this.args.client.oauth;
    this.args.client.oauth = await this.cryptoData.newEncryptForVault(oauth);

    console.debug('Saving client and returning to clients...');
    await this.args.saveAndReturnClient();
  }

  @action async doneEditing() {
    const oauth = this.args.client.oauth;
    this.args.client.oauth = await this.cryptoData.newEncryptForVault(oauth);

    console.debug('Saving client...');
    await this.args.saveClient();
    this.saving = true;
    later(() => {
      this.saving = false;
    }, 500);
  }

  @action async reEncryptClient() {
    if (!this.args.client.publicKey) return;
    await this.cryptoData
      .migrateSingleCryptoJsToVault(this.args.client)
      .then(() => {
        this.oauth = this.args.client.oauth;
      });
  }
}
