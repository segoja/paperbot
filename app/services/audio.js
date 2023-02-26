import { tracked } from '@glimmer/tracking';
import { TrackedMap } from 'tracked-maps-and-sets';
import Service, { inject as service } from '@ember/service';
import { Howl, Howler } from 'howler';
import { invoke } from '@tauri-apps/api';
import { action } from '@ember/object';
import { later } from '@ember/runloop';

export default class AudioService extends Service {
  @service globalConfig;
  @service currentUser;
  /**
   * This acts as a register for Sound instances. Sound instances are placed in
   * the register by id, and can be called via audioService.getSound('id')
   *
   * @private
   * @property sounds
   * @type {map}
   */
  sounds = new TrackedMap();

  @tracked preview = '';
  @tracked isPlaying = false;
  @tracked lastPlayed = '';

  @tracked isEnabled = false;

  get SBstatus() {
    return this.isEnabled;
  }

  get previewSound() {
    return this.preview;
  }

  async loadPreview(src) {
    if (this.currentUser.isTauri) {
      await invoke('binary_loader', { filepath: src })
        .then(async (response) => {
          // converted the arraybuffer to a arraybufferview
          let extension = src.split(/[#?]/)[0].split('.').pop().trim();
          var arrayBufferView = new Uint8Array(await response);
          // create a blob from this
          var blob = new Blob([arrayBufferView], {
            type: 'data:audio/' + extension,
          });
          // then used the .createObjectURL to create a a DOMString containing a URL representing the object given in the parameter
          var howlSource = URL.createObjectURL(blob);
          //console.debug(howlSource);

          if (this.preview) {
            this.preview.unload();
            console.debug('Unloading previous preview, replacing...');
          }

          // then inatialized the new howl as
          this.preview = new Howl({
            src: [howlSource],
            html5: true,
            format: [extension],
            onload: function () {
              console.debug(src + ' loaded in the soundboard');
            },
            onloaderror: function () {
              console.debug('error loading ' + src + ' in the soundboard!');
            },
          });
        })
        .catch((binErr) => {
          console.debug(src);
          console.debug(binErr);
        });
    }
  }

  async loadSound(item) {
    if (this.currentUser.isTauri) {
      //if(this.sounds.get(command.name)){
      await invoke('binary_loader', { filepath: item.soundfile })
        .then(async (response) => {
          // converted the arraybuffer to a arraybufferview
          let extension = item.soundfile
            .split(/[#?]/)[0]
            .split('.')
            .pop()
            .trim();
          var arrayBufferView = new Uint8Array(await response);
          // create a blob from this
          var blob = new Blob([arrayBufferView], {
            type: 'data:audio/' + extension,
          });
          // then used the .createObjectURL to create a a DOMString containing a URL representing the object given in the parameter
          var howlSource = URL.createObjectURL(blob);
          //console.debug(howlSource);

          let itExist = this.sounds.has(item.get('id'));
          if (itExist) {
            let oldsound = this.sounds.get(item.get('id'));
            oldsound.unload();
            this.sounds.delete(item.get('id'));
            console.debug('Sound ' + item.name + ' already exist, replacing...');
          }

          // then inatialized the new howl as
          this.sounds.set(
            item.get('id'),
            new Howl({
              src: [howlSource],
              html5: true,
              volume: item.volume ? item.volume / 100 : 1,
              format: [extension],
              onload: function () {
                console.debug(item.soundfile + ' loaded in the soundboard');
              },
              onloaderror: function () {
                console.debug(
                  'error loading ' + item.soundfile + ' in the soundboard!'
                );
              },
            })
          );
        })
        .catch((binErr) => {
          console.debug(item.soundfile);
          console.debug(binErr);
        });
      //}
    }
  }

  /**
   * Loads a list of sound commands and/or timers to the sounds register
   *
   * @public
   * @method loadSounds
   *
   * @param {array} soundElements The array of sound commands and/or timers that should be added
   * to the sounds register.
   */

  async loadSounds(soundElements) {
    if (this.currentUser.isTauri) {
      await soundElements.map(async (item) => {
        if (item.soundfile) {
          let src = item.soundfile;
          await invoke('binary_loader', { filepath: src })
            .then(async (response) => {
              // We get the file extension to use it for the type
              let extension = src.split(/[#?]/)[0].split('.').pop().trim();
              // converted the arraybuffer to a arraybufferview
              let arrayBufferView = new Uint8Array(await response);

              // console.debug(arrayBufferView);
              // create a blob from this
              let blob = new Blob([arrayBufferView], {
                type: 'data:audio/' + extension,
              });
              // then used the .createObjectURL to create a a DOMString containing a URL representing the object given in the parameter
              let howlSource = URL.createObjectURL(blob);
              // console.debug(howlSource);

              let itExist = this.sounds.has(await item.get('id'));
              if (itExist) {
                let oldsound = this.sounds.get(await item.get('id'));
                oldsound.unload();
                this.sounds.delete(item.get('id'));
                console.debug(
                  'Sound ' + item.name + ' already exist, replacing...'
                );
              }

              // then inatialize the new howl in the sound library
              this.sounds.set(
                await item.get('id'),
                new Howl({
                  src: [howlSource],
                  html5: true,
                  volume: item.volume ? item.volume / 100 : 1,
                  format: [extension],
                  onload: function () {
                    console.debug(src + ' loaded in the soundboard');
                  },
                  onloaderror: function () {
                    console.debug('error loading ' + src + ' in the soundboard!');
                  },
                })
              );
            })
            .catch((binErr) => {
              console.debug(src);
              console.debug(binErr);
            });
        }
      });
      console.debug(this.sounds);
    }
  }

  /**
   * Checks for a sound in the sounds register and plays it. Allows sound overlapping if is set in the settings.
   *
   * @public
   * @method playSound
   *
   * @param {string} id The name of the sound that should be played
   * to the sounds register.
   */

  async playSound(item) {
    if (this.currentUser.isTauri) {
      let id = await item.get('id');
      console.debug(id);
      if (id) {
        if (this.globalConfig.config.soundOverlap) {
          console.debug('Sound overlapping');
          let hasSound = this.sounds.has(id);
          if (hasSound) {
            let sound = this.sounds.get(id);
            let duration = sound.duration() * 1000;
            sound.play();

            this.isPlaying = true;
            this.lastPlayed = id;

            later(
              this,
              function () {
                this.isPlaying = false;
              },
              duration
            );
          }
        } else {
          console.debug('No overlapping');
          if (!this.isPlaying) {
            let hasSound = this.sounds.has(id);
            if (hasSound) {
              let sound = this.sounds.get(id);
              let duration = sound.duration() * 1000;
              sound.play();

              this.isPlaying = true;
              this.lastPlayed = id;

              later(
                this,
                function () {
                  this.isPlaying = false;
                },
                duration
              );
            }
          }
        }
      } else {
        console.debug('Empty audio id provided...');
      }
    }
  }

  /**
   * Mutes and stops all sounds in the sounds register
   *
   * @public
   * @method toggle
   */

  @action toggle() {
    this.isEnabled = !this.isEnabled;

    Howler.mute(!this.isEnabled);
    if (!this.isEnabled) {
      Howler.stop();
    }
  }

  /**
   * Removes a Sound instance by its id from the sounds register
   *
   * @public
   * @method removeFromRegister
   *
   * @param {string} id The id of the sound that should be removed
   * from the sounds register.
   */

  async removeFromRegister(id) {
    let hasSound = this.sounds.has(id);
    if (hasSound) {
      let sound = this.sounds.get(id);
      if (sound.state() == 'loaded') {
        sound.unload();
        this.sounds.delete(id);
        console.debug(id + ' removed from the sounds register.');
      }
    }
  }

  /**
   * Gets a Sound instance by id from the sounds register
   *
   * @public
   * @method getSound
   *
   * @param {string} id The id of the sound that should be retrieved
   * from the sounds register.
   *
   * @return {Sound} returns the Sound instance that matches the provided id.
   */
  async getSound(id) {
    return this.sounds.get(id);
  }

  /**
   * Removes a list of sound commands and/or timers to the sounds register
   *
   * @public
   * @method unloadSounds
   *
   * @param {array} soundElements The array of sound commands and/or timers that should be removed
   * from the sounds register.
   */

  async unloadSounds(soundElements) {
    if (soundElements.length > 0) {
      soundElements.forEach((item) => {
        this.removeFromRegister(item.name);
      });
      Howler.stop();
      Howler.unload();
      console.debug(this.sounds);
    }
  }
}
