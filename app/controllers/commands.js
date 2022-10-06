import Controller, { inject } from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 15;
  @tracked query = '';
  @tracked type = '';
}

export default class CommandsController extends Controller {
  @inject ('commands.command') command;
  @service router;
  @service audio;
  @service store;
  @service currentUser;

  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'},
    {'queryParamsObj.type': 'type'}
  ];
  
  queryParamsObj = new QueryParamsObj();

  @tracked commandTypes = ['simple','parameterized','audio'];

  @action createCommand() {
    let newCommand = this.store.createRecord('command');
    newCommand.save().then(()=>{
      this.router.transitionTo('commands.command', newCommand);
    });
  }
  
  @action importCommands(command){
    let newCommand = this.store.createRecord('command');
    newCommand.set('name', command.name);
    newCommand.set('type', command.type);
    newCommand.set('active', command.active);
    newCommand.set('cooldown', command.cooldown);
    newCommand.set('timer', command.timer);
    newCommand.set('response', command.response);
    newCommand.set('soundfile', command.soundfile);
    newCommand.set('volume', command.volume);
    
    newCommand.save();
  }
  
  @action gridEditCommand(command) {
    this.router.transitionTo('commands.command', command);
  } 

  @action gridActiveCommand(command) {
    command.active = !command.active;
    command.save();
    if(command.type === 'audio'){
      if (command.active){     
        this.audio.loadSound(command);          
      } else {
        this.audio.removeFromRegister(command.name);
      }
    }
  } 

  @action gridDeleteCommand(command) {
    if(command.type === 'audio'){
      if (command.active){
        this.audio.removeFromRegister(command.name);
      }
    }   
    
    command.destroyRecord().then(() => {
      this.currentUser.isViewing = false;
    });
  }  
}
