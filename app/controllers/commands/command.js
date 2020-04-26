import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class CommandController extends Controller {
  @inject commands;
  @service router;

  @action saveCommand () {
    this.model.save();
  }
  @action deleteCommand() {
    this.model.destroyRecord().then(() => {
      this.router.transitionTo('commands');
    });
  }
}
