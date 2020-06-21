import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class CommandController extends Controller {
  @inject commands;
  @service router;
  @service audio;
  
  @tracked isEditing;  
  
  @action closeCommand() {
    this.isEditing = false;
    this.commands.isViewing = false;
    this.router.transitionTo('commands');      
  }
  
  @action editCommand(){
    this.isEditing = true;
  }  
  
  @action saveCommand () {
    this.isEditing = false;
    this.model.save();
    
    if(this.model.type === 'audio'){
      if (this.model.active){
        this.audio.removeFromRegister('sound', this.model.name);
        this.audio.load(this.model.soundfile).asSound(this.model.name);
        console.log(this.model.soundfile+ " loaded in the soundboard");
        
      } else {
        this.audio.removeFromRegister('sound', this.model.name);
        console.log(this.model.soundfile+ " removed from the soundboard");
      }
    }    
  }
  
  @action deleteCommand() {
    if(this.model.type === 'audio'){
      if (this.model.active){
        this.audio.removeFromRegister('sound', this.model.name);
        console.log(this.model.soundfile+ " removed from the soundboard");
      }
    }
    
    this.model.destroyRecord().then(() => {
      this.commands.isViewing = false;
      this.isEditing = false;
      this.router.transitionTo('commands');
    });
  }
}
