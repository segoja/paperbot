import { tracked } from '@glimmer/tracking';
import Service from '@ember/service';

export default class GlobalConfigService extends Service {
  @tracked config = '';
  
  get defbotclient(){
    if(this.config != ''){
      if(this.config.get('defbotclient.id')){
        return this.config.get('defbotclient.id');
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  get defchatclient(){
    if(this.config != ''){
      if(this.config.get('defchatclient.id')){
        return this.config.get('defchatclient.id');
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  
  get defchannel(){
    if(this.config != ''){
      return this.config.defchannel;
    } else {
      return null;
    }
  }
}


