import { readBinaryFile } from '@tauri-apps/api/fs'
import { resolve } from 'rsvp';
import { tracked } from '@glimmer/tracking';
import { TrackedMap } from 'tracked-maps-and-sets';
import Service, { inject as service } from '@ember/service';
import {Howl, Howler} from 'howler';
import { dialog, invoke } from "@tauri-apps/api";

const AudioContext = window.AudioContext || window.webkitAudioContext;

// Polyfill AudioContext for Safari
// https://gist.github.com/jakearchibald/131d7101b134b6f7bed1d8320e4da599
if (!window.AudioContext && window.webkitAudioContext) {
  const oldFunction = AudioContext.prototype.decodeAudioData;

  AudioContext.prototype.decodeAudioData = function(arraybuffer) {
    return new Promise((resolve, reject) => oldFunction.call(this, arraybuffer, resolve, reject));
  }
}

export default class AudioService extends Service {

  audioContext = new AudioContext();
  @tracked preview = '';

  /**
   * This acts as a register for Sound instances. Sound instances are placed in
   * the register by name, and can be called via audioService.getSound('name')
   *
   * @private
   * @property _sounds
   * @type {map}
   */
  _soundLibrary = new TrackedMap();

  async loadSound(src){
    await invoke('binary_loader', { filepath: src }).then(async (response)=>{    
      // converted the arraybuffer to a arraybufferview
      let extension = src.split(/[#?]/)[0].split('.').pop().trim();
      var arrayBufferView = new Uint8Array(await response);
      // create a blob from this
      var blob = new Blob( [ arrayBufferView ], { type: 'data:audio/'+extension } );
      // then used the .createObjectURL to create a a DOMString containing a URL representing the object given in the parameter
      var howlSource = URL.createObjectURL(blob);
      //console.log(howlSource);
      // then inatialized the new howl as
      this.preview = new Howl({
        src: [howlSource],
        html5: true,
        format: [extension],
        onloaderror: function() {
          console.log('Error loading audio file '+src);
        }       
      });
    }).catch((binErr)=>{
      console.debug(src);
      console.debug(binErr);
    });
  }
    
  get previewSound(){
    return this.preview;
  }
  
  async loadSounds(soundCommands){
    if(soundCommands.length > 0){
      soundCommands.map(async(command)=>{
        if(command.soundfile){
          
          await invoke('binary_loader', { filepath: src }).then(async (response)=>{
            // We get the file extension to use it for the type
            let extension = src.split(/[#?]/)[0].split('.').pop().trim();
            // converted the arraybuffer to a arraybufferview
            let arrayBufferView = new Uint8Array(await response);
            
            console.log(arrayBufferView);
            // create a blob from this
            let blob = new Blob( [ arrayBufferView ], { type: 'data:audio/'+extension } );
            // then used the .createObjectURL to create a a DOMString containing a URL representing the object given in the parameter
            let howlSource = URL.createObjectURL(blob);
            // console.log(howlSource);
            // then inatialize the new howl in the sound library
            _soundLibrary.set(
              command.name, 
              new Howl({
                src: [howlSource], 
                html5: true, 
                format: [extension],
                onload: function(){
                  console.log(src+' loaded into audio library!');
                },
                onloaderror: function() {
                  console.log('Error loading audio file '+src);
                }       
              })
            ); 
          }).catch((binErr)=>{
            console.debug(src);
            console.debug(binErr);
          });
        }
      });
    }
  }
  
  /**
   * Given a sound's name and type, removes the sound from it's register.
   *
   * @public
   * @method removeFromRegister
   *
   * @param {string} type The type of sound that should be removed. Can be
   * 'sound', 'track', 'font', 'beatTrack', or 'sampler'.
   *
   * @param {string} name The name of the sound that should be removed.
   */
  async removeFromRegister(type, name) {
    let register = this._getRegisterFor(type);
    register.delete(name);
  }
  
  /**
   * Gets a Sound instance by name from the _sounds register
   *
   * @public
   * @method getSound
   *
   * @param {string} name The name of the sound that should be retrieved
   * from the _sounds register.
   *
   * @return {Sound} returns the Sound instance that matches the provided name.
   */
  async getSound(name) {
    return await this.get('_sounds').get(name);
  }  
}