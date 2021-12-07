import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 20;
  @tracked query = '';
}

export default class SettingsController extends Controller {
  @inject ('settings.config') config; 
  @service router;
  @service headData;
  @service store;
  @service currentUser;
  
  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'}
  ];
  
  queryParamsObj = new QueryParamsObj();
  
  @action createConfig() {
    let newConfig = this.store.createRecord('config');
    this.router.transitionTo('settings.config', newConfig.save());
  }


  @action importConfigs(config){
    let newConfig = this.store.createRecord('config');
    newConfig.set('name',config.name);
    newConfig.set('soundsfolder',config.soundsfolder);
    newConfig.set('couchdbuser',config.couchdbuser);
    newConfig.set('couchdbpassword',config.couchdbpassword);
    newConfig.set('couchdburl',config.couchdburl);
    newConfig.set('darkmode',config.darkmode);
    newConfig.set('isdefault',config.isdefault);
    
    newConfig.save();
  }

  @action gridEditConfig(config) {
    this.router.transitionTo('settings.config', config);
  } 

  @action gridDeleteConfig(config) {
    config.destroyRecord().then(() => {
      this.currentUser.isViewing = false;
    });
  } 
   
  @action gotoConfig() {
    alert(this.model.get('lenght'));
    if (this.model.get('lenght') != 0){
      this.router.transitionTo('settings.config', this.model.get('firstObject'));
    } else {
      this.router.transitionTo('settings.config', 'new');
    }
  }
}
