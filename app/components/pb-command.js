/* global require */
import Component from '@glimmer/component';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { dialog } from "@tauri-apps/api";
import { readBinaryFile } from '@tauri-apps/api/fs'

export default class PbCommandComponent extends Component {
  @service audio;

  @tracked saving = false;
  
  @action doneEditing() {  
    this.args.saveCommand();
    this.saving = true;
    later(() => { this.saving = false; }, 500);    
  }
  
  @action getAudioPath(command){
    dialog.open({
      directory: false,
      filters: [{name: "Select audio file...", extensions: ['mp3','wav','ogg']}]
    }).then((file) => {
      console.log(file);
      if(file){
        command.soundfile = file;
        command.save();
      }
    });
  }  
      
  @tracked soundClip;
  
  @tracked isPlaying =  false;
  
  get loadPreview(){
    if(this.args.command.soundfile){
      this.audio.removeFromRegister('sound', 'preview');
      return this.audio.load(this.args.command.soundfile).asSound('preview');      
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
    if(this.args.command.soundfile){
      if(volume === ''){
        volume = 0;
        set(this.args.command, "volume", 0);
      }
      if(volume > 100){
        volume = 100;
        set(this.args.command, "volume", 100);
      }
      if(isNaN(volume)){
        volume = 100;
        set(this.args.command, "volume", 100);
      }
      if(this.soundClip){    
        this.soundClip.changeGainTo(volume).from('percent');
      }
    }
  }
  
  @action playSound(){
    if(this.args.command.soundfile){
      this.soundClip = this.audio.getSound('preview');
      this.soundClip.changeGainTo(this.args.command.volume).from('percent');    
      // We get the sound duratiaon in miliseconds.
      var duration = this.soundClip.duration.raw*1000;
      this.isPlaying = true;
      later(() => { this.isPlaying = false; }, duration);
      
      this.soundClip.play();
    }
  }
}
