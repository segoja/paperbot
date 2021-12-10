import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ReaderRoute extends Route {
  @service store;
  @service currentUser;
  @service globalConfig;

  model () {
    return this.store.findAll('song');
  }
    
  afterModel(){
    this.currentUser.isViewing = false;
    this.globalConfig.config.showLyrics = true;
    this.globalConfig.config.save();
  }
  
  @action willTransition (transition) {
    if (transition.targetName != 'reader') {
      this.globalConfig.config.showLyrics = false;
      this.globalConfig.config.save();
    }
  }
}
