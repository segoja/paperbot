import Service from '@ember/service';
import SHA512 from 'crypto-js/sha512';
import CryptoJS from 'crypto-js';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

const SALT = '3!D7+q*ZCg9l1*VKJWVe-eG/cOJ)0Jbc)#pcvSY*cxUa7nLQWbxXnT:h)5egM?F8';

export default class CryptoDataService extends Service {
  @service currentUser;
  @service store;
  @service globalConfig;

  @tracked showVaultModal = false;
  @tracked newVaultModal = false;
  @tracked unlockError = null;
  @tracked isUnlocked = false;
  @tracked unlockedVaultId = null;
  @tracked vault = null;

  _sessionPassphrase = null;

  encrypt(data, key) {
    if (data && key) {
      let utf8 = CryptoJS.enc.Utf8.parse(data);
      let pass = CryptoJS.enc.Hex.parse(key);
      let encrypted = CryptoJS.AES.encrypt(utf8, pass, {
        iv: CryptoJS.enc.Hex.parse(SALT),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      return encrypted;
    }
    return '';
  }

  decrypt(data, key) {
    if (data && key) {
      let pass = CryptoJS.enc.Hex.parse(key);
      let decrypted = CryptoJS.AES.decrypt(data, pass, {
        iv: CryptoJS.enc.Hex.parse(SALT),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      let decryptedData = decrypted.toString(CryptoJS.enc.Utf8);
      // console.debug('Decrypted UTF8: '+decryptedData);
      return decryptedData;
    }
    return '';
  }

  newKey(username) {
    let newKey = '';
    if (username) {
      let salt = SALT;
      let userHash = SHA512(username).toString();
      newKey = CryptoJS.PBKDF2(userHash, salt, {
        keySize: 512 / 32,
        iterations: 1000,
      }).toString();
    }
    return newKey;
  }

  /**
   * Migrates old CryptoJS encrypted clients to the new remote vault system (config had nothing encrypted in the old system).
   *
   * @param {string} vault  - the remote dataset vault
   * @param {string} passPhrase - passphrase that must match the remote dataset vault
   * @returns {Promise<{migratedClients:number}>}
   */
  async migrateCryptoJsToVault(vault, passPhrase) {
    const result = { migratedClients: 0 };
    if (!vault || this.isUnlocked) {
      return result;
    }
    const clients = (await this.store.findAll('client')).filter(
      (client) => client.publicKey,
    );
    if (clients.length > 0) {
      for (const client of clients) {
        const decryptedOAuth = this.decrypt(client.oauth, client.publicKey);
        if (decryptedOAuth) {
          // console.debug('Migrating CryptoJS encrypted client: ', client.username, decryptedOAuth);
          client.oauth = await this.encryptForVault(
            passPhrase,
            decryptedOAuth,
            vault,
          );
          client.publicKey = '';
          await client.save();
          result.migratedClients++;
        }
      }
    }
    return result;
  }

  /**
   * Migrates old CryptoJS encrypted client to the new remote vault system (config had nothing encrypted in the old system).
   *
   * @param {string} client  - the client to migrate
   * @returns {Promise<boolean>}
   */
  async migrateSingleCryptoJsToVault(client) {
    if (!client || !this.isUnlocked) {
      return;
    }
    const decryptedOAuth = this.decrypt(client.oauth, client.publicKey);
    if (decryptedOAuth) {
      console.debug('Migrating CryptoJS encrypted client...');
      client.oauth = await this.encryptForVault(
        this._sessionPassphrase,
        decryptedOAuth,
        this.vault,
      );
      client.publicKey = '';
      await client.save();
      return true;
    }
    return false;
  }

  isVaultEncrypted(value) {
    if (typeof value !== 'string') return false;
    try {
      const parsed = JSON.parse(value);
      return !!(
        parsed &&
        typeof parsed === 'object' &&
        Object.prototype.hasOwnProperty.call(parsed, 'vaultId')
      );
    } catch (_) {
      return false;
    }
  }

  /**
   * Migrates secrets between vaults (like when a user changes their passphrase or when there is already an existing vault in CouchDb conflicting with the local one on the existing device when first starting the app).
   *
   * @param {string} oldPassphrase  - passphrase currently used to decrypt secrets on this device
   * @param {string} newPassphrase - passphrase to encrypt secrets for the new vault
   * @returns {Promise<{migratedClients:number, migratedConfigFields:number}>}
   */
  async migrateVault(oldPassphrase, newPassphrase, oldVault, newVault) {
    const result = { migratedClients: 0, migratedConfigFields: 0 };
    if (!oldVault || !newVault) {
      return result;
    }

    const clients = await this.store.findAll('client');

    if (clients.length > 0) {
      for (const client of clients) {
        // Check if it is encrypted, if not, skip
        let isEncrypted = this.isVaultEncrypted(client.oauth);
        if (!isEncrypted) {
          continue;
        }
        const decryptedOAuth = await this.decryptFromVault(
          oldPassphrase,
          client.oauth,
          oldVault,
        );
        if (decryptedOAuth) {
          client.oauth = await this.encryptForVault(
            newPassphrase,
            decryptedOAuth,
            newVault,
          );
          await client.save();
          result.migratedClients++;
        }
      }
    }

    const config = this.globalConfig.config;
    if (!config) {
      return result;
    }

    if (this.isVaultEncrypted(config.username)) {
      const decryptedUsername = await this.decryptFromVault(
        oldPassphrase,
        config.username,
        oldVault,
      );
      config.username = await this.encryptForVault(
        newPassphrase,
        decryptedUsername,
        newVault,
      );
      result.migratedConfigFields++;
    }
    if (this.isVaultEncrypted(config.password)) {
      const decryptedPassword = await this.decryptFromVault(
        oldPassphrase,
        config.password,
        oldVault,
      );
      config.password = await this.encryptForVault(
        newPassphrase,
        decryptedPassword,
        newVault,
      );
      result.migratedConfigFields++;
    }
    if (this.isVaultEncrypted(config.database)) {
      const decryptedDatabase = await this.decryptFromVault(
        oldPassphrase,
        config.database,
        oldVault,
      );
      config.database = await this.encryptForVault(
        newPassphrase,
        decryptedDatabase,
        newVault,
      );
      result.migratedConfigFields++;
    }
    if (this.isVaultEncrypted(config.remoteUrl)) {
      const decryptedRemoteUrl = await this.decryptFromVault(
        oldPassphrase,
        config.remoteUrl,
        oldVault,
      );
      config.remoteUrl = await this.encryptForVault(
        newPassphrase,
        decryptedRemoteUrl,
        newVault,
      );
      result.migratedConfigFields++;
    }

    if (config.hasDirtyAttributes) {
      await config.save();
    }

    return result;
  }

  /**
   * Encrypts a plaintext secret into the v2 envelope bound to the given dataset vault.
   * Returns ONLY the encrypted string (the JSON envelope).
   *
   * Specs:
   * - WebCrypto only: PBKDF2(SHA-256, iterations from vault.kdf) -> AES-GCM(256)
   * - Per-secret random salt (16B) + iv (12B) stored in envelope
   * - Envelope includes vaultId so decrypt can refuse mismatched datasets
   *
   * @param {string} passPhrase
   * @param {string} data
   * @param {VaultModel} vault
   * @returns {Promise<string>}
   */
  async encryptForVault(passPhrase, data, vault) {
    if (!vault) return data;
    const effectivePassPhrase = this._resolvePassphrase(passPhrase, vault);

    // If it's data already encrypted v2 envelope, we return it without further changes.
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (
          parsed &&
          parsed.v === 'v2' &&
          parsed.alg === 'AES-GCM' &&
          typeof parsed.ct === 'string'
        ) {
          return data;
        }
      } catch (error) {
        console.debug('No JSON envelope, continue encryption...');
      }
    }
    if (!globalThis.crypto?.subtle) {
      throw new Error(
        'WebCrypto not available (window.crypto.subtle missing).',
      );
    }

    const plaintext = data == null ? '' : String(data);

    const enc = new TextEncoder();

    const toB64 = (u8) => {
      let s = '';
      for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
      return btoa(s);
    };

    const iterations = vault.kdf?.iterations ?? 310000;
    const hash = vault.kdf?.hash ?? 'SHA-256';

    // Per-secret randomness (required by the spec)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(effectivePassPhrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );

    const aesKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    );

    const ctBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      enc.encode(plaintext),
    );

    return JSON.stringify({
      v: 'v2',
      alg: 'AES-GCM',
      kdf: { name: 'PBKDF2', hash, iterations },
      vaultId: vault.vaultId,
      salt: toB64(salt),
      iv: toB64(iv),
      ct: toB64(new Uint8Array(ctBuf)),
    });
  }

