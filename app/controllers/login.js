import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';

export default Controller.extend({
  session: service(),

  actions: {
    authenticate() {
      let { identification, password } = this.getProperties('identification', 'password');
      get('session').authenticate('authenticator:pouch', identification, password).then(() => {
        this.setProperties({identification: '', password: ''});
      }).catch((reason) => {
        set('errorMessage', reason.message || reason);
      });
    }
  }
});
