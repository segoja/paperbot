import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ApplicationRoute extends Route  {
  @service headData;
  @service store;
  
  model () {
    let store = this.store;
    return store.findAll('config');      
  }
  
  afterModel(model) {    
    this.headData.title = 'Paperbot, a Twitch.tv bot by Papercat84';
    if(model.length < 1){
      this.router.transitionTo('settings.config', this.store.createRecord('config', {id: 'myconfig', name: "Default settings", isdefault: true}));
    }
  } 
}
