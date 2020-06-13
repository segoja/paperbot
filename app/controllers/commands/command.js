import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class CommandController extends Controller {
  @inject commands;
  @service router;

  @tracked isEditing;
  
  constructor() {
    super(...arguments);  
    
    // These lines is to allow switching to other routes
    // without losing the active chat history and song queue.
    this.isViewing = true;
  }
  
  @action saveCommand () {
    this.model.save();
  }
  @action deleteCommand() {
    this.model.destroyRecord().then(() => {
      this.commands.isViewing = false;
      this.router.transitionTo('commands');
    });
  }
}
