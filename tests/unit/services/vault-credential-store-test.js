import { module, test } from 'qunit';
import { setupTest } from 'paperbot/tests/helpers';

module('Unit | Service | vault-credential-store', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(async function () {
    this.credentials = this.owner.lookup('service:vault-credential-store');
    await this.credentials.clear();
  });

  hooks.afterEach(async function () {
    await this.credentials.clear();
  });

  test('saves and loads a passphrase for the current vault', async function (assert) {
    const saved = await this.credentials.save('vault-a', 'TestPass1');

    assert.true(saved);
    assert.true(this.credentials.isRemembered);
    assert.strictEqual(await this.credentials.load('vault-a'), 'TestPass1');
  });

  test('clears a credential belonging to another vault', async function (assert) {
    await this.credentials.save('vault-a', 'TestPass1');

    assert.strictEqual(await this.credentials.load('vault-b'), null);
    assert.false(this.credentials.isRemembered);
    assert.strictEqual(await this.credentials.load('vault-a'), null);
  });

  test('clears a credential that cannot be decrypted', async function (assert) {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    await this.credentials._putRecord({
      id: 'vault-passphrase',
      version: 1,
      vaultId: 'vault-a',
      key,
      iv: crypto.getRandomValues(new Uint8Array(12)),
      ciphertext: new Uint8Array([1, 2, 3]),
    });

    assert.strictEqual(await this.credentials.load('vault-a'), null);
    assert.false(this.credentials.isRemembered);
    assert.ok(this.credentials.error);
  });
});
