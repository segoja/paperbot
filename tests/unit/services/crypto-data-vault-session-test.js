import { module, test } from 'qunit';
import { setupTest } from 'paperbot/tests/helpers';

const PASSPHRASE = 'TestPass1';

module('Unit | Service | crypto-data | vault session', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(async function () {
    this.store = this.owner.lookup('service:store');
    this.cryptoData = this.owner.lookup('service:crypto-data');
    this.credentials = this.owner.lookup('service:vault-credential-store');
    await this.credentials.clear();

    const metadata = await this.cryptoData.createVaultMeta(PASSPHRASE, {
      iterations: 1,
    });
    this.store.createRecord('vault', { id: 'ppb-vault', ...metadata });
    await this.cryptoData.vaultCheck();
  });

  hooks.afterEach(async function () {
    this.cryptoData.lockCurrentVault();
    this.store.unloadAll('vault');
    await this.credentials.clear();
  });

  test('restores a remembered vault session without opening the prompt', async function (assert) {
    assert.true(
      await this.cryptoData.unlockCurrentVault(PASSPHRASE, { remember: true }),
    );
    this.cryptoData.lockCurrentVault();
    this.cryptoData.showVaultModal = false;

    assert.true(await this.cryptoData.initializeVault());
    assert.true(this.cryptoData.isUnlocked);
    assert.false(this.cryptoData.showVaultModal);
  });

  test('an invalid remembered passphrase is cleared and prompts normally', async function (assert) {
    await this.credentials.save(this.cryptoData.vault.vaultId, 'WrongPass1');

    assert.false(await this.cryptoData.initializeVault());
    assert.false(this.cryptoData.isUnlocked);
    assert.true(this.cryptoData.showVaultModal);
    assert.false(this.credentials.isRemembered);
  });

  test('opting out removes an existing remembered passphrase', async function (assert) {
    await this.cryptoData.unlockCurrentVault(PASSPHRASE, { remember: true });

    assert.true(
      await this.cryptoData.unlockCurrentVault(PASSPHRASE, { remember: false }),
    );
    assert.false(this.credentials.isRemembered);
    assert.strictEqual(
      await this.credentials.load(this.cryptoData.vault.vaultId),
      null,
    );
  });

  test('forgetting the device clears persistence and locks the vault', async function (assert) {
    await this.cryptoData.unlockCurrentVault(PASSPHRASE, { remember: true });

    assert.true(await this.cryptoData.forgetDevice());
    assert.false(this.credentials.isRemembered);
    assert.false(this.cryptoData.isUnlocked);
    assert.strictEqual(this.cryptoData.unlockedVaultId, null);
  });
});
