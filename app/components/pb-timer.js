import Component from '@glimmer/component';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { dialog } from "@tauri-apps/api";

export default class PbTimerComponent extends Component {
  @service audio;

  @tracked saving = false;
  
  @action doneEditing() {  
    this.args.saveTimer();
    this.saving = true;
    later(() => { this.saving = false; }, 500);
  }
  
  @action getAudioPath(timer){
    dialog.open({
      directory: false,
      filters: [{name: "Select audio file...", extensions: ['mp3','wav','ogg']}]
    }).then((path) => {
      if(path != null){ 
        console.debug(path);
        if(path){
          timer.soundfile = path;
          timer.save();
        }
      }
    });
  }  
      
  @tracked soundClip;
  
  @tracked isPlaying =  false;
  
  get loadPreview(){
    if(this.args.timer.soundfile){
      this.audio.removeFromRegister('sound', 'preview');
      return this.audio.load(this.args.timer.soundfile).asSound('preview');      
    } else {
      return false;
    }
  }
  
  @action stopSound(){
    if(this.soundClip.isPlaying){
      this.soundClip.stop(); 
      this.isPlaying = false;
    }
  }
  
  @action adjustVolume(volume){
    if(this.args.timer.soundfile){
      if(volume === ''){
        volume = 0;
        set(this.args.timer, "volume", 0);
      }
      if(volume > 100){
        volume = 100;
        set(this.args.timer, "volume", 100);
      }
      if(isNaN(volume)){
        volume = 100;
        set(this.args.timer, "volume", 100);
      }
      if(this.soundClip){    
        this.soundClip.changeGainTo(volume).from('percent');
      }
    }
  }
  
  @action playSound(){
    if(this.args.timer.soundfile){
      this.soundClip = this.audio.getSound('preview');
      this.soundClip.changeGainTo(this.args.timer.volume).from('percent');    
      // We get the sound duratiaon in miliseconds.
      var duration = this.soundClip.duration.raw*1000;
      this.isPlaying = true;
      later(() => { this.isPlaying = false; }, duration);
      
      this.soundClip.play();
    }
  }
}
