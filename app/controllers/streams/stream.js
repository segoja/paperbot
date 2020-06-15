import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class StreamController extends Controller {
  @inject streams;
  @service router;
  
  @tracked isEditing;

  @action saveStream () {
    this.isEditing = false;
    this.model.save();
  }
  @action deleteStream() {
    this.model.destroyRecord().then(() => {
      this.streams.isViewing = false;
      this.router.transitionTo('streams');
    });
  }
}
