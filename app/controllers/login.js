import Controller from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';

export default class LoginController extends Controller {
  @service session;

  @action authenticate(event) {
    const { target } = event;
    let identification = target.querySelector('#identification').value;
    let password = target.querySelector('#password').value;
    event.preventDefault();
    this.session.authenticate('authenticator:pouch', identification, password).then(() => {
      this.setProperties({identification: '', password: ''});
    }).catch((reason) => {
      this.errorMessage = reason.message || reason;
    });
  }
}
