import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { get } from '@ember/object';

export default Controller.extend({
  session: service(),
  cloudState: service(),

  actions:{
    logout: function() {
      get(this, 'session').invalidate();
    }
  }
});
