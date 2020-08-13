import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ApplicationRoute extends Route  {
  @service headData;
  
  model () {
    return this.store.findAll('config');      
  }
  
  afterModel(model) {
    
    if(model.get('lenght') != 0){
      if (model.filterBy('isdefault', true).get('firstObject')){
        var config = model.filterBy('isdefault', true).get('firstObject');
        this.headData.darkMode = config.switcher;
        this.controllerFor('application').darkreader(config.switcher);
      } else {
        this.controllerFor('application').darkreader(false);
        this.headData.darkMode = false;            
      }
    } else {
      this.controllerFor('application').darkreader(false);
      this.headData.darkMode = false;
    }
    
    this.headData.title = 'Paperbot, a Twitch.tv bot by Papercat84';

  } 
}
