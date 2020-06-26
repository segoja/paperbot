import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { enable as DarkmodeEnable, disable as DarkmodeDisable,  auto as followSystemColorScheme } from 'darkreader';
export default class ApplicationController extends Controller {
  @service cloudState;
  @service audio;
  @service store;
  @service router;  
  @service headData;
  
  get darkmode(){
    if(this.model.get('lenght') != 0){
      if (this.model.filterBy('isdefault', true).get('firstObject'));
      var config = this.model.filterBy('isdefault', true).get('firstObject');
      return config.darkmode;
    } else {
      return this.headData.darkMode;
    }
  }

  @action toggleMode(){

    if(this.model.get('lenght') != 0){
      if (this.model.filterBy('isdefault', true).get('firstObject'));
      var config = this.model.filterBy('isdefault', true).get('firstObject');
      config.darkmode = !config.darkmode;
      config.save();
      this.headData.set('darkMode', this.darkMode);      
    } else {
      this.headData.set('darkMode', !this.darkMode);
    }

    /*followSystemColorScheme();
    if (this.headData.darkMode){
      DarkmodeDisable();
    } else {
      DarkmodeEnable ({brightness: 100, contrast: 100, sepia: 0});
    }*/    
  }
}
