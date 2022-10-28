import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { getCurrent } from '@tauri-apps/api/window';

export default class IndexRoute extends Route {
  @service store;
  @service router;

  beforeModel() {   
    let currentWindow = getCurrent();
    switch(currentWindow.label) {
      case 'reader':
        this.router.transitionTo('reader');
        break;
      case 'overlay':
        this.router.transitionTo('overlay');
        break;
      default:
        this.router.transitionTo('streams.index');
    }
  } 
}
