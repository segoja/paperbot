import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ApplicationRoute extends Route  {
  @service headData;
  @service store;
  
  model () {
    return this.store.findAll('config');      
  }
  
  afterModel(model) {    
    this.headData.title = 'Paperbot, a Twitch.tv bot by Papercat84';
  } 
}
