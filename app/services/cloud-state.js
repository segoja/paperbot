import { set } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import Service from '@ember/service';

export default class CloudStateService extends Service {
  @tracked cloudPush = false;
  @tracked cloudPull = false;

  setPush(val) {
    set(this, 'cloudPush', (val));
  }

  setPull(val) {
    set(this, 'cloudPull', (val));
  }
}
