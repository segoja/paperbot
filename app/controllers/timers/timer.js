import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';

export default class TimerController extends Controller {
  @inject timers;
  @service router;
  @service audio;
  @service currentUser;
    
  @action closeTimer() {
    this.currentUser.isViewing = false;
    this.router.transitionTo('timers');      
  }
  
  @action editTimer(){
  }
  
  @action saveAndReturnTimer(){
    this.saveTimer();
    this.router.transitionTo('timers');
    
  }
  
  @action saveTimer () {
    this.model.save();
    
    if(this.model.type === 'audio'){
      if (this.model.active){
        this.audio.removeFromRegister('sound', this.model.name);
        this.audio.load(this.model.soundfile).asSound(this.model.name);
        console.debug(this.model.soundfile+ " loaded in the soundboard");
        
      } else {
        this.audio.removeFromRegister('sound', this.model.name);
        console.debug(this.model.soundfile+ " removed from the soundboard");
      }
    }    
  }
  
  @action deleteTimer() {
    if(this.model.type === 'audio'){
      if (this.model.active){
        this.audio.removeFromRegister('sound', this.model.name);
        console.debug(this.model.soundfile+ " removed from the soundboard");
      }
    }
    
    this.model.destroyRecord().then(() => {
      this.currentUser.isViewing = false;
      this.router.transitionTo('timers');
    });
  }
}
