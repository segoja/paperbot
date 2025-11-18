import Base from 'ember-simple-auth/authenticators/base';
import { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';
import { reject } from 'rsvp';

export default class PouchAuthenticator extends Base {
  @service store;

  getDb() {
    let pouchAdapter = this.store.adapterFor('application'); //getOwner(this).lookup(`adapter:${pouchAdapterName}`);
    return pouchAdapter.remoteDb;
  }

  restore(data) {
    return this.getDb()
      .getSession()
      .then((resp) => {
        let result = null;
        if (!isEmpty(data.name) && resp.userCtx.name === data.name) {
          result = resp.userCtx;
          this.getDb().emit('loggedin');
        } else {
          result = reject('Not logged in or incorrect user in cookie');
        }

        return result;
      });
  }

  authenticate(username, password) {
    return this.getDb()
      .login(username, password)
      .then(() => this.getDb().getSession())
      .then((resp) => {
        this.getDb().emit('loggedin');
        return resp.userCtx;
      });
  }

  invalidate() {
    let result = this.getDb().logout();
    this.getDb().emit('loggedout');
    return result;
  }
}
