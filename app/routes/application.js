import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import { getCurrent } from "@tauri-apps/api/window"

export default class ApplicationRoute extends Route  {
  @service headData;
  @service store;
  
  model () {
    var store = this.store;
    return hash({
      model: store.findAll('config'),
      clients: store.findAll('client'),
      songs: store.findAll('song'),
      streams: store.findAll('stream'),
      commands: store.findAll('command'),
      timers: store.findAll('timer'),
      events: store.findAll('event'),
      requests: store.findAll('request')
    });
  }
  
  setupController(controller, models) {
    super.setupController(controller, models);
    controller.setProperties(models);
  }

  afterModel(model) {    
    this.headData.title = 'Paperbot, a Twitch.tv bot by Papercat84';
    let currentWindow = getCurrent();
    if(model.requests.length > 0 && currentWindow.label === 'Main'){
      model.requests.map(async (request)=>{
        await request.destroyRecord();
      });
    }
    if(model.events.length > 0 && currentWindow.label === 'Main'){
      model.events.map(async (event)=>{
        await event.destroyRecord();
      });
    }    
  } 
}
