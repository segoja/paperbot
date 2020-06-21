import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 10;
  @tracked query = '';
  @tracked type = '';
}

export default class CommandsController extends Controller {
  @inject ('commands.command') command;
  @service router;
  @service audio;

  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'},
    {'queryParamsObj.type': 'type'}
  ];
  
  queryParamsObj = new QueryParamsObj();

  @tracked isViewing;
  @tracked commandTypes = ['simple','parameterized','audio'];

  @action createCommand() {
    let newCommand = this.store.createRecord('command');
    this.command.isEditing = true;
    this.router.transitionTo('commands.command', newCommand.save());
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
    this.command.isEditing = true;
    this.router.transitionTo('commands.command', command);
  } 

  @action gridActiveCommand(command) {
    command.active = !command.active;
    command.save();
    if(command.type === 'audio'){
      if (command.active){
        this.audio.load(command.soundfile).asSound(command.name).then(
          function() {
            console.log(command.soundfile+ " loaded in the soundboard");
          }, 
          function() {
            console.log("error loading "+command.soundfile+" in the soundboard!");
          }
        );
      } else {
        this.audio.removeFromRegister('sound', command.name);
        console.log(command.soundfile+ " removed from the soundboard");
      }
    }
  } 

  @action gridDeleteCommand(command) {
    if(command.type === 'audio'){
      if (command.active){
        this.audio.removeFromRegister('sound', command.name);
        console.log(command.soundfile+ " removed from the soundboard");

      }
    }   
    
    command.destroyRecord().then(() => {
      this.isViewing = false;
      this.command.isEditing = false;
    });
  }  
}
