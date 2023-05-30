import { tracked } from '@glimmer/tracking';
import Service from '@ember/service';
import config from '../config/environment';
import {
  shaRegExp,
  versionRegExp,
  versionExtendedRegExp,
} from 'ember-cli-app-version/utils/regexp';

export default class GlobalConfigService extends Service {
  @tracked config = '';
  @tracked showFirstRun = true;
  // Tooltip hide delay
  @tracked ttdelay = 1000;

  popoverevents = ('click', 'hover', 'mouseover');

  get defbotclient() {
    if (this.config != '') {
      if (this.config.get('defbotclient.id')) {
        return this.config.get('defbotclient.id');
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  get defchatclient() {
    if (this.config != '') {
      if (this.config.get('defchatclient.id')) {
        return this.config.get('defchatclient.id');
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  get defchannel() {
    if (this.config != undefined) {
      if (this.config.defchannel != undefined) {
        return this.config.defchannel;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  appVersion() {
    let hash = {};
    let version = config.APP.version;

    // Allow use of 'hideSha' and 'hideVersion' For backwards compatibility
    let versionOnly = hash.versionOnly || hash.hideSha;
    let shaOnly = hash.shaOnly || hash.hideVersion;

    let match = null;

    if (versionOnly) {
      if (hash.showExtended) {
        match = version.match(versionExtendedRegExp); // 1.0.0-alpha.1
      }
      // Fallback to just version
      if (!match) {
        match = version.match(versionRegExp); // 1.0.0
      }
    }

    if (shaOnly) {
      match = version.match(shaRegExp); // 4jds75hf
    }

    return match ? match[0] : version;
  }
}
