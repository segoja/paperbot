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
  }

  @action willTransition() {
    this.currentUser.isViewing = false;
  }
}
