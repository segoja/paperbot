import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { dialog } from '@tauri-apps/api';

export default class PbTimerComponent extends Component {
  @service audio;
  @service currentUser;
  @tracked saving = false;
  @tracked isPlaying = false;
  @tracked isLoaded = false;

  constructor() {
    super(...arguments);

    if (this.audio.previewSound && this.currentUser.isTauri) {
      if (this.audio.previewSound.playing()) {
        this.audio.previewSound.stop();
      }
      // this.audio.previewSound.unload();
    }

    if (this.args.timer.soundfile && this.currentUser.isTauri) {
      this.audio.loadPreview(this.args.timer.soundfile).then(() => {
        this.audio.previewSound.once('load', () => {
          this.isLoaded = true;
        });
      });
    }
  }

  willDestroy() {
    super.willDestroy(...arguments);
    if (this.soundClip && this.currentUser.isTauri) {
      if (this.soundClip.isPlaying) {
        this.soundClip.stop();
      }
      //this.soundClip = '';
    }
    // this.audio.removeFromRegister('sound', 'preview');
  }

  @action doneEditing() {
    this.args.saveTimer();
    this.saving = true;
    later(() => {
      this.saving = false;
    }, 500);
  }

  @action getAudioPath(timer) {
    if (this.currentUser.isTauri) {
      dialog
        .open({
          directory: false,
          filters: [
            { name: 'Select audio file...', extensions: ['mp3', 'wav', 'ogg'] },
          ],
        })
        .then((path) => {
          if (path != null) {
            //console.debug(path);
            if (path) {
              timer.soundfile = path;
              // timer.save();
              //this.audio.removeFromRegister('preview');
              this.audio.loadPreview(path).then(() => {
                this.audio.previewSound.once('load', () => {
                  this.isLoaded = true;
                });
              });
            }
          }
        });
    }
  }

  get previewLoaded() {
    let status = false;
    if (this.currentUser.isTauri) {
      if (this.audio.previewSound) {
        if (this.audio.previewSound.state() == 'loaded') {
          status = true;
        }
      }
    }
    console.log('Loaded: ' + status);
    return status;
  }

  get previewPlaying() {
    let status = false;
    if (this.currentUser.isTauri) {
      if (this.audio.previewSound) {
        status = this.audio.previewSound.playing();
      }
    }
    console.log('Playing: ' + status);
    return status;
  }

  get isPreviewLoaded() {
    return this.isLoaded;
  }

  get isPreviewPlaying() {
    return this.isPlaying;
  }

  @action adjustVolume(volume) {
    if (this.args.timer.soundfile) {
      if (volume === '') {
        volume = 0;
        this.args.timer.volume = 0;
      }
      if (volume > 100) {
        volume = 100;
        this.args.timer.volume = 100;
      }
      if (isNaN(volume)) {
        volume = 100;
        this.args.timer.volume = 100;
      }
      if (this.previewLoaded && this.currentUser.isTauri) {
        let finalVol = volume / 100;
        console.log('Setting volume to: ' + finalVol);
        this.audio.previewSound.volume(finalVol);
      }
    }
  }

  @action playSound() {
    if (this.args.timer.soundfile && this.currentUser.isTauri) {
      if (this.previewLoaded) {
        this.isLoaded = true;
        if (this.previewPlaying) {
          this.audio.previewSound.stop();
          this.isPlaying = false;
        } else {
          this.audio.previewSound.play();
          this.isPlaying = true;
          let duration = this.audio.previewSound.duration() * 1000;
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
  }
}
