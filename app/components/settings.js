import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';
  
export default class Settings extends Component {
  @service globalConfig;
  @service cloudState;
  @service store;
  @service session;
  
  @tracked isSaving;
  @tracked isViewing = false;
  
  @action toggleSettings(){
    this.isViewing = !this.isViewing;
    if(this.isViewing === false){
      if(this.globalConfig.config.hasDirtyAttributes){
        this.args.rollBackSettings();        
      }
    }
  }
  
  @action saveSettings(){
    this.isSaving = true;
    this.globalConfig.currentConfig.save().then((config)=>{
      this.session.invalidate();
      if(!this.cloudState.online){
        console.log('Setting remote backup...');
        if(this.globalConfig.currentConfig.canConnect){
          this.store.adapterFor('application').configRemote();
          this.store.adapterFor('application').connectRemote();
        }
      }
      later(this, function () {
        if(this.cloudState.online){
          this.cloudState.couchError = false;
        }
        this.isSaving = false;
        this.isViewing = false;        
      }, 500);
    });
  }
}
