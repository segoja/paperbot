import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class PbInfoComponent extends Component {
  @service globalConfig;

  @tracked version = '';

  constructor() {
    super(...arguments);

    this.version = this.globalConfig.appVersion();
    this.activeTab = 'welcome';
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.activeTab = 'welcome';
  }

  tabList = ['welcome', 'tips', 'about']; //, 'metrics'];

  @tracked activeTab = 'welcome';

  @action tabSwitch(tab) {
    if (tab) {
      this.activeTab = tab;
    }
  }

  get currentVersion() {
    return this.version;
  }

  get bootstrapWormhole() {
    return document.getElementById('ember-bootstrap-wormhole');
  }

  @action toggleModal() {
    this.globalConfig.showFirstRun = !this.globalConfig.showFirstRun;
  }
}
