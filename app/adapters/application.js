// import config from '../config/environment';
import Adapter from './pouch';
// import { assert } from '@ember/debug';
// import { isEmpty } from '@ember/utils';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';
import { tracked } from '@glimmer/tracking';

import PouchDB from 'pouchdb-core';
import PouchDBFind from 'pouchdb-find';
import PouchDBRelational from 'relational-pouch';
import idb from 'pouchdb-adapter-idb';
import indexeddb from 'pouchdb-adapter-indexeddb';
import HttpPouch from 'pouchdb-adapter-http';
import mapreduce from 'pouchdb-mapreduce';
import replication from 'pouchdb-replication';
import auth from 'pouchdb-authentication';

PouchDB.plugin(PouchDBFind)
  .plugin(PouchDBRelational)
  .plugin(idb)
  .plugin(indexeddb)
  .plugin(HttpPouch)
  .plugin(mapreduce)
  .plugin(replication)
  .plugin(auth);

/*
  // Pouchdb Modules and plugins loaded are shared in the app, so we only need to load plugins once.
  // In this app config adapter loads before application adapter, so we can comment the following lines to prevent plugin redefinition errors.
*/

export default class ApplicationAdapter extends Adapter {
  @service cloudState;
  @service session;
  @service refreshIndicator;
  @service store;
  @service router;
  @service cryptoData;

  @service globalConfig;

  @tracked localDb = '';
  @tracked db = '';
  @tracked remoteDb = '';
  @tracked errorMessage = '';
  @tracked replicationFromHandler = '';
  @tracked replicationToHandler = '';
  @tracked isRetrying = false;
  @tracked retryDelay = 0;

  replicationOptions = {
    attachments: true,
    live: true,
    retry: true,
    back_off_function: (delay) => {
      console.debug('We are retrying... ');
      if (delay === 0) {
        return 1000;
      }
      return delay * 3;
    },
  };

  constructor() {
    super(...arguments);

    // this.localDb = config.local_couch || 'i-paperbot';
    // assert('local_couch must be set', !isEmpty(this.localDb));

    // this.olddb = new PouchDB('paperbot', { adapter: 'idb', attachments: true });

    // Uncomment the next two lines if you want to use indexeddb:
    // this.db = new PouchDB('i-paperbot', { adapter: 'indexeddb', attachments: true, live: true, });
    // this.wipePrevDbs();

    // Comment the following declaration if you want to use indexeddb:
    this.db = new PouchDB('paperbot', {
      adapter: 'idb',
    });

    this.db.setMaxListeners(50);
    // Comment the following declaration if you want to use indexeddb:
    this.isRetrying = false;
    this.retryDelay = 0;

    // Uncomment and place the next line at the end of wipePrevDbs function.
    // this.configRemote();

    return this;
  }

  async wipePrevDbs() {
    const dbs = await window.indexedDB.databases();
    let databases = dbs.filter(
      (db) =>
        db.name.includes('_pouch_') &&
        db.name.includes('paperbot') &&
        !db.name.includes('paperbot-config'),
    );
    if (databases.length > 0) {
      databases.forEach(async (oldPouch) => {
        let oldDb = new PouchDB(oldPouch.name);
        let dnInfo = await oldDb.info();
        if (dnInfo.adapter == 'idb') {
          oldDb.replicate
            .to(this.db, { live: true, retry: true })
            .on('error', async (err) => {
              console.debug('Application: Something exploded while copying');
              console.debug(await err.error);
            })
            .on('complete', async (info) => {
              if (info.ok) {
                console.debug(
                  'Application: Replication from old idb is complete, now deleting...',
                );
                oldDb
                  .destroy()
                  .then(function (response) {
                    console.debug(
                      'Application: Deleted old idb database.',
                      response,
                    );
                  })
                  .catch(function (err) {
                    console.debug(err);
                  });
              }
            });
        }
      });
    }
    /*if(){
            console.log(dbInfo.adapter);
            //this.olddb = new PouchDB(db.name, { adapter: 'idb', attachments: true });
            //window.indexedDB.deleteDatabase(db.name);
          }*/
  }

  async detectFirstSyncVaultConflict(remoteDb) {
    const localVaultRecord = this.store.peekRecord('vault', 'ppb-vault');
    const localVault = localVaultRecord ? localVaultRecord.serialize() : null;
    console.debug('localVault: ', localVault);

    let remoteVault = null;
    try {
      console.debug('RemoteDb.rel: ', this.db);
      let result = await remoteDb.get('vault_2_ppb-vault');
      console.debug('result: ', result);
      remoteVault = result ?? null;
      remoteVault = {
        id: remoteVault._id,
        ...remoteVault.data,
        rev: remoteVault._rev,
      };
    } catch (error) {
      console.debug('error: ', error);
      remoteVault = null;
    }

    console.debug('remoteVault: ', remoteVault);

    const hasConflict =
      localVault &&
      remoteVault &&
      localVault.vaultId &&
      remoteVault.vaultId &&
      localVault.vaultId !== remoteVault.vaultId;

    return {
      localVault,
      remoteVault,
      hasConflict,
    };
  }

