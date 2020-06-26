import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class ConfigController extends Controller {
  @inject settings;
  @service router;

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
    this.settings.isViewing = false;
    this.isEditing = false;
    this.model.save();
  }
  
  @action deleteConfig() {
    this.model.destroyRecord().then(() => {
      this.settings.isViewing = false;
      this.isEditing =  false;
      this.router.transitionTo('settings');
    });
  }  
}
