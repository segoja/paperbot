import Controller, { inject } from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class OverlayController extends Controller {
  @inject overlays;
  @inject streams;
  @service router;
  @service globalConfig;
  @service currentUser;
  @service recordLifecycle;

  @action closeOverlay() {
    this.currentUser.isViewing = false;
    this.router.transitionTo('overlays');
  }

  @action editOverlay() {}

  @action saveAndReturnOverlay() {
    this.saveOverlay();
    this.router.transitionTo('overlays');
  }

  @action saveOverlay() {
    this.model.save();
  }

  get config() {
    return this.globalConfig.get('config');
  }

  @action async deleteOverlay() {
    await this.recordLifecycle.deleteOverlay(this.model);
    this.currentUser.isViewing = false;
    this.router.transitionTo('overlays');
  }
}
