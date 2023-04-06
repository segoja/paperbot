import config from '../config/environment';
import { Adapter } from 'ember-pouch';
import { assert } from '@ember/debug';
import { isEmpty } from '@ember/utils';
import { inject as service } from '@ember/service';

import PouchDB from 'pouchdb-core';

import { later } from '@ember/runloop';
import { tracked } from '@glimmer/tracking';
import { computed } from '@ember/object';

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

    this.localDb = config.local_couch || 'i-paperbot';

    assert('local_couch must be set', !isEmpty(this.localDb));

    // this.olddb = new PouchDB('paperbot', { adapter: 'idb', attachments: true });

    // this.db = new PouchDB('i-paperbot', { adapter: 'indexeddb', attachments: true, live: true, });
    this.db = new PouchDB('paperbot', {
      adapter: 'idb',
      attachments: true,
      live: true,
    });
    this.isRetrying = false;
    this.retryDelay = 0;
    /*
    this.olddb.replicate.to(this.db, { live: false, retry: false, attachments: true }).on('error', async (err) => {
      console.debug('Application: Something exploded while copying');
      console.debug(await err.error); 
    }).on('complete', async (info) => { 
      if(info.ok){
        console.debug('Application: Replication from old idb is complete, now deleting...');
        this.olddb.destroy().then(function (response) {
          console.debug('Application: Deleted old idb database.');
        }).catch(function (err) {
          console.debug(err);
        });
      }
    }); */

    this.configRemote();

    return this;
  }
  @computed('session.isAuthenticated')
  get sessReconnect(){
    //if(this.session.isAuthenticated && !this.cloudState.online){
    // return this.connectRemote();      
    //}
    console.debug('wooooowowowow');
  }

  async configRemote() {
    console.debug('Trying to set remote couch replication...');
    // If we have specified a remote CouchDB instance, then replicate our local database to it
    if (this.globalConfig.config.canConnect) {
      console.debug('Setting remote couch replication to:'+this.globalConfig.config.cloudUrl);  
      this.remoteDb = new PouchDB(this.globalConfig.config.cloudUrl, {
        fetch: function (url, opts) {
          opts.credentials = 'include';
          return PouchDB.fetch(url, opts);
        }
      });

      this.replicationFromHandler = null;
      this.replicationToHandler = null;

      this.remoteDb.on('loggedin', () => {
        console.debug('Connected to the cloud.');
        this.replicationFromHandler = this.db.replicate.from(
          this.remoteDb,
          this.replicationOptions
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
              'a document failed to replicate from the cloud to local (e.g. due to permissions)'
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
              if ((await err.error) === 'unauthorized' && !this.isRetrying) {
                this.isRetrying = true;
                later(() => {
                  if (this.replicationFromHandler) {
                    this.replicationFromHandler.cancel();
                  }
                  if (this.replicationToHandler) {
                    this.replicationToHandler.cancel();
                  }
                  console.debug('Retrying... A');
                  this.configRemote();
                  this.connectRemote();
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
          this.replicationOptions
        );
        this.replicationToHandler
          .on('change', (change) => {
            // yo, something changed!
            // console.debug(change);
            this.cloudState.setPush(change);
            if(change){
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
              'a document failed to replicate to the cloud (e.g. due to permissions)'
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
              if ((await err.error) === 'unauthorized' && !this.isRetrying) {
                this.isRetrying = true;
                later(() => {
                  if (this.replicationFromHandler) {
                    this.replicationFromHandler.cancel();
                  }
                  if (this.replicationToHandler) {
                    this.replicationToHandler.cancel();
                  }
                  console.debug('Retrying... B');
                  this.configRemote();
                  this.connectRemote();
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
    console.debug('Connecting to: '+this.globalConfig.config.cloudUrl);    
    this.session
      .authenticate(
        'authenticator:pouch',
        this.globalConfig.config.username,
        this.globalConfig.config.password
      )
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
      model.get(`${attr}.name`)
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
