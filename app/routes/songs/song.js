import Route from '@ember/routing/route';
import { action } from "@ember/object";

export default class SongRoute extends Route {
  async model (params) {
    return this.store.findRecord('song', params.song_id);
  }
  beforeModel(){
    this.controllerFor('songs').isViewing = true;
  }
  
  @action willTransition(){
    this.controllerFor('songs').isViewing = false;
  }  
}
