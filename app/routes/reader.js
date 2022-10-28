import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { hash } from 'rsvp';

export default class ReaderRoute extends Route {
  @service store;
  @service currentUser;
  @service globalConfig;
  
  model () {
    var store = this.store;
    return hash({
      model: store.findAll('song'),
      requests: store.findAll('request')
    });
  }
  
  setupController(controller, models) {
    super.setupController(controller, models);
    controller.setProperties(models);
  }
    
  afterModel(){
    // this.currentUser.isViewing = false;
    // this.globalConfig.config.showLyrics = true;
    // this.globalConfig.config.save();
  }
  
  @action willTransition (transition) {
    //if (transition.targetName != 'reader') {
      // this.globalConfig.config.showLyrics = false;
      // this.globalConfig.config.save();
    //}
  }
}
