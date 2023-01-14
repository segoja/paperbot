import config from '../config/environment';
import { Adapter } from 'ember-pouch';
import { assert } from '@ember/debug';
import { isEmpty } from '@ember/utils';
import { inject as service } from '@ember/service';

import PouchDB from 'pouchdb-core';
import PouchDBFind from 'pouchdb-find';
import PouchDBRelational from 'relational-pouch';
import indexeddb from 'pouchdb-adapter-indexeddb';
import HttpPouch from 'pouchdb-adapter-http';
import mapreduce from 'pouchdb-mapreduce';
import replication from 'pouchdb-replication';
import auth from 'pouchdb-authentication';

import { getCurrent } from '@tauri-apps/api/window';
import { later } from '@ember/runloop';
import { tracked } from '@glimmer/tracking';

PouchDB.plugin(PouchDBFind)
  .plugin(PouchDBRelational)
  .plugin(indexeddb)
  .plugin(HttpPouch)
  .plugin(mapreduce)
  .plugin(replication)
  .plugin(auth);
  
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

  constructor() {
    super(...arguments);

    this.localDb = config.local_couch || 'paperbot';

    assert('local_couch must be set', !isEmpty(this.localDb));
        
    this.db = new PouchDB(this.localDb, { attachments: true });
    this.isRetrying = false;
    this.retryDelay = 0;
    
    this.configRemote();
    
    
    console.log(this.db.adapter);
    
    this.replicationOptions = {
      live: true,
      retry: true,  
      back_off_function: (delay) => {
        console.log('We are retrying... ');
        if (delay === 0) {
          return 1000;
        }
        return delay * 3;
      },
      attachments: true
    };
    
    return this;
  }
  
  async configRemote(){
    console.debug('Trying to set remote couch replication...');
    // If we have specified a remote CouchDB instance, then replicate our local database to it
    if (this.globalConfig.config.canConnect) {
      console.debug('Setting remote couch replication...');
      this.remoteDb = new PouchDB(this.globalConfig.config.remoteUrl, {
        fetch: function (url, opts) {
          opts.credentials = 'include';
          return PouchDB.fetch(url, opts);
        }, 
        attachments: true
      });

      this.replicationFromHandler = null;
      this.replicationToHandler = null;

      this.remoteDb.on('loggedin', () => {     
        console.debug('Connected to the cloud.');
        this.replicationFromHandler = this.db.replicate.from(this.remoteDb, this.replicationOptions);
        this.replicationFromHandler.on('change', (change) => {
          // yo, something changed!
          // console.debug(change);
          this.cloudState.setPull(change);
          console.debug('Getting changes from the cloud...');
        }).on('paused', (info) => {
          // replication was paused, usually because of a lost connection
          this.cloudState.setPull(!info);
          this.cloudState.couchError = true;
        }).on('active', (info) => {
          // replication was resumed
          this.retryDelay = 0;
          this.cloudState.setPull(true);
          this.cloudState.couchError = false;
        }).on('denied', (err) => {
          console.debug('a document failed to replicate from the cloud to local(e.g. due to permissions) ');
        }).on('complete', (info) => {
          // replication was canceled!
          console.debug('Replication from cloud is over');
        }).on('error', async (err) => {
          // totally unhandled error (shouldn't happen)
          this.cloudState.online = false;
          this.cloudState.couchError = true;
          if(err){
            console.debug(err.error);
            if(await err.error === 'unauthorized' && !this.isRetrying){
              this.isRetrying = true;
              later(() => { 
                if (this.replicationFromHandler){
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

        this.replicationToHandler = this.db.replicate.to(this.remoteDb, this.replicationOptions);
        this.replicationToHandler.on('change', (change) => {
          // yo, something changed!
          // console.debug(change);
          this.cloudState.setPush(change);
          console.debug('Pushing changes to the cloud...');
        }).on('paused',(info) => {
          this.cloudState.setPush(!info);
          this.cloudState.couchError = true;
        }).on('active',() => {
          this.retryDelay = 0;
          this.cloudState.setPush(true);
          this.cloudState.couchError = false;
        }).on('denied', (err) => {
          console.debug('a document failed to replicate to the cloud (e.g. due to permissions)');
        }).on('complete', (info) => {
          // replication was canceled!
          console.debug('Replication to the cloud is over');
        }).on('error',async (err) => {
          this.cloudState.online = false;
          this.cloudState.couchError = true;
          if(err){
            console.debug(err.error);
            if(await err.error === 'unauthorized' && !this.isRetrying){
              this.isRetrying = true;
              later(() => { 
                if (this.replicationFromHandler){
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
        if (this.replicationFromHandler){
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
      });     
     
      // const { target } = event;
      // event.preventDefault();
      return true;
    } else {
      return false;
    }
  }
  
  async connectRemote(){
    this.session.authenticate('authenticator:pouch', this.globalConfig.config.username, this.globalConfig.config.password).then(() => {
      console.debug("Connection success!");
      this.cloudState.online = true;
      this.cloudState.connectionError = false;
    }).catch((reason) => {
      console.debug("Connection failed!");
      // console.debug(reason);
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

  wipeDatabase(){
    this.store.unloadAll();
    this.db.destroy().then(()=>{
      window.location.replace('./');
    }).catch(function (err) {
      console.debug(err);
      return false;
    });
  }
 
  unloadedDocumentChanged(obj) {
    this.refreshIndicator.kickSpin();

    let store = this.store;
    let recordTypeName = this.getRecordTypeName(store.modelFor(obj.type));

    if(recordTypeName != 'config'){
      this.db.rel.find(recordTypeName, obj.id).then(function(doc) {
        store.pushPayload(recordTypeName, doc);
      });
    }
  }
  
}
