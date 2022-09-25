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
          this.audio.removeSound(this.model);
          this.audio.loadSound(this.model).then(()=>{
            console.debug(this.model.soundfile+ " loaded in the soundboard");
            
          });
          
        } else {
          this.audio.removeSound(this.model).then(()=>{
            console.debug(this.model.soundfile+ " removed from the soundboard");
          });
        }
      }       
    });
  }
  
  @action deleteCommand() {
    if(this.model.type === 'audio'){
      if (this.model.active){
        this.audio.removeSound(this.model).then(()=>{
          console.debug(this.model.soundfile+ " removed from the soundboard");
        });
      }
    }
    
    this.model.destroyRecord().then(() => {
      this.currentUser.isViewing = false;
      this.router.transitionTo('commands');
    });
  }
}
