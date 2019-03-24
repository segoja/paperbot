import { set } from '@ember/object';
import Service from '@ember/service';

export default Service.extend({
  cloudPush: false,
  cloudPull: false,

  setPush (val) {
    set(this, 'cloudPush', (val));
  },

  setPull (val) {
    set(this, 'cloudPull', (val));
  }
});
