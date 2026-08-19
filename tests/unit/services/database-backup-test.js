import { module, test } from 'qunit';
import DatabaseBackupService from 'paperbot/services/database-backup';
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  DATA_SCHEMA_VERSION,
} from 'paperbot/utils/data-contracts';

class FakeDatabase {
  constructor(name, documents = [], failWrites = false) {
    this.name = name;
    this.documents = new Map(
      documents.map((document) => [document._id, document]),
    );
    this.destroyed = false;
    this.failWrites = failWrites;
  }

  async allDocs(options = {}) {
    return {
      rows: [...this.documents.values()].map((document) => ({
        id: document._id,
        doc: options.include_docs ? document : undefined,
      })),
    };
  }

  async bulkDocs(documents) {
    if (this.failWrites) {
      return documents.map((document) => ({
        error: true,
        id: document._id,
        name: 'write_failed',
        reason: 'Simulated write failure',
      }));
    }
    for (const document of documents)
      this.documents.set(document._id, document);
    return documents.map((document) => ({
      ok: true,
      id: document._id,
      rev: document._rev,
    }));
  }

  async destroy() {
    this.destroyed = true;
    this.documents.clear();
  }
}

module('Unit | Service | database-backup', function (hooks) {
  hooks.afterEach(function () {
    this.service?.destroy();
  });

  test('replaces the main database while preserving opaque legacy records', async function (assert) {
    const oldDocument = {
      _id: 'song_2_old',
      _rev: '1-old',
      data: { title: 'Old song' },
    };
    const documents = [
      {
        _id: 'client_2_restored',
        _rev: '4-client',
        data: { oauth: 'oauth:preserve-exactly', type: null },
      },
      {
        _id: 'author_2_legacy',
        _rev: '2-author',
        data: { name: 'Legacy author' },
      },
    ];
    const databases = new Map();
    const adapter = {
      db: new FakeDatabase('paperbot', [oldDocument]),
      disconnected: false,
      createLocalDatabase(name) {
        const database = new FakeDatabase(name);
        databases.set(name, database);
        return database;
      },
      disconnectRemoteReplication() {
        this.disconnected = true;
      },
      changeDb(database) {
        this.db = database;
      },
    };
    const config = {
      autoConnect: true,
      defBotId: null,
      defChatId: null,
      defOverlayId: null,
      hasDirtyAttributes: true,
      async save() {},
    };
    const store = {
      adapterFor(name) {
        assert.strictEqual(name, 'application');
        return adapter;
      },
      unloadAll() {},
      async findRecord(type, id) {
        assert.strictEqual(type, 'config');
        assert.strictEqual(id, 'ppbconfig');
        return config;
      },
    };
    this.service = DatabaseBackupService.create({
      store,
      globalConfig: { config },
    });

    const result = await this.service.replaceMainDatabase(
      JSON.stringify({
        format: BACKUP_FORMAT,
        formatVersion: BACKUP_FORMAT_VERSION,
        schemaVersion: DATA_SCHEMA_VERSION,
        createdAt: '2026-08-19T10:00:00.000Z',
        documents,
      }),
    );

    assert.strictEqual(result.count, 2);
    assert.true(adapter.disconnected);
    assert.false(config.autoConnect);
    assert.deepEqual([...adapter.db.documents.values()], documents);
    assert.false(adapter.db.documents.has(oldDocument._id));
    const staging = [...databases.values()].find((database) =>
      database.name.includes('restore-stage'),
    );
    assert.true(staging.destroyed, 'the staging database was cleaned up');
  });

  test('restores the original database when replacement fails', async function (assert) {
    const oldDocument = {
      _id: 'song_2_old',
      _rev: '3-old',
      data: { title: 'Keep this song' },
    };
    const importedDocument = {
      _id: 'song_2_imported',
      _rev: '2-imported',
      data: { title: 'Imported song' },
    };
    let paperbotCreations = 0;
    const adapter = {
      db: new FakeDatabase('paperbot', [oldDocument]),
      createLocalDatabase(name) {
        if (name === 'paperbot') {
          paperbotCreations++;
          return new FakeDatabase(name, [], paperbotCreations === 1);
        }
        return new FakeDatabase(name);
      },
      disconnectRemoteReplication() {},
      changeDb(database) {
        this.db = database;
      },
    };
    const store = {
      adapterFor() {
        return adapter;
      },
      unloadAll() {},
    };
    this.service = DatabaseBackupService.create({
      store,
      globalConfig: { config: '' },
    });

    await assert.rejects(
      this.service.replaceMainDatabase(
        JSON.stringify({
          format: BACKUP_FORMAT,
          formatVersion: BACKUP_FORMAT_VERSION,
          schemaVersion: DATA_SCHEMA_VERSION,
          createdAt: '2026-08-19T10:00:00.000Z',
          documents: [importedDocument],
        }),
      ),
      /Database replacement failed/,
    );

    assert.strictEqual(paperbotCreations, 2);
    assert.deepEqual([...adapter.db.documents.values()], [oldDocument]);
    assert.false(adapter.db.documents.has(importedDocument._id));
  });
});
