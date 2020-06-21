import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class ApplicationController extends Controller {
  @service cloudState;
  @service audio;
  @service store;
  
  get soundboard(){
    let audiocommandslist = this.store.findAll('command').filterBy('type','audio').filterBy('active', true);
    
    console.log("Loading the soundboard...");
    if(audiocommandslist.lenght !== 0){
      audiocommandslist.forEach((command) => {
        this.audio.load(command.soundfile).asSound(command.name).then(
          function() {
            console.log(command.soundfile+ " loaded in the soundboard");
          }, 
          function() {
            console.log("error loading "+command.soundfile+" in the soundboard!");
          }
        );
      });
    } else {
      console.log("No sound commands to load in soundboard!");
    }
    return "Soundboard ON";
  }  
}
