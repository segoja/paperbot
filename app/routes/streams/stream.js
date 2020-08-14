import Route from '@ember/routing/route';
import { action } from '@ember/object';

export default class StreamRoute extends Route {
  async model (params) {
    return this.store.findRecord('stream', params.stream_id);
  }
  
  setupController (controller, model) { 
    super.setupController(controller, model);
    if (this.controllerFor('streams').get('lastStream')){
      this.controllerFor('streams').set('isViewing', true);
    }
  }
  afterModel(model){
    this.controllerFor('streams').set('lastStream', model);    
  }
  
  @action willTransition (transition) {
    if (transition.targetName === 'streams.index' || transition.targetName === 'index' ) {
      if (this.controllerFor('streams').get('lastStream')) {
        transition.abort();
      } 
    }
  }
}
