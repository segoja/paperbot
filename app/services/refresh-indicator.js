import { set } from '@ember/object';
import Service from '@ember/service';
import { later } from '@ember/runloop';

export default Service.extend({
  spin: false,

  kickSpin: function(){
    if(!this.spin){
      set(this, 'spin', true);
      //Set "spin = false" after a timeout.
      later(function(){
        set(this, 'spin', false);
      }.bind(this), 1000);
    }
  }
});
