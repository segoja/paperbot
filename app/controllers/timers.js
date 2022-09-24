import Controller, { inject } from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { cancel } from '@ember/runloop';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 15;
  @tracked query = '';
  @tracked type = '';
}

export default class TimersController extends Controller {
  @inject ('timers.timer') timer;
  @service router;
  @service audio;
  @service store;
  @service currentUser;
  @service twitchChat;

  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'},
    {'queryParamsObj.type': 'type'}
  ];
  
  queryParamsObj = new QueryParamsObj();

  @tracked timerTypes = ['simple','audio'];

  @action createTimer() {
    let newTimer = this.store.createRecord('timer');
    this.router.transitionTo('timers.timer', newTimer.save());
  }
  
  @action importTimers(timer){
    let newTimer = this.store.createRecord('timer');
    
    newTimer.set('name', timer.name);
    newTimer.set('type', timer.type);
    newTimer.set('active', timer.active);
    newTimer.set('timer', timer.time);
    newTimer.set('message', timer.message);
    newTimer.set('soundfile', timer.soundfile);
    newTimer.set('volume', timer.volume);
    newTimer.set('date_added', timer.date_added);
    
    newTimer.save();
  }
  
  @action gridEditTimer(timer) {
    this.router.transitionTo('timers.timer', timer);
  } 

  @action gridActiveTimer(timer) {
    timer.active = !timer.active;
    timer.save();
    if(timer.type === 'audio'){
      if (timer.active){
       this.audio.load(timer.soundfile).asSound(timer.name).then(
          function() {
            console.debug(timer.soundfile+ " loaded in the soundboard");
          }, 
          function() {
            console.debug("error loading "+timer.soundfile+" in the soundboard!");
          }
        );
      } else {
        this.audio.removeFromRegister('sound', timer.name);
        console.debug(timer.soundfile+ " removed from the soundboard");
      }
    }
    this.twitchChat.timerScheduler(timer);
  } 

  @action gridDeleteTimer(timer) {
    if(timer.type === 'audio'){
      if (timer.active){
        this.audio.removeFromRegister('sound', timer.name);
        console.debug(timer.soundfile+ " removed from the soundboard");

      }
    }   
    
    timer.destroyRecord().then(() => {
      this.currentUser.isViewing = false;
    });
  }  
}
