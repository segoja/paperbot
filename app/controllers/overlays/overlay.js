import Controller, { inject } from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { all } from 'rsvp';

export default class OverlayController extends Controller {
  @inject overlays;
  @inject streams;
  @service router;
  @service globalConfig;
  @service currentUser;

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

  async unlinkChildren() {
    // collect the children before deletion
    var childrenList = [];

    await this.model.streams.slice().forEach((stream) => {
      childrenList.push(stream);
    });

    await this.model.configs.slice().forEach((config) => {
      childrenList.push(config);
    });
    
    var processed = all(childrenList);
    return processed;
  }

  @action deleteOverlay() {
    //Wait for children to be destroyed then destroy the overlay
    this.unlinkChildren().then((children) => {
      this.model.destroyRecord().then(() => {
        console.debug('Unlinking children..');
        this.currentUser.isViewing = false;
        if (children.length > 0) {
          console.debug('Unlinking chidren...');
          children.map(async (child) => {
            return child.save();
          });
        }
        this.router.transitionTo('overlays');
      });
    });
  }
}
