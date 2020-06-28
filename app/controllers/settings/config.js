import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class ConfigController extends Controller {
  @inject application;
  @inject settings;
  @service router;
  @service headData;

  @tracked isEditing;

  @action closeConfig() {
    this.isEditing = false;
    this.settings.isViewing = false;
    this.router.transitionTo('settings');      
  }
  
  @action editConfig(){
    this.isEditing = true;
  }  
  
  @action saveConfig () {
    // this.settings.isViewing = false;
    this.isEditing = false;
    if(this.model.isdefault){
      this.application.darkreader(this.model.darkmode);
      this.headData.set('darkMode', this.model.darkmode);
    }
    this.model.save();
    this.router.transitionTo('settings.config', this.model);
  }
  
  @action deleteConfig() {
    this.model.destroyRecord().then(() => {
      this.settings.isViewing = false;
      this.isEditing =  false;
      this.router.transitionTo('settings');
    });
  }  
}
