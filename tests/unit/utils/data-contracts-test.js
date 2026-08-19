import { module, test } from 'qunit';
import {
  DataContractError,
  assertValidRecordData,
  validateMainDataset,
  validatePouchDocument,
} from 'paperbot/utils/data-contracts';

module('Unit | Utility | data-contracts', function () {
  test('accepts a client oauth value without modifying it', function (assert) {
    const oauth = JSON.stringify({ vaultId: 'vault-a', ciphertext: 'secret' });
    const document = {
      _id: 'client_2_client-a',
      _rev: '1-test',
      data: { oauth },
    };

    const result = validatePouchDocument(document);

    assert.true(result.valid);
    assert.strictEqual(result.document.data.oauth, oauth);
  });

  test('preserves compatible legacy scalar values as warnings', function (assert) {
    const result = validatePouchDocument({
      _id: 'request_2_request-a',
      _rev: '1-test',
      data: { position: '3', timestamp: '', song: '' },
    });

    assert.true(result.valid);
    assert.strictEqual(result.document.data.position, '3');
    assert.strictEqual(result.document.data.timestamp, '');
    assert.strictEqual(result.document.data.song, '');
    assert.strictEqual(result.warnings.length, 2);
  });

  test('rejects invalid asynchronous values before persistence', function (assert) {
    assert.throws(
      () => assertValidRecordData('request', { position: Promise.resolve(3) }),
      DataContractError,
    );
  });

  test('validates config writes without treating config as main backup data', function (assert) {
    const data = assertValidRecordData('config', {
      name: 'Local settings',
      defbotclient: null,
      premiumThreshold: 5,
    });

    assert.strictEqual(data.name, 'Local settings');
    const result = validatePouchDocument({
      _id: 'config_2_ppbconfig',
      _rev: '1-test',
      data,
    });
    assert.false(result.valid);
  });

  test('preserves unknown records but rejects duplicates and config records', function (assert) {
    const client = {
      _id: 'client_2_a',
      _rev: '1-test',
      data: { oauth: 'oauth:value' },
    };
    const legacy = {
      _id: 'author_2_a',
      _rev: '1-test',
      data: { name: 'Legacy' },
    };
    const result = validateMainDataset([
      client,
      client,
      legacy,
      { _id: 'config_2_ppbconfig', _rev: '1-test', data: {} },
    ]);

    assert.false(result.valid);
    assert.true(result.errors.includes('Duplicate document id: client_2_a'));
    assert.true(
      result.errors.some((error) => error.includes('Config documents')),
    );
    assert.true(result.warnings.some((warning) => warning.includes('author')));
  });

  test('rejects malformed revisions and unsafe nested data', function (assert) {
    const circular = {};
    circular.self = circular;
    const result = validateMainDataset([
      { _id: 'song_2_bad-rev', _rev: 'invalid', data: {} },
      { _id: 'song_2_unsafe', _rev: '1-test', data: { nested: circular } },
    ]);

    assert.false(result.valid);
    assert.true(result.errors.some((error) => error.includes('revision')));
    assert.true(
      result.errors.some((error) => error.includes('circular reference')),
    );
  });
});
