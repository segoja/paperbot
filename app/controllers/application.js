import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import DarkReader from 'darkreader';

export default class ApplicationController extends Controller {
  @service cloudState;
  @service audio;
  @service store;
  @service router;  
  @service headData;
  
  get darkmode(){
    if(this.model){
      var config = this.model.filterBy('isdefault', true).get('firstObject');
      if(config !== undefined){
        //this.darkreader(config.switcher);
        return config.switcher;        
      }
    }
    this.darkreader(true);
    return this.headData.darkMode;
  }

  @action darkreader(status){
    if(status){
      DarkReader.enable({
          brightness: 85,
          contrast: 85,
          sepia: 25
      });      
    } else {
      DarkReader.disable(); 
    }
  }
    
  @action toggleMode(){
    
    if(this.model){
      var config = this.model.filterBy('isdefault', true).get('firstObject');
      if(config !== undefined){
        config.darkmode = !config.switcher;
        config.save();
        this.headData.set('darkMode', this.darkmode);
        this.darkreader(this.darkmode);
      } else {
        alert("No hay na!");
        this.headData.set('darkMode', !this.darkmode);
        this.darkreader(!this.darkmode);
      }
    } else {
      alert("No hay na!");
      this.headData.set('darkMode', !this.darkmode);
      this.darkreader(!this.darkmode);
    }
  }
}
