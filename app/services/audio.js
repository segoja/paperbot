import audio from 'ember-audio/services/audio';
import { readBinaryFile } from '@tauri-apps/api/fs'
import { resolve } from 'rsvp';
import { tracked } from '@glimmer/tracking';
import { TrackedMap } from 'tracked-maps-and-sets';

export default class AudioService extends audio {

  /**
   * This acts as a register for Sound instances. Sound instances are placed in
   * the register by name, and can be called via audioService.getSound('name')
   *
   * @private
   * @property _sounds
   * @type {map}
   */
  _sounds = new TrackedMap();
  
  // We need to override _load in order to load audio files from the computer in tauri.  
  _load(name, src, type) {
    let audioContext = this.audioContext;
    let register = this._getRegisterFor(type);
 
    if (register.has(name)) {
      return resolve(register.get(name));
    }
    return readBinaryFile(src)
      .then(async (response) => {      
        let arraybuffer = new ArrayBuffer(await response.length);
        let view = new Uint8Array(arraybuffer);
        for (var i = 0; i < response.length; ++i) {
            view[i] = response[i];
        }
        return audioContext.decodeAudioData(arraybuffer); 
      })
      .then((audioBuffer) => {
        let sound = this._createSoundFor(type, { audioBuffer, audioContext, name });
        register.set(name, sound);
        return sound;
      })
      .catch((err) => {
        console.error('ember-audio:', err);
        console.error('ember-audio:', 'This error was probably caused by a 404 or an incompatible audio file type');
      });
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