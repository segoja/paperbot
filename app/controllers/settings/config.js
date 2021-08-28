import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class ConfigController extends Controller {
  @inject application;
  @inject settings;
  @service router;
  @service lightControl;
  @service globalConfig;
  @service store;

  @tracked isEditing;

  @action closeConfig() {
    this.isEditing = false;
    this.settings.isViewing = false;
    this.router.transitionTo('settings');      
  }
  
  @action editConfig(){
    this.isEditing = true;
  }  

  @action setdefBot(client){
    console.log('Into the setdefBot function');
    if(this.model.get('defbotclient.id') != undefined){
      console.log('Changing defbotclient');
      var oldclient = this.store.peekRecord('client', this.model.get('defbotclient.id'));
      oldclient.botclientconfigs.removeObject(this.model).then(()=>{
        oldclient.save().then(()=>{
          this.model.defbotclient = client;
          if(client){
            client.save().then(() => this.model.save());
          } else {
            this.model.save();
          } 
        });
      });      
    } else {
      console.log('Setting defbotclient');      
      //Add the defbotclient to our config
      this.model.defbotclient = client;
      //Save the child then the parent
      if(client){
        client.save().then(() => this.model.save());
      } else {
        this.model.save();
      }    
    }
  }
 
  @action setdefChat(client){
    console.log('Into the setdefChat function');
    if(this.model.get('defchatclient.id') != undefined){
      console.log('Changing defchatclient');
      var oldclient = this.store.peekRecord('client', this.model.get('defchatclient.id'));
      oldclient.chatclientconfigs.removeObject(this.model).then(()=>{
        oldclient.save().then(()=>{
          this.model.defchatclient = client;
          if(client){
            client.save().then(() => this.model.save());
          } else {
            this.model.save();
          }    
        });
      });      
    } else {
      console.log('Setting defchatclient');
      //Add the defchatclient to our config
      this.model.defchatclient = client;
      //Save the child then the parent
      if(client){
        client.save().then(() => this.model.save());
      } else {
        this.model.save();
      }     
    }
  }
  
  @action saveConfig () {
    this.isEditing = false;
    this.model.save().then(()=>{
      this.lightControl.toggleMode(this.model.darkmode);
      this.router.transitionTo('settings.config', this.model);      
    });
  } 
}
