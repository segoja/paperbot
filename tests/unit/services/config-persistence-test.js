import { module, test } from 'qunit';
import { setupTest } from 'paperbot/tests/helpers';
import { assertValidRecordData } from 'paperbot/utils/data-contracts';

module('Unit | Service | config-persistence', function (hooks) {
  setupTest(hooks);

  test('a default serialized config passes the write guard', function (assert) {
    const config = this.owner
      .lookup('service:store')
      .createRecord('config', { id: 'config-write-guard-test' });
    const data = config.serialize({ includeId: true });
    assert.strictEqual(assertValidRecordData('config', data), data);
  });
});
