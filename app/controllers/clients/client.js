import Controller, { inject } from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class ClientController extends Controller {
  @inject clients;
  @inject streams;
  @service router;
  @service globalConfig;
  @service currentUser;
  @service recordLifecycle;

  @action closeClient() {
    this.currentUser.isViewing = false;
    this.router.transitionTo('clients');
  }

  @action editClient() {}

  @action saveAndReturnClient() {
    this.saveClient();
    this.router.transitionTo('clients');
  }

  @action saveClient() {
    this.model.save();
  }

  get config() {
    return this.globalConfig.get('config');
  }

  @action async deleteClient() {
    await this.recordLifecycle.deleteClient(this.model);
    this.currentUser.isViewing = false;
    this.router.transitionTo('clients');
  }
}
