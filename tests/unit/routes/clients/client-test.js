import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | clients/client', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    let route = this.owner.lookup('route:clients/client');
    assert.ok(route);
  });
});
