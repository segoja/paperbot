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

    childrenList.push(...(await this.model.configs));

    var processed = all(childrenList);
    return processed;
  }

  @action deleteOverlay() {
    //Wait for children to be destroyed then destroy the overlay
    this.unlinkChildren().then((children) => {
      this.model.destroyRecord().then(async () => {
        console.debug('Unlinking children..');
        this.currentUser.isViewing = false;
        if (children.length > 0) {
          const uniqueChildren = [
            ...new Map(children.map((child) => [child.id, child])).values(),
          ];
          for (let i = 0; i < uniqueChildren.length; i++) {
            await uniqueChildren[i].save();
          }
        }
        this.router.transitionTo('overlays');
      });
    });
  }
}
