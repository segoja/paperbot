import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class CommandController extends Controller {
  @inject commands;
  @service router;

  @tracked isEditing;  
  
  @action closeCommand() {
    this.isEditing = false;
    this.commands.isViewing = false;
    this.router.transitionTo('commands');      
  }
  
  @action editCommand(){
    this.isEditing = true;
  }  
  
  @action saveCommand () {
    this.isEditing = false;
    this.model.save();
  }
  
  @action deleteCommand() {
    this.model.destroyRecord().then(() => {
      this.commands.isViewing = false;
      this.isEditing = false;
      this.router.transitionTo('commands');
    });
  }
}
