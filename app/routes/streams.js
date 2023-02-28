import Route from '@ember/routing/route';
import { hash } from 'rsvp';
import { inject as service } from '@ember/service';

export default class StreamsRoute extends Route {
  @service router;
  @service store;
  @service currentUser;
  @service session;

  model() {
    var store = this.store;
    return hash({
      model: store.findAll('stream'),
      clients: store.findAll('client'),
      commands: store.findAll('command'),
      songs: store.findAll('song'),
    });
  }

  setupController(controller, models) {
    super.setupController(controller, models);
    controller.setProperties(models);

    this.currentUser.isViewing = false;
  }

  afterModel() {
    this.currentUser.isViewing = false;
  }

  redirect(model, transition) {
    if (transition.targetName === 'streams.index') {
      if (this.currentUser.lastStream) {
        this.router.transitionTo('streams.stream', this.currentUser.lastStream);
      }
    }
  }
}
