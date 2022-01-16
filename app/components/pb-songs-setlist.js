import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';

export default class PbStreamEditPendingComponent extends Component {
  @service globalConfig;
  @service queueHandler;
  @service store;
    
  constructor() {
    super(...arguments);
  }

  get scrollPendingPosition(){
    this.queueHandler.lastsongrequest;
    if(this.queueHandler.lastsongrequest){
      return  this.queueHandler.lastsongrequest.position || 0;
    }
    return 0;
  }

  @action async reorderItems(originalList, sortedList) {
    let count = 0;
    sortedList.forEach((item)=>{
      // We do this to prevent saving records that remain the same
      if(item.position != count){
        item.position = count;
        item.save().then(()=>{        
          // console.debug(item.position+'. '+item.title);
        });
      } else {
        console.debug(item.position+'. '+item.title+' remained the same.');
      }
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
  
  @action async removeRequest(request){
    await request.get('song').then(async(song)=>{
      await request.destroyRecord().then(async()=>{
        let times = Number(song.times_requested) + Number(-1);  
        song.times_requested = times;          
        await song.save().then(()=>{
          let count = 0;
          this.queueHandler.pendingSongs.forEach((item)=>{
            item.position = count;
            item.save().then(()=>{        
              console.debug(item.position+'. '+item.title);
            });
            count = Number(count) +1;
          });          
        });
      });
    });
  }
}
