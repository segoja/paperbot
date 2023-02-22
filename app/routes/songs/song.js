import Route from '@ember/routing/route';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class SongRoute extends Route {
  @service store;
  @service currentUser;

  model(params) {
    return this.store.findRecord('song', params.song_id);
  }

  beforeModel() {
    this.currentUser.isViewing = true;
    // this.controllerFor('songs.song').slsong = null;
  }

  afterModel(model, transition) {
    /* if(model.remoteid){
      this.store.findRecord('slsong', model.remoteid).then(async (data)=>{
        console.debug("Song found in the remote server!");
        this.controllerFor('songs.song').slsong = await data;
      }, (error)=>{
        console.debug("Song deleted from remote, creating a new remote copy.");
        let restModel = this.store.createRecord('slsong');
        restModel.pouchid = model.id;
        restModel.save().then((savedSlsong)=>{
          this.controllerFor('songs.song').slsong = savedSlsong;        
        }, (error)=>{ 
          console.debug(error);
          console.debug("Can't reach the remote server! uh oh..");
        });
      })    
    } else {
      let restModel = this.store.createRecord('slsong');
      restModel.pouchid = model.id;
      restModel.save().then((savedSlsong)=>{
        this.controllerFor('songs.song').slsong = savedSlsong;        
      }, (error)=>{ 
        console.debug(error);
        console.debug("Can't reach the remote server! uh oh..");
      });
    } */
  }

  @action willTransition() {
    this.currentUser.isViewing = false;
  }
}
