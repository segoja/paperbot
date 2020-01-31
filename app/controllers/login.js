import Controller from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { set } from '@ember/object';

export default class LoginController extends Controller {
  @service session;

  @action authenticate() {
    let { identification, password } = this;
    this.session.authenticate('authenticator:pouch', identification, password).then(() => {
      this.setProperties({identification: '', password: ''});
    }).catch((reason) => {
      set(this, 'errorMessage', reason.message || reason);
    });
  }
}
