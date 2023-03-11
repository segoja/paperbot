import Controller, { inject } from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class SongController extends Controller {
  @inject songs;
  @service audio;
  @service router;
  @service currentUser;

  @action closeSong() {
    this.currentUser.isViewing = false;
    this.router.transitionTo('songs');
  }

  @action editSong() {}

  @action saveAndReturnSong() {
    this.saveSong();
    this.router.transitionTo('songs');
  }

  @tracked slsong;

  @action saveSong() {
    console.debug(this.slsong);
    // this.model.remoteid = this.slsong.id;
    this.model.save().then((updatedmodel) => {
      console.debug(updatedmodel);
      /*this.slsong.set('title',updatedmodel.title);
      this.slsong.set('artist',updatedmodel.artist);
      this.slsong.set('songtype',updatedmodel.type);
      this.slsong.set('account',updatedmodel.account);    
      this.slsong.set('is_active',updatedmodel.active);
      this.slsong.set('is_admin',updatedmodel.admin);
      this.slsong.set('is_mod',updatedmodel.mod);
      this.slsong.set('is_vip',updatedmodel.vip);
      this.slsong.set('is_sub',updatedmodel.sub);
      this.slsong.set('date_added',updatedmodel.date_added);
      this.slsong.set('last_played',updatedmodel.last_played);
      this.slsong.set('times_requested',updatedmodel.times_requested);
      this.slsong.set('times_played',updatedmodel.times_played);
      this.slsong.set('pouchrev',updatedmodel.rev);
      this.slsong.set('pouchid',updatedmodel.id);
      this.slsong.save();*/
    });
  }

  @action deleteSong() {
    let requestList = [];
    this.model.requests.forEach((request) => requestList.push(request));
    this.model.destroyRecord().then(() => {
      if (requestList.length > 0) {
        requestList.map((request) => {
          request.save();      
        });
      }
      this.currentUser.isViewing = false;
      this.router.transitionTo('songs');
    });
  }
}
