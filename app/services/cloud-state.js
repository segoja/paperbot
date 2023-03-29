import { tracked } from '@glimmer/tracking';
import Service from '@ember/service';

export default class CloudStateService extends Service {
  @tracked cloudPush = false;
  @tracked cloudPull = false;
  @tracked online = false;
  @tracked couchError = false;
  @tracked connectionError = false;

  get isOnline(){
    this.online;
  }

  get cloudError() {
    if (this.couchError || this.connectionError) {
      return true;
    }
    return false;
  }

  get isCouchError(){
    return this.couchError;
  }

  get isConnError(){
    return this.couchError;
  }

  setPush(val) {
    this.cloudPush = val;
  }

  setPull(val) {
    this.cloudPull = val;
  }
}
