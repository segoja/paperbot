import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { getCurrent } from '@tauri-apps/api/window';
import { later } from '@ember/runloop';
import { sort } from '@ember/object/computed';

export default class PbReaderComponent extends Component {
  @service globalConfig;
  
  constructor() {
    super(...arguments);
    
    let currentWindow = getCurrent();
    if(currentWindow.label === 'overlay'){            
      currentWindow.listen('tauri://resize', async function (response) {
        this.globalConfig.config.overlayWidth = response.payload.width; 
        this.globalConfig.config.overlayHeight = response.payload.height;
        later(() => {
          if(this.globalConfig.config.overlayWidth === response.payload.width && this.globalConfig.config.overlayHeight === response.payload.height){
            this.globalConfig.config.save();
            console.debug('Size saved!');
          }          
        }, 500);
      }.bind(this));
      
      currentWindow.listen('tauri://move', async function (response) { 
        this.globalConfig.config.overlayPosX = response.payload.x;
        this.globalConfig.config.overlayPosY = response.payload.y;
        later(() => {
          if(this.globalConfig.config.overlayPosX === response.payload.x && this.globalConfig.config.overlayPosY === response.payload.y){
            this.globalConfig.config.save();
            console.debug('Position saved!.');
          }          
        }, 250);
      }.bind(this));
      
      currentWindow.once('tauri://error', function (e) {
       // an error happened creating the webview window
       console.debug(e);
      });
      
      currentWindow.once('tauri://destroyed', function () {
        //this.queueToFile = false;
        //this.globalConfig.config.showOverlay = false;
        this.globalConfig.config.save();
        console.debug('overlay closed!');
      }.bind(this));      
    }
  }
  
  requestSorting = Object.freeze(['timestamp:asc']);  
  @sort ('args.requests','requestSorting') arrangedContent;
  
  get pendingRequests(){
    let count = 0;
    return this.arrangedContent.filter((request)=>{
      if(!request.processed && count < this.globalConfig.config.overlayLength){
        count =  Number(count) +1
        return request;
      }
    });
  }
}
