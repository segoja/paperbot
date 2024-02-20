import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { getCurrent } from '@tauri-apps/api/window';

export default class IndexRoute extends Route {
  @service store;
  @service router;
  @service currentUser;

  beforeModel() {
    if (this.currentUser.isTauri) {
      let currentWindow = getCurrent();
      switch (currentWindow.label) {
        case 'reader':
          this.router.transitionTo('reader');
          break;
        case 'overlay':
          this.router.transitionTo('overlay');
          break;
        default:
          this.router.transitionTo('songs.index');
      }
    } else {
      this.router.transitionTo('songs.index');
    }
  }
}
