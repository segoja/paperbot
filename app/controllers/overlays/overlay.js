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

    await overlay.streams.slice().forEach((stream) => {
      childrenList.push(stream);
    });

    await overlay.configs.slice().forEach((config) => {
      childrenList.push(config);
    });
    
    var processed = all(childrenList);
    return processed;
  }

  @action deleteOverlay() {
    //Wait for children to be destroyed then destroy the overlay
    this.unlinkChildren().then((children) => {
      console.debug('Children unlinked?');
      this.model.destroyRecord().then(() => {
        this.currentUser.isViewing = false;
        var prevchildId = '';
        children.map(async (child) => {
          // We check for duplicated in the child list.
          // Makes no sense to save same model twice without changes (if you do you will get error).
          if (prevchildId != child.id) {
            console.debug('The id of the child: ' + child.id);
            prevchildId = child.id;
            return await child.save();
          }
        });
        this.router.transitionTo('overlays');
      });
    });
  }
}
