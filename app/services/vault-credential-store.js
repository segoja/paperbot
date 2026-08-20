import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

const DATABASE_NAME = 'paperbot-device-secrets';
const DATABASE_VERSION = 1;
const STORE_NAME = 'credentials';
const RECORD_ID = 'vault-passphrase';

export default class VaultCredentialStoreService extends Service {
  @tracked rememberedVaultId = null;
  @tracked error = null;

  get isSupported() {
    return Boolean(
      !globalThis.window?.__TAURI_IPC__ &&
        globalThis.indexedDB &&
        globalThis.crypto?.subtle,
    );
  }

  get isRemembered() {
    return Boolean(this.rememberedVaultId);
  }

  async load(vaultId) {
    this.error = null;
    if (!this.isSupported || !vaultId) return null;

    try {
      const record = await this._getRecord();
      if (!record) {
        this.rememberedVaultId = null;
        return null;
      }

      if (record.version !== 1 || record.vaultId !== vaultId) {
        await this.clear();
        return null;
      }

      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: record.iv },
        record.key,
        record.ciphertext,
      );

      this.rememberedVaultId = vaultId;
      return new TextDecoder().decode(plaintext);
    } catch (_) {
      await this.clear();
      this.error = 'The remembered vault passphrase could not be read.';
      return null;
    }
  }

  async save(vaultId, passphrase) {
    this.error = null;
    if (!this.isSupported || !vaultId || !passphrase) return false;

    try {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(passphrase),
      );

      await this._putRecord({
        id: RECORD_ID,
        version: 1,
        vaultId,
        key,
        iv,
        ciphertext,
      });
      this.rememberedVaultId = vaultId;
      return true;
    } catch (_) {
      this.rememberedVaultId = null;
      this.error =
        'Paperbot could not remember the passphrase in this browser.';
      return false;
    }
  }

  async clear() {
    this.error = null;
    this.rememberedVaultId = null;
    if (!this.isSupported) return true;

    try {
      const db = await this._openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(RECORD_ID);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      db.close();
      return true;
    } catch (_) {
      this.error = 'Paperbot could not forget the saved passphrase.';
      return false;
    }
  }

  async _getRecord() {
    const db = await this._openDatabase();
    const record = await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .get(RECORD_ID);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return record;
  }

  async _putRecord(record) {
    const db = await this._openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
  }

  _openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB is blocked.'));
    });
  }
}
