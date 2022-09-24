import Component from '@glimmer/component';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { dialog } from "@tauri-apps/api";

export default class PbCommandComponent extends Component {
  @service audio;

  @tracked saving = false;

  constructor() {
    super(...arguments);
    
    if(this.audio.previewSound){
      if(this.audio.previewSound.playing()){
        this.audio.previewSound.stop();
      }
      // this.audio.previewSound.unload();
    }
    
    if(this.args.command.soundfile){  
      this.audio.loadSound(this.args.command.soundfile);
    }
  }
  
  willDestroy() {
    super.willDestroy(...arguments);
    if(this.soundClip){
      if(this.soundClip.isPlaying){
        this.soundClip.stop();
      }
      //this.soundClip = '';
    } 
    // this.audio.removeFromRegister('sound', 'preview');
  }  
  
  @action doneEditing() {  
    this.args.saveCommand();
    this.saving = true;
    later(() => { this.saving = false; }, 500);    
  }
  
  @action getAudioPath(command){
    dialog.open({
      directory: false,
      filters: [{name: "Select audio file...", extensions: ['mp3','wav','ogg']}]
    }).then((path) => {
      if(path != null){ 
        //console.debug(path);
        if(path){
          command.soundfile = path;
          // command.save();
          //this.audio.removeFromRegister('sound', 'preview');
          this.audio.loadSound(path);
        }
      }
    });
  }  
      
  @tracked soundClip = '';
  
  @tracked isPlaying =  false;

  get previewLoaded(){
    let status = false;
    if(this.audio.previewSound){
      if(this.audio.previewSound.state() == 'loaded'){
        status = true;
      }
    }
    console.log('Loaded: '+status);
    return status;
  }

  get previewPlaying (){
    let status = false;
    if(this.audio.previewSound){
      status = this.audio.previewSound.playing();
    }
    console.log('Playing: '+status);
    return status;
  }
  
  @action adjustVolume(volume){
    if(this.args.command.soundfile){    
      if(volume === ''){
        volume = 0;
        this.args.command.volume = 0;
      }
      if(volume > 100){
        volume = 100;
        this.args.command.volume = 100;
      }
      if(isNaN(volume)){
        volume = 100;
        this.args.command.volume = 100;
      }
      if(this.previewLoaded){
        let finalVol = volume / 100;
        console.log('Setting volume to: '+finalVol);
        this.audio.previewSound.volume(finalVol);
      }
    }
  }
  
  @action playSound(){
    if(this.args.command.soundfile){
      if(this.previewLoaded){
        if(this.previewPlaying){
          this.audio.previewSound.stop();
        } else {
          this.audio.previewSound.play();
        }
      }
    }
  }
}
