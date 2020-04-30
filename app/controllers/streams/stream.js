import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { empty } from '@ember/object/computed';

export default class StreamController extends Controller {
  @inject streams;
  @service router;
  
  @tracked isEditing;
  
  constructor() {
    super(...arguments);  
    
    // These lines is to allow switching to other routes
    // without losing the active chat history and song queue.
    this.isViewing = true;
  }
  
  @action saveStream () {
    this.model.save();
  }
  @action deleteStream() {
    this.model.destroyRecord().then(() => {
      this.streams.isViewing = false;
      this.router.transitionTo('streams');
    });
  }
}
