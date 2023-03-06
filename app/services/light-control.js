import Service from '@ember/service';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class LightControlService extends Service {
  @service globalConfig;
  @service store;

  get isDark() {
    let config = this.globalConfig.config;
    let status = false;
    if (config) {
      status = config.darkmode;
      let htmlElement = document.getElementsByTagName('html')[0];
      if (status) {
        htmlElement.setAttribute('data-bs-theme', 'dark');
      } else {
        htmlElement.setAttribute('data-bs-theme', '');
      }
    }
    return status;
  }

  // To turn on/of DarkReader:
  @action toggleMode() {
    this.store.findRecord('config', 'ppbconfig').then(async (config) => {
      if (await config) {
        config.darkmode = !config.darkmode;

        config.save().then((savedConfig) => {
          this.globalConfig.config = savedConfig;

          console.debug('Config saved...');
        });
      }
    });
  }
}