  async configRemote() {
    console.debug('Configuring remote...');
    const isRemoteUrlEncrypted = this.cryptoData.isVaultEncrypted(
      this.globalConfig.config.remoteUrl,
    );
    console.debug('isRemoteUrlEncrypted: ', isRemoteUrlEncrypted);
    const isDatabaseEncrypted = this.cryptoData.isVaultEncrypted(
      this.globalConfig.config.database,
    );
    console.debug('isDatabaseEncrypted: ', isDatabaseEncrypted);

    if (isRemoteUrlEncrypted || isDatabaseEncrypted) {
      console.debug('Url or database is encrypted...');
      /*if (!this.cryptoData.vault) {
        console.debug('There is no vault...');
        return false;
      }*/

      const ok = await this.cryptoData.ensureUnlocked();

      console.debug('ok: ', ok);
      if (!ok) {
        console.debug('Vault is not unlocked...');
        return false;
      } else {
        console.debug('Vault is unlocked...');
      }
    } else {
      console.debug('Nothing is encrypted...');
    }
    // If we have specified a remote CouchDB instance, then replicate our local database to it
    if (this.globalConfig.config.canConnect) {
      console.debug('Configuring remote couch replication...');

      const cloudUrl = await this.cloudState.getCloudUlr(
        this.globalConfig.config,
      );

      this.remoteDb = new PouchDB(cloudUrl, {
        fetch: function (url, opts) {
          opts.credentials = 'include';
          return PouchDB.fetch(url, opts);
        },
      });

      this.replicationFromHandler = null;
      this.replicationToHandler = null;

      this.remoteDb.on('loggedin', async () => {
        await this.detectFirstSyncVaultConflict(this.remoteDb).then(
          async (conflictData) => {
            // console.debug('hasConflict', conflict);
            if (conflictData.hasConflict) {
              // await this.cloudState.setOffline();
              this.cryptoData.conflictData = conflictData;
              this.cryptoData.showVaultModal = true;
              //return false;
            }
            console.debug('Connected to the cloud.');

            await this.db.replicate
              .from(this.remoteDb)
              .then(() => {
                console.debug('Synced with the cloud.');
                if (!this.cryptoData.vault) {
                  this.cryptoData.vaultCheck();
                } else {
                  this.cryptoData.ensureUnlocked();
                }

                this.replicationFromHandler = this.db.replicate.from(
                  this.remoteDb,
                  this.replicationOptions,
                );
                this.replicationFromHandler
                  .on('change', (change) => {
                    // yo, something changed!
                    // console.debug(change);
                    this.cloudState.setPull(change);
                    console.debug('Getting changes from the cloud...');
                  })
                  .on('paused', (info) => {
                    // replication was paused, usually because of a lost connection
                    this.cloudState.setPull(!info);
                    this.cloudState.couchError = true;
                  })
                  .on('active', (info) => {
                    // replication was resumed
                    this.retryDelay = 0;
                    this.cloudState.setPull(true);
                    this.cloudState.couchError = false;
                    console.debug(info);
                  })
                  .on('denied', (err) => {
                    console.debug(
                      'a document failed to replicate from the cloud to local (e.g. due to permissions)',
                    );
                    console.debug(err);
                  })
                  .on('complete', (info) => {
                    // replication was canceled!
                    console.debug('Replication from cloud is over');
                    console.debug(info);
                  })
                  .on('error', async (err) => {
                    // totally unhandled error (shouldn't happen)
                    this.cloudState.online = false;
                    this.cloudState.couchError = true;
                    if (err) {
                      console.debug(err.error);
                      if (
                        (await err.error) === 'unauthorized' &&
                        !this.isRetrying
                      ) {
                        this.isRetrying = true;
                        later(() => {
                          if (this.replicationFromHandler) {
                            this.replicationFromHandler.cancel();
                          }
                          if (this.replicationToHandler) {
                            this.replicationToHandler.cancel();
                          }
                          console.debug('Retrying... A');
                          this.configRemote().then((ok) => {
                            if (!ok) {
                              return;
                            }
                            this.connectRemote();
                          });
                          this.isRetrying = false;
                        }, this.retryDelay);
                      }
                      if (this.retryDelay === 0) {
                        this.retryDelay = 1000;
                      } else {
                        this.retryDelay = this.retryDelay * 3;
                      }
                    }
                    // this.session.invalidate();//mark error by loggin out
                  });

                this.replicationToHandler = this.db.replicate.to(
                  this.remoteDb,
                  this.replicationOptions,
                );
                this.replicationToHandler
                  .on('change', (change) => {
                    // yo, something changed!
                    // console.debug(change);
                    this.cloudState.setPush(change);
                    if (change) {
                      console.debug('Pushing changes to the cloud...');
                    }
                  })
                  .on('paused', (info) => {
                    this.cloudState.setPush(!info);
                    this.cloudState.couchError = true;
                  })
                  .on('active', () => {
                    this.retryDelay = 0;
                    this.cloudState.setPush(true);
                    this.cloudState.couchError = false;
                  })
                  .on('denied', () => {
                    console.debug(
                      'a document failed to replicate to the cloud (e.g. due to permissions)',
                    );
                  })
                  .on('complete', () => {
                    // replication was canceled!
                    console.debug('Replication to the cloud is over');
                  })
                  .on('error', async (err) => {
                    this.cloudState.online = false;
                    this.cloudState.couchError = true;
                    if (err) {
                      console.debug(err.error);
                      if (
                        (await err.error) === 'unauthorized' &&
                        !this.isRetrying
                      ) {
                        this.isRetrying = true;
                        later(() => {
                          if (this.replicationFromHandler) {
                            this.replicationFromHandler.cancel();
                          }
                          if (this.replicationToHandler) {
                            this.replicationToHandler.cancel();
                          }
                          console.debug('Retrying... B');
                          this.configRemote().then((ok) => {
                            if (!ok) return;
                            this.connectRemote();
                          });
                          this.isRetrying = false;
                        }, this.retryDelay);
                      }
                      if (this.retryDelay === 0) {
                        this.retryDelay = 1000;
                      } else {
                        this.retryDelay = this.retryDelay * 3;
                      }
                    }
                  });
              })
              .catch((err) => {
                console.log(err);
              });
          },
        );
      });

      this.remoteDb.on('loggedout', () => {
        if (this.replicationFromHandler) {
          this.replicationFromHandler.cancel();
          this.replicationFromHandler = null;
        }
        if (this.replicationToHandler) {
          this.replicationToHandler.cancel();
          this.replicationToHandler = null;
        }
        this.cloudState.setPull(false);
        this.cloudState.online = false;
        console.debug('Disconnected from the cloud.');
        this.cloudState.setOffline();
      });
      // const { target } = event;
      // event.preventDefault();

      return true;
    } else {
      return false;
    }
  }

