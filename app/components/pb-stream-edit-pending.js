import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class PbStreamEditPendingComponent extends Component {
  @service globalConfig;
  @service queueHandler;
    
  constructor() {
    super(...arguments);
    this.queueHandler.scrollPendingPosition = 0;
  }

  @action togglePan(){
    this.globalConfig.config.cpanpending = !this.globalConfig.config.cpanpending; 
    this.globalConfig.config.save();
  }

  @action async reorderItems(originalList, sortedList) {
    let count = 0;
    sortedList.forEach((item)=>{
      item.position = count;
      item.save().then(()=>{        
        // console.debug(item.position+'. '+item.title);
      });
      count = Number(count) +1;
    });
    let playedCount = 0;
    this.queueHandler.playedSongs.reverse().forEach((played)=>{
      played.position = playedCount;
      played.save().then(()=>{        
        // console.debug(played.position+'. '+played.title);
      });
      playedCount = Number(playedCount)+1;
    });
  }
}
