import Route from '@ember/routing/route';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class StreamRoute extends Route {
  @service store;
  @service currentUser;
  @service twitchChat;

  async model(params) {
    return this.store.findRecord('stream', params.stream_id);
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    if (this.currentUser.lastStream) {
      this.currentUser.isViewing = true;
    }
  }
  afterModel(model) {
    this.currentUser.lastStream = model;
    // this.queueHandler.takesSongRequests = model.requests;
  }

  @action willTransition(transition) {
    if (
      transition.targetName === 'streams.index' ||
      transition.targetName === 'index'
    ) {
      if (this.currentUser.lastStream) {
        transition.abort();
      }
    }
  }
}
