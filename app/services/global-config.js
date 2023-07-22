import { tracked } from '@glimmer/tracking';
import Service, { inject as service } from '@ember/service';
import config from '../config/environment';
import {
  shaRegExp,
  versionRegExp,
  versionExtendedRegExp,
} from 'ember-cli-app-version/utils/regexp';

export default class GlobalConfigService extends Service {
  @service currentUser;
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
    if (!this.currentUser.isTauri) {
      this.checkLatestVersion(version);
    }
    return match ? match[0] : version;
  }

  // Assuming we use version tags.
  checkLatestVersion(localV) {
    // We get repo tags
    var url = 'https://api.github.com/repos/segoja/paperbot/tags';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send();
    var tags = JSON.parse(xhr.responseText);
    let remoteV = 0;
    if (tags.length > 0) {
      // Sort tags descending
      tags.sort((a, b) => {
        return this.compareVersions(b.name, a.name);
      });
      // Return the first one

      remoteV = tags[0].name;
      let update = this.compareVersions(localV, remoteV);
      if (update == -1) {
        let origin = window.location.origin;
        window.location.replace(origin);
      }
    }
    return remoteV;
  }

  // To compare versions
  compareVersions(v1, v2) {
    // Separate version numbers by dots:
    var parts1 = v1.split('.');
    var parts2 = v2.split('.');
    // Compare each numeric part:
    for (var i = 0; i < Math.min(parts1.length, parts2.length); i++) {
      var n1 = parseInt(parts1[i]);
      var n2 = parseInt(parts2[i]);
      // If one part is bigger than the other return the result
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    // If one version has more pars than the other one, return the result
    if (parts1.length > parts2.length) return 1;
    if (parts1.length < parts2.length) return -1;
    // If both versions are the same, return 0
    return 0;
  }
}
