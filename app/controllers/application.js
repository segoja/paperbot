import Controller from '@ember/controller';
import { action, get } from "@ember/object";
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';

export default class ApplicationController extends Controller {
  @service session;
  @service cloudState;
  
  @action logout() {
    this.session.invalidate();
  }
}
