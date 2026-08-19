import Service, { inject as service } from '@ember/service';
import { DATA_SCHEMA_VERSION } from 'paperbot/utils/data-contracts';

const MANIFEST_ID = '_local/paperbot-schema';

export default class DataMigrationsService extends Service {
  @service store;

  async ensureCurrentSchema() {
    await Promise.all([
      this.ensureAdapterSchema('application'),
      this.ensureAdapterSchema('config'),
    ]);
  }

  async ensureAdapterSchema(adapterName) {
    const adapter = this.store.adapterFor(adapterName);
    const db = adapter.db;
    let manifest;

    try {
      manifest = await db.get(MANIFEST_ID);
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    const currentVersion = manifest?.schemaVersion ?? 0;
    if (currentVersion > DATA_SCHEMA_VERSION) {
      throw new Error(
        `${adapterName} database schema ${currentVersion} is newer than supported schema ${DATA_SCHEMA_VERSION}.`,
      );
    }
    if (currentVersion === DATA_SCHEMA_VERSION) return manifest;

    const nextManifest = {
      ...(manifest || { _id: MANIFEST_ID }),
      schemaVersion: DATA_SCHEMA_VERSION,
      migratedAt: new Date().toISOString(),
    };
    await db.put(nextManifest);
    return nextManifest;
  }
}
