import { run } from '@ember/runloop';

export const helpers = function destroyApp(application) {
  run(application, 'destroy');
}