  async newEncryptForVault(data) {
    if (!data) return null;
    if (!this.vault || !this.isUnlocked) return data;

    return await this.encryptForVault(
      this._sessionPassphrase,
      data,
      this.vault,
    );
  }

  /**
   * Decrypts a v2 envelope produced by encryptForVault().
   * Returns ONLY the plaintext string.
   *
   * Specs:
   * - WebCrypto only: PBKDF2(SHA-256, iterations from envelope.kdf or vault.kdf) -> AES-GCM(256)
   * - Uses per-secret salt+iv from the envelope
   * - Refuse decrypt if envelope.vaultId != vault.vaultId
   *
   * @param {string} passPhrase
   * @param {string} encryptedData - v2 envelope JSON string (or plaintext/legacy if allowed by caller)
   * @param {VaultModel} vault
   * @returns {Promise<string>}
   */
  async decryptFromVault(passPhrase, encryptedData, vault) {
    if (!vault) return encryptedData;
    const effectivePassPhrase = this._resolvePassphrase(passPhrase, vault);

    if (!globalThis.crypto?.subtle) {
      throw new Error(
        'WebCrypto not available (window.crypto.subtle missing).',
      );
    }

    // If it's not JSON or not v2, treat as plaintext (legacy handling should be done elsewhere)

    let env;
    try {
      env = JSON.parse(encryptedData);
    } catch (err) {
      console.debug('The data is not encrypted, returned as is...');
      return encryptedData;
    }

    if (
      !env ||
      env.v !== 'v2' ||
      env.alg !== 'AES-GCM' ||
      typeof env.ct !== 'string'
    ) {
      return encryptedData;
    }

    // Hard fail on vault mismatch
    if (env.vaultId && vault.vaultId && env.vaultId !== vault.vaultId) {
      throw new Error(
        'Vault mismatch: secret belongs to a different dataset vault.',
      );
    }

    const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dec = new TextDecoder();
    const enc = new TextEncoder();

    const iterations = env.kdf?.iterations ?? vault.kdf?.iterations ?? 310000;
    const hash = env.kdf?.hash ?? vault.kdf?.hash ?? 'SHA-256';

    if (env.kdf?.name && env.kdf.name !== 'PBKDF2') {
      throw new Error(`Unsupported KDF: ${env.kdf.name}`);
    }
    if (env.alg !== 'AES-GCM') {
      throw new Error(`Unsupported algorithm: ${env.alg}`);
    }

    const salt = fromB64(env.salt);
    const iv = fromB64(env.iv);
    const ct = fromB64(env.ct);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(effectivePassPhrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );

    const aesKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );

