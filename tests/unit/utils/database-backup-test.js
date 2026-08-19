import { module, test } from 'qunit';
import PouchDB from 'pouchdb-core';
import idb from 'pouchdb-adapter-idb';
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  DATA_SCHEMA_VERSION,
  DataContractError,
} from 'paperbot/utils/data-contracts';
import {
  assertBulkWriteSucceeded,
  createBackupEnvelope,
  parseBackup,
} from 'paperbot/utils/database-backup';

PouchDB.plugin(idb);

module('Unit | Utility | database-backup', function () {
  const clientDocument = {
    _id: 'client_2_client-a',
    _rev: '1-test',
    data: { username: 'bot', oauth: 'oauth:plain-or-vault-envelope' },
  };

  test('creates a versioned main database envelope', function (assert) {
    const createdAt = new Date('2026-08-19T10:00:00.000Z');
    const result = createBackupEnvelope([clientDocument], createdAt);

    assert.strictEqual(result.format, BACKUP_FORMAT);
    assert.strictEqual(result.formatVersion, BACKUP_FORMAT_VERSION);
    assert.strictEqual(result.schemaVersion, DATA_SCHEMA_VERSION);
    assert.strictEqual(result.createdAt, createdAt.toISOString());
    assert.strictEqual(
      result.documents[0].data.oauth,
      clientDocument.data.oauth,
    );
  });

  test('accepts legacy main-database arrays', function (assert) {
    const legacyAuthor = {
      _id: 'author_2_legacy',
      _rev: '3-author',
      data: { name: 'Legacy author' },
    };
    const legacyCommand = {
      _id: 'command_2_legacy',
      _rev: '2-command',
      data: { response: null, date_added: null },
    };
    const result = parseBackup(
      JSON.stringify([
        { _id: '_design/idx-test', views: {} },
        clientDocument,
        legacyAuthor,
        legacyCommand,
      ]),
    );

    assert.true(result.legacy);
    assert.strictEqual(result.documents.length, 3);
    assert.deepEqual(result.documents[1], legacyAuthor);
    assert.strictEqual(result.documents[2].data.response, null);
    assert.true(result.warnings.some((warning) => warning.includes('author')));
    assert.true(
      result.warnings.some((warning) => warning.includes('internal database')),
    );
  });

  test('rejects config database records', function (assert) {
    const backup = {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: DATA_SCHEMA_VERSION,
      createdAt: '2026-08-19T10:00:00.000Z',
      documents: [{ _id: 'config_2_ppbconfig', _rev: '1-test', data: {} }],
    };

    assert.throws(() => parseBackup(JSON.stringify(backup)), DataContractError);
  });

  test('rejects newer schemas and malformed JSON', function (assert) {
    assert.throws(() => parseBackup('{'), DataContractError);
    assert.throws(
      () =>
        parseBackup(
          JSON.stringify({
            format: BACKUP_FORMAT,
            formatVersion: BACKUP_FORMAT_VERSION,
            schemaVersion: DATA_SCHEMA_VERSION + 1,
            createdAt: '2026-08-19T10:00:00.000Z',
            documents: [],
          }),
        ),
      DataContractError,
    );
  });

  test('rejects per-document bulk write failures', function (assert) {
    assert.throws(
      () =>
        assertBulkWriteSucceeded(
          [
            { ok: true, id: 'song_2_good', rev: '1-good' },
            {
              error: true,
              id: 'song_2_bad',
              name: 'conflict',
              reason: 'Document update conflict',
            },
          ],
          'Test write',
        ),
      (error) =>
        error instanceof DataContractError &&
        error.errors[0].includes('song_2_bad'),
    );
  });

  test('writes preserved legacy documents into a real staging database', async function (assert) {
    const database = new PouchDB(`paperbot-backup-test-${Date.now()}`, {
      adapter: 'idb',
    });
    const legacyDocuments = [
      clientDocument,
      {
        _id: 'author_2_legacy',
        _rev: '2-author',
        data: { name: 'Legacy author' },
      },
      {
        _id: 'cost_2_default',
        _rev: '1-cost',
        data: { hourLimit: null },
      },
    ];

    try {
      const parsed = parseBackup(JSON.stringify(legacyDocuments));
      assertBulkWriteSucceeded(
        await database.bulkDocs(parsed.documents, { new_edits: false }),
        'Test staging',
      );
      const staged = await database.allDocs({ include_docs: true });

      assert.deepEqual(
        staged.rows.map((row) => row.id).sort(),
        legacyDocuments.map((document) => document._id).sort(),
      );
      assert.strictEqual(
        staged.rows.find((row) => row.id === clientDocument._id).doc.data.oauth,
        clientDocument.data.oauth,
      );
    } finally {
      await database.destroy();
    }
  });
});
