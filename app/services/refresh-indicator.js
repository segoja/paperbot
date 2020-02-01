import { set } from '@ember/object';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';

export default class RefreshIndicatorService extends Service {
  @tracked spin = false;

  kickSpin(){
    if(!this.spin){
      set(this, 'spin', true);
      //Set "spin = false" after a timeout.
      later(function(){
        set(this, 'spin', false);
      }.bind(this), 1000);
    }
  }
}