    let ptBuf;
    try {
      ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
    } catch (e) {
      // Wrong passphrase or corrupted data
      throw new Error(
        'Decryption failed (wrong passphrase or corrupted ciphertext).',
      );
    }

    const data = dec.decode(ptBuf);

    return data;
  }

  async newDecryptFromVault(encryptedData) {
    console.debug('Decrypting from vault...');
    if (!this.vault || !this.isUnlocked) {
      return encryptedData;
    }

    return await this.decryptFromVault(
      this._sessionPassphrase,
      encryptedData,
      this.vault,
    );
  }

  /**
   * Create (or overwrite) the dataset vault record fields according to the spec.
   * Returns a plain object you can set on an Ember Data vault model and save.
   *
   * vaultSalt: random 16 bytes, base64
   * vaultId: fingerprint derived from passphrase + vaultSalt:
   *   - derive 32-byte key with PBKDF2-SHA-256 + iterations
   *   - SHA-256 the derived key bytes
   *   - base64url-trim as vaultId
   *
   * @param {string} passPhrase
   * @param {object} [opts]
   * @param {number} [opts.iterations=310000]
   * @returns {Promise<{v:string,vaultId:string,vaultSalt:string,alg:string,kdf:{name:string,hash:string,iterations:number},updatedAt:string}>}
   */
  async createVaultMeta(passPhrase, opts = {}) {
    if (!globalThis.crypto?.subtle) {
      throw new Error(
        'WebCrypto not available (window.crypto.subtle missing).',
      );
    }

    const iterations = opts.iterations ?? 310000;
    const hash = 'SHA-256';
    const enc = new TextEncoder();

    const toB64 = (u8) => {
      let s = '';
      for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
      return btoa(s);
    };

    const toB64UrlTrim = (u8) => {
      const b64 = toB64(u8);
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    };

    const vaultSaltBytes = crypto.getRandomValues(new Uint8Array(16));
    const vaultSalt = toB64(vaultSaltBytes);

    // PBKDF2(passPhrase, vaultSalt) -> 32 bytes
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(passPhrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits'],
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: vaultSaltBytes,
        iterations,
        hash,
      },
      baseKey,
      256,
    );

    // vaultId = base64urltrim( SHA-256(derivedKeyBytes) )
    const derivedBytes = new Uint8Array(derivedBits);
    const fpBuf = await crypto.subtle.digest('SHA-256', derivedBytes);
    const vaultId = toB64UrlTrim(new Uint8Array(fpBuf));

    return {
      v: 'v1',
      vaultId,
      vaultSalt,
      alg: 'AES-GCM',
      kdfName: 'PBKDF2',
      kdfHash: hash,
      kdfIterations: iterations,
      updatedAt: new Date().toISOString(),
    };
  }

  async vaultCheck() {
    console.debug('Checking vault meta...');
    this.vault = this.store.peekRecord('vault', 'ppb-vault');
    if (this.vault && this.vault.vaultId) {
      console.debug('Found vault meta!');
      this.unlockedVaultId = this.vault.vaultId;
      this.newVaultModal = false;
    } else {
      console.debug('No vault meta found.');
      this.newVaultModal = true;
    }
    this.showVaultModal = true;
  }

  async unlockCurrentVault(passPhrase) {
    if (!passPhrase) {
      this.lockCurrentVault();
      this.unlockError = 'Passphrase is required.';
      return false;
    }

    const vault = this.vault;
    if (!vault || !vault.vaultId || !vault.vaultSalt) {
      this.lockCurrentVault();
      this.unlockError = 'Vault metadata is missing.';
      return false;
    }

    if (!globalThis.crypto?.subtle) {
      this.lockCurrentVault();
      this.unlockError = 'WebCrypto not available.';
      return false;
    }

    // Proceed to generate a derived key and check existing vaultId to see if it matches
    try {
      const fromB64 = (b64) =>
        Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const toB64 = (u8) => {
        let s = '';
        for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
        return btoa(s);
      };
      const toB64UrlTrim = (u8) =>
        toB64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

      const hash = vault.kdfHash || 'SHA-256';
      const iterations = Number(vault.kdfIterations) || 310000;
      const vaultSaltBytes = fromB64(vault.vaultSalt);
      const enc = new TextEncoder();

      const baseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(passPhrase),
        { name: 'PBKDF2' },
        false,
        ['deriveBits'],
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: vaultSaltBytes,
          iterations,
          hash,
        },
        baseKey,
        256,
      );

      const fpBuf = await crypto.subtle.digest(
        'SHA-256',
        new Uint8Array(derivedBits),
      );
      const derivedVaultId = toB64UrlTrim(new Uint8Array(fpBuf));

      if (derivedVaultId !== vault.vaultId) {
        this.lockCurrentVault();
        this.unlockError = 'Invalid passphrase.';
        return false;
      }

      this._sessionPassphrase = passPhrase;
      this.isUnlocked = true;
      this.unlockedVaultId = vault.vaultId;
      this.unlockError = null;
      this.showVaultModal = false;
      return true;
    } catch (_) {
      this.lockCurrentVault();
      this.unlockError = 'Failed to unlock vault.';
      return false;
    }
  }

  isEncrypted(data) {
    return data.includes('vaultId');
  }

  lockCurrentVault() {
    this._sessionPassphrase = null;
    this.isUnlocked = false;
    this.unlockedVaultId = null;
  }

  _resolvePassphrase(passPhrase, vault) {
    if (typeof passPhrase === 'string' && passPhrase.length > 0) {
      return passPhrase;
    }

    this._requireUnlocked(vault);
    return this._sessionPassphrase;
  }

  _requireUnlocked(vault) {
    if (!this.isUnlocked || !this._sessionPassphrase) {
      console.debug('Vault is locked. Unlock is required for this operation.');
      this.showVaultModal = true;
    }

    if (
      vault?.vaultId &&
      this.unlockedVaultId &&
      vault.vaultId !== this.unlockedVaultId
    ) {
      throw new Error(
        'Vault mismatch: current unlocked session belongs to a different vault.',
      );
    }
  }
}
