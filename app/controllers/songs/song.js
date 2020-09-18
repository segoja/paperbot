import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';

export default class SongController extends Controller {
  @inject songs;
  @service router;
  @service audio;
    
  @action closeSong() {
    this.songs.isViewing = false;
    this.router.transitionTo('songs');      
  }
  
  @action editSong(){
  }
  
  @action saveAndReturnSong(){
    this.saveSong();
    this.router.transitionTo('songs');
    
  }
  
  @action saveSong () {
    this.model.save();
  }
  
  @action deleteSong() {    
    this.model.destroyRecord().then(() => {
      this.songs.isViewing = false;
      this.router.transitionTo('songs');
    });
  }
}
