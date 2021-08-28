import { tracked } from '@glimmer/tracking';
import Service from '@ember/service';

export default class PanelStateService extends Service {
  
  // Buttons
  @tracked queueToFile = false;
  @tracked soundBoardEnabled = false;  
  
  // Pannels
  @tracked cpanpending = false;
  @tracked cpanplayed = false;
  @tracked cpanmessages = false;
  @tracked cpanevents = false;  
  @tracked extraPanRight = true;
  @tracked extraPanRightTop = true;
  @tracked extraPanRightBottom = true;  
  @tracked extraPanLeft = true;  
  @tracked extraPanLeftTop = true;  
  @tracked extraPanLeftBottom = true;

  get noPanels(){
    if(!this.extraPanLeft && !this.extraPanRight){
      return true;
    } else {
      return false;
    }
  }
}


