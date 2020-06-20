import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class StreamController extends Controller {
  @inject streams;
  @service router;
  
  @tracked isEditing;

  @action closeStream () {
    this.streams.lastStream = null;
    this.streams.isViewing = false;
    this.isEditing = false;
    this.router.transitionTo('streams.index');      
  }

  @action editStream(){
    this.isEditing = true;
  } 

  @action saveStream () {
    this.isEditing = false;
    this.model.save();
  }

  @action deleteStream() {
    this.model.destroyRecord().then(() => {
      this.streams.lastStream = null;
      this.streams.isViewing = false;
      this.isEditing = false;
      this.router.transitionTo('streams');
    });
  }
}
