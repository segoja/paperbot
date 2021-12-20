import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | commands/command', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    let route = this.owner.lookup('route:commands/command');
    assert.ok(route);
  });
});
