import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { later, cancel } from '@ember/runloop';
import { TrackedArray } from 'tracked-built-ins';
import { inject as service } from '@ember/service';

export default class BotBrainService extends Service {
  @service audio;
  @service globalConfig;
  @service queueHandler;
  @service currentUser;
  @service store;

  @tracked savechat = false;

  @tracked msglist = [];
  get messages() {
    if (this.savechat) {
      return this.msglist || [];
    } else {
      return this.msglist.slice(-45) || [];
    }
  }

  @tracked whisperlist = [];
  get whispers() {
    return this.whisperlist || [];
  }

  @tracked eventlist = [];
  get events() {
    return this.eventlist || [];
  }

  @tracked modactions = [];

  @tracked channel = '';
  @tracked botUsername = '';
  @tracked botPassword = '';

  @tracked botConnected = false;

  @tracked chanId;

  @tracked commands = new TrackedArray();
  get commandlist() {
    return this.commands.filter(
      (command) => command.active && !command.isDeleted,
    );
  }

  get audiocommandslist() {
    return this.commandlist.filter((command) => command.type == 'audio');
  }

  @tracked lastTimerId = '';
  @tracked lastTimerPos = 0;
  @tracked lastTimerOrder = 0;
  @tracked activeTimers = new TrackedArray();

  @tracked timers = new TrackedArray();
  get timersList() {
    return this.timers.filter((timer) => timer.active && !timer.isDeleted);
  }

  @tracked lastmessage = null;
  @tracked lastsongrequest = null;
  @tracked lastevent = null;
  @tracked lastmodaction = null;
  @tracked lastSoundCommand = null;
  get soundPlaying() {
    if (this.lastSoundCommand) {
      return this.lastSoundCommand.isPlaying;
    }
    return false;
  }

  @tracked takesSongRequests = false;

  @action async timersLauncher() {
    let count = 1;
    console.debug('Scheduling timers...');
    if (this.currentUser.isTauri) {
      let audioTimersList = this.timersList.filter(
        (timer) => timer.type == 'audio',
      );
      if ((await audioTimersList.length) > 0) {
        if ((await this.timersList.length) > 0) {
          this.audio.loadSounds(audioTimersList);
        } else {
          console.debug('No sound timers to load in soundboard!');
        }
      }
    }
    console.debug(this.timersList);
    this.activeTimers = new TrackedArray();
    this.timersList.map((timer) => {
      this.timerScheduler(timer, count);
      count = count + 1;
    });
  }

  /*
    The timer scheduler works the following way:
    Timers are fired when two criteria are met: 
    - The specified time has passed
    - The amount of lines between the previous timer and the moment 
     the new one is scheduled is bigger than the specified number of lines in the settings.
    If the number of lines is not bigger the timer will be rescheduled the specified time 
    ahead over and over again until the number of chat lines required have been reached.
    
    The scheduler also avoids to fire the same timer twice in a row.
  */
  @action async timerScheduler(timer, order) {
    if (
      !timer.hasDirtyAttributes &&
      !timer.isDeleted &&
      this.botConnected &&
      this.channel
    ) {
      if (this.activeTimers[timer.id] && !timer.active) {
        //console.debug('The timer was active, cancelling')
        cancel(this.activeTimers[timer.id].action);
        this.activeTimers.splice(timer.id, 1);
      } else {
        // let canSchedule = false;

        //if(canSchedule){
        let time = this.globalConfig.config.timerTime * 60 * 1000;
        console.debug('Scheduling the timer ' + timer.name + '...');
        this.activeTimers[timer.id] = {
          action: await later(() => {
            if (this.msglist.length > 0) {
              let diff = this.msglist.length - this.lastTimerPos;

              let repeatable =
                this.activeTimers.length == 1
                  ? true
                  : this.lastTimerId != timer.id;

              if (
                diff >= this.globalConfig.config.timerLines &&
                repeatable &&
                this.lastTimerOrder < order
              ) {
                this.lastTimerId = timer.id;
                if (this.timersList.length === order) {
                  this.lastTimerOrder = 0;
                } else {
                  this.lastTimerOrder = order;
                }
                this.botclient.say(this.channel, timer.message);
                if (timer.type === 'audio' && this.currentUser.isTauri) {
                  this.audio.playSound(timer);
                }
                this.lastTimerPos = this.msglist.length;
              }
            }
            // If there was an existing timer scheduled we cancel it so we can avoid duplicated timers:
            if (this.activeTimers[timer.id]) {
              cancel(this.activeTimers[timer.id].action);
              this.activeTimers.splice(timer.id, 1);
            }
            this.timerScheduler(timer, order);
          }, time),
          rev: timer.rev,
        };
        //}
      }
    }
    //console.debug(this.activeTimers);
  }

  @action async soundboard() {
    if (this.currentUser.isTauri) {
      console.debug('Loading the soundboard...');
      if ((await this.audiocommandslist.length) > 0) {
        this.audio.loadSounds(this.audiocommandslist);
      } else {
        console.debug('No sound commands to load in soundboard!');
      }
    }
  }

  @action async unloadSoundboard() {
    if (this.currentUser.isTauri) {
      console.debug('Unloading the soundboard...');
      if ((await this.audiocommandslist.length) > 0) {
        this.audio.unloadSounds(this.audiocommandslist);
      } else {
        console.debug('No sound commands to unload in soundboard!');
      }
    }
  }
}