  async connectRemote() {
    const isPassEnCrypted = this.cryptoData.isVaultEncrypted(
      this.globalConfig.config.password,
    );
    const isUserEnCrypted = this.cryptoData.isVaultEncrypted(
      this.globalConfig.config.username,
    );

    if (isPassEnCrypted || isUserEnCrypted) {
      console.debug('Pass or user or encrypted...');
      if (!this.cryptoData.vault) return false;

      const ok = await this.cryptoData.ensureUnlocked();

      if (!ok) {
        console.debug('Vault is not unlocked, cancelled...');
        return false;
      } else {
        console.debug('Vault is unlocked...');
      }
    } else {
      console.debug('Pass and user are not encrypted...');
    }

    console.debug('Connecting to remote...');

    const username = await this.cryptoData.newDecryptFromVault(
      this.globalConfig.config.username,
    );
    const password = await this.cryptoData.newDecryptFromVault(
      this.globalConfig.config.password,
    );

    this.session
      .authenticate('authenticator:pouch', username, password)
      .then(() => {
        console.debug('Connection success!');
        this.cloudState.online = true;
        this.cloudState.connectionError = false;
      })
      .catch((reason) => {
        console.debug('Connection failed!');
        console.debug(reason);
        this.cloudState.connectionError = true;
        this.cloudState.online = false;
        this.errorMessage = reason.message || reason;
      });
  }

  getAttachment(model, attr) {
    return this.db.rel.getAttachment(
      this.getRecordTypeName(model.constructor),
      model.get('id'),
      model.get(`${attr}.name`),
    );
  }

  wipeDatabase() {
    this.store.unloadAll();
    this.db
      .destroy()
      .then(() => {
        window.location.replace('./');
      })
      .catch(function (err) {
        console.debug(err);
        return false;
      });
  }

  unloadedDocumentChanged(obj) {
    this.refreshIndicator.kickSpin();

    let store = this.store;
    let recordTypeName = this.getRecordTypeName(store.modelFor(obj.type));

    if (recordTypeName != 'config') {
      this.db.rel.find(recordTypeName, obj.id).then(function (doc) {
        store.pushPayload(recordTypeName, doc);
      });
    }
  }
}
