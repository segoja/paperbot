import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | global-config', function(hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function(assert) {
    let service = this.owner.lookup('service:global-config');
    assert.ok(service);
  });
});
