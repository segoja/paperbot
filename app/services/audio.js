import Service from '@ember/service';
import audio from 'ember-audio/services/audio';
import { readBinaryFile } from '@tauri-apps/api/fs'
import { resolve } from 'rsvp';

export default class AudioService extends audio {
  
  // We need to override _load in order to load audio files from the computer in tauri.
  
  _load(name, src, type) {
    const audioContext = this.get('audioContext');
    const register = this._getRegisterFor(type);
 
    if (register.has(name)) {
      return resolve(register.get(name));
    }
    return readBinaryFile(src)
      .then(async (response) => {      
        var arraybuffer = new ArrayBuffer(await response.length);
        var view = new Uint8Array(arraybuffer);
        for (var i = 0; i < response.length; ++i) {
            view[i] = response[i];
        }
        return audioContext.decodeAudioData(arraybuffer); 
      })
      .then((audioBuffer) => {
        const sound = this._createSoundFor(type, { audioBuffer, audioContext, name });
        register.set(name, sound);
        return sound;
      })
      .catch((err) => {
        console.error('ember-audio:', err);
        console.error('ember-audio:', 'This error was probably caused by a 404 or an incompatible audio file type');
      });
  }

}
