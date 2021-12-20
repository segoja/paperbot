import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | streams/stream', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    let route = this.owner.lookup('route:streams/stream');
    assert.ok(route);
  });
});
