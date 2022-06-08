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
    
    if(this.soundClip){
      if(this.soundClip.isPlaying){
        this.soundClip.stop();
      }
      this.audio.removeFromRegister('sound', 'preview');
    }
    
    if(this.args.command.soundfile){  
      this.audio.load(this.args.command.soundfile).asSound('preview').then(
        function(msg) {
          this.audio.getSound('preview').then(async(soundclip)=>{
            this.soundClip = await soundclip;
            console.debug(this.args.command.soundfile+ " preview loaded in the soundboard"/*, msg*/);
          });
        }.bind(this), 
        function(err) {
          console.log("error loading "+this.args.command.soundfile+" in the soundboard!", err);
        }.bind(this)
      );
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
    this.audio.removeFromRegister('sound', 'preview');
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
          // command.save()
          this.audio.removeFromRegister('sound', 'preview');
          this.audio.load(path).asSound('preview').then(
            function(msg) {
              this.soundClip = this.audio.getSound('preview');
              console.debug(command.soundfile+ " preview loaded in the soundboard"/*, msg*/);
            }.bind(this), 
            function(err) {
              console.log("error loading "+command.soundfile+" in the soundboard!", err);
            }.bind(this)
          );
        }
      }
    });
  }  
      
  @tracked soundClip = '';
  
  @tracked isPlaying =  false;
  
  get loadPreview(){
    if(this.args.command.soundfile){
      console.log(this.soundClip);
      this.audio.removeFromRegister('sound', 'preview');
      return this.audio.load(this.args.command.soundfile).asSound('preview'); 
      return true;
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
      if(this.soundClip){    
        this.soundClip.changeGainTo(volume).from('percent');
      }
    }
  }
  
  @action playSound(){
    if(this.args.command.soundfile){
      if(this.soundClip.isPlaying){
        this.soundClip.stop();       
      } else {
        this.audio.getSound('preview').then(async(soundclip)=>{
          this.soundClip = await soundclip;
          this.soundClip.changeGainTo(this.args.command.volume).from('percent');
          this.soundClip.playFor(this.soundClip.duration.raw);        
        });
      }
      //let duration = newPreview.duration.raw*1000;
      //this.isPlaying = true;
      //later(() => { this.isPlaying = false; }, duration);
      //newPreview.play();
    }
  }
}
