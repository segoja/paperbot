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
    this.model.save().then(()=>{
      if(this.model.type === 'audio'){
       if (this.model.active){
          this.audio.removeFromRegister(this.model.id);
          this.audio.loadSound(this.model);        
        } else {
          this.audio.removeFromRegister(this.model.id);
        }
      }      
    });
  }
  
  @action deleteTimer() {
   if(this.model.type === 'audio'){
      if (this.model.active){
        this.audio.removeFromRegister(this.model.id);
      }
    }
    
    this.model.destroyRecord().then(() => {
      this.currentUser.isViewing = false;
      this.router.transitionTo('timers');
    });
  }
}
