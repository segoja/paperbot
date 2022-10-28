import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class CloudStateComponent extends Component {
  @service cloudState;
  
  get isOnline(){
    return this.cloudState.online;
  }
  
  get isCloudSynced(){
    return this.cloudState.cloudPush;
  }
  
  get isLocalSynced(){
    return this.cloudState.cloudPull;    
  }
  
}
