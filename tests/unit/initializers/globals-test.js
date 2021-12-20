import Application from '@ember/application';

import config from 'paperbot/config/environment';
import { initialize } from 'paperbot/initializers/globals';
import { module, test } from 'qunit';
import Resolver from 'ember-resolver';
import destroyApp from '../../helpers/destroy-app';

module('Unit | Initializer | globals', function (hooks) {
  hooks.beforeEach(function () {
    this.TestApplication = class TestApplication extends Application {
      modulePrefix = config.modulePrefix;
      podModulePrefix = config.podModulePrefix;
      Resolver = Resolver;
    };
    this.TestApplication.initializer({
      name: 'initializer under test',
      initialize,
    });

    this.application = this.TestApplication.create({ autoboot: false });
  });

  hooks.afterEach(function () {
    destroyApp(this.application);
  });

  // TODO: Replace this with your real tests.
  test('it works', async function (assert) {
    await this.application.boot();

    assert.ok(true);
  });
});
