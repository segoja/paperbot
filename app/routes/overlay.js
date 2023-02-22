import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class OverlayRoute extends Route {
  @service store;
  @service currentUser;
  @service globalConfig;

  model() {
    return this.store.findAll('request');
  }

  afterModel() {
    this.currentUser.isViewing = false;
    //this.globalConfig.config.showOverlay = true;
    //this.globalConfig.config.save();
  }

  @action willTransition(transition) {
    if (transition.targetName != 'overlay') {
      //this.globalConfig.config.showOverlay = false;
      //this.globalConfig.config.save();
    }
  }
}
