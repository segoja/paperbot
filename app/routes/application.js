import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import { getCurrent } from '@tauri-apps/api/window';

export default class ApplicationRoute extends Route {
  @service session;
  @service currentUser;
  @service headData;
  @service store;
  @service globalConfig;
  @service twitchChat;
  @service queueHandler;
  @service cryptoData;
  @service dataMigrations;

  async beforeModel() {
    await super.beforeModel(...arguments);
    await this.session.setup();
    await this.dataMigrations.ensureCurrentSchema();
  }

  model() {
    var store = this.store;
    return hash({
      model: store.findAll('config'),
      clients: store.findAll('client'),
      overlays: store.findAll('overlay'),
      songs: store.findAll('song'),
      commands: store.findAll('command'),
      timers: store.findAll('timer'),
      requests: store.findAll('request'),
      vaults: store.findAll('vault'),
    });
  }

  setupController(controller, models) {
    super.setupController(controller, models);
    controller.setProperties(models);
  }

  async afterModel(model) {
    this.headData.title = 'Paperbot, a Twitch.tv bot by Javier Sevilla';
    await this.cryptoData.initializeVault();

    if (this.currentUser.isTauri) {
      let currentWindow = getCurrent();
      if (
        model.requests.length > 0 &&
        currentWindow.label === 'Main' &&
        this.globalConfig.config.clearRequests
      ) {
        for (const request of [...model.requests]) {
          await request.destroyRecord();
        }
      }
      if (currentWindow.label === 'Main') {
        const adapter = this.store.adapterFor('application');
        await adapter.purgeType(this.store, this.store.modelFor('event'));
      }
    }
  }
}
