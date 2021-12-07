import Controller from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class SongController extends Controller {
  @service router;
  @service currentUser;
    
  @action closeSong() {
    this.currentUser.isViewing = false;
    this.router.transitionTo('reader');
  }
  
  @action editSong(){
    console.log('whut?');
  }
  
  @action saveAndReturnSong(){
    console.log('whut?');
  }

  @tracked slsong;

  @action saveSong () {
    console.log('whut?');
  }
  
  @action deleteSong() {    
    console.log('whut?');
  }
}
