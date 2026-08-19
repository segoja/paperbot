import Service, { inject as service } from '@ember/service';
import {
  assertBulkWriteSucceeded,
  createBackupEnvelope,
  parseBackup,
} from 'paperbot/utils/database-backup';

const MAIN_DATABASE_NAME = 'paperbot';

function exportableDocuments(result) {
  return result.rows
    .map((row) => row.doc)
    .filter(
      (document) =>
        document &&
        !document._deleted &&
        !document._id.startsWith('_design/') &&
        !document._id.startsWith('_local/'),
    );
}

async function verifyDatabase(database, expectedDocuments) {
  const result = await database.allDocs();
  const actualIds = result.rows.map((row) => row.id).sort();
  const expectedIds = expectedDocuments.map((document) => document._id).sort();
  if (
    actualIds.length !== expectedIds.length ||
    actualIds.some((id, index) => id !== expectedIds[index])
  ) {
    throw new Error(
      'The restored database did not match the validated backup.',
    );
  }
}

export default class DatabaseBackupService extends Service {
  @service store;
  @service globalConfig;

  async exportMainDatabase() {
    const adapter = this.store.adapterFor('application');
    const result = await adapter.db.allDocs({
      include_docs: true,
      attachments: true,
      binary: false,
    });
    return createBackupEnvelope(exportableDocuments(result));
  }

  async replaceMainDatabase(text) {
    const { documents, warnings, legacy } = parseBackup(text);
    const adapter = this.store.adapterFor('application');
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const staging = adapter.createLocalDatabase(
      `paperbot-restore-stage-${suffix}`,
    );
    const rollback = adapter.createLocalDatabase(
      `paperbot-restore-rollback-${suffix}`,
    );
    let replacement;
    let currentDatabaseDestroyed = false;

    try {
      assertBulkWriteSucceeded(
        await staging.bulkDocs(documents, { new_edits: false }),
        'Backup staging',
      );
      await verifyDatabase(staging, documents);

      const current = await adapter.db.allDocs({
        include_docs: true,
        attachments: true,
        binary: false,
      });
      const currentDocuments = exportableDocuments(current);
      if (currentDocuments.length > 0) {
        assertBulkWriteSucceeded(
          await rollback.bulkDocs(currentDocuments, { new_edits: false }),
          'Rollback snapshot',
        );
        await verifyDatabase(rollback, currentDocuments);
      }

      adapter.disconnectRemoteReplication();
      this.store.unloadAll();
      await adapter.db.destroy();
      currentDatabaseDestroyed = true;

      replacement = adapter.createLocalDatabase(MAIN_DATABASE_NAME);
      assertBulkWriteSucceeded(
        await replacement.bulkDocs(documents, { new_edits: false }),
        'Database replacement',
      );
      await verifyDatabase(replacement, documents);
      adapter.changeDb(replacement);
      await this._removeMissingConfigReferences(documents);

      return { count: documents.length, warnings, legacy };
    } catch (error) {
      if (currentDatabaseDestroyed) {
        await replacement?.destroy().catch(() => {});
        const restored = adapter.createLocalDatabase(MAIN_DATABASE_NAME);
        const rollbackResult = await rollback.allDocs({
          include_docs: true,
          attachments: true,
          binary: false,
        });
        const rollbackDocuments = exportableDocuments(rollbackResult);
        if (rollbackDocuments.length > 0) {
          assertBulkWriteSucceeded(
            await restored.bulkDocs(rollbackDocuments, { new_edits: false }),
            'Rollback restore',
          );
        }
        adapter.changeDb(restored);
      }
      throw error;
    } finally {
      await staging.destroy().catch(() => {});
      await rollback.destroy().catch(() => {});
    }
  }

  async _removeMissingConfigReferences(documents) {
    let config;
    try {
      config = await this.store.findRecord('config', 'ppbconfig', {
        reload: true,
      });
    } catch (error) {
      if (error?.errors?.[0]?.status === '404' || error?.status === 404) return;
      throw error;
    }
    this.globalConfig.config = config;
    config.autoConnect = false;

    const ids = new Set(documents.map((document) => document._id));
    if (config.defBotId && !ids.has(`client_2_${config.defBotId}`)) {
      config.defbotclient = null;
    }
    if (config.defChatId && !ids.has(`client_2_${config.defChatId}`)) {
      config.defchatclient = null;
    }
    if (config.defOverlayId && !ids.has(`overlay_2_${config.defOverlayId}`)) {
      config.defOverlay = null;
    }
    if (config.hasDirtyAttributes) await config.save();
  }
}
