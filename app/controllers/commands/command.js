import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';

export default class CommandController extends Controller {
  @inject commands;
  @service router;
  @service audio;
  @service currentUser;
    
  @action closeCommand() {
    this.currentUser.isViewing = false;
    this.router.transitionTo('commands');      
  }
  
  @action editCommand(){
  }
  
  @action saveAndReturnCommand(){
    this.saveCommand();
    this.router.transitionTo('commands');    
  }
  
  @action saveCommand () {
    this.model.save().then(()=>{
      if(this.model.type === 'audio'){
       if (this.model.active){
          this.audio.removeFromRegister(this.model.name);
          this.audio.loadSound(this.model);          
        } else {
          this.audio.removeFromRegister(this.model.name);
        }
      }       
    });
  }
  
  @action deleteCommand() {
    if(this.model.type === 'audio'){
      if (this.model.active){
        this.audio.removeFromRegister(this.model.name);
      }
    }
    
    this.model.destroyRecord().then(() => {
      this.currentUser.isViewing = false;
      this.router.transitionTo('commands');
    });
  }
}
