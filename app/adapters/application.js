import config from '../config/environment';
import PouchDB from 'ember-pouch/pouchdb';
import { Adapter } from 'ember-pouch';
import { assert } from '@ember/debug';
import { isEmpty } from '@ember/utils';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import auth from 'pouchdb-authentication';

PouchDB.plugin(auth);

export default class ApplicationAdapter extends Adapter {
  @service cloudState;
  @service refreshIndicator;
  @service store;  
  
  @service cloudState;
  @service session;
  @service refreshIndicator;
  @service store;
  
  @service globalConfig;
  
  @tracked localDb = '';
  @tracked db = '';
  @tracked remoteDb = '';
  @tracked errorMessage = '';
  @tracked replicationFromHandler = '';
  @tracked replicationToHandler = '';
  
  constructor() {
    super(...arguments);

    this.localDb = config.local_couch || 'paperbot';

    assert('local_couch must be set', !isEmpty(this.localDb));
        
    this.db = new PouchDB(this.localDb, { attachments: true });
    
    this.configRemote();
    
    return this;
  }
  
  configRemote(){
    console.log('Trying to set remote couch replication...');
    // If we have specified a remote CouchDB instance, then replicate our local database to it
    if (this.globalConfig.config.canConnect) {
      console.log('Setting remote couch replication...');
      this.remoteDb = new PouchDB(this.globalConfig.config.remoteUrl, {
        fetch: function (url, opts) {
          opts.credentials = 'include';
          return PouchDB.fetch(url, opts);
        }, 
        attachments: true
      });

      const replicationOptions = {
        live: true,
        retry: true,
        attachments: true
      };

      this.replicationFromHandler = null;
      this.replicationToHandler = null;

      this.remoteDb.on('loggedin', () => {
        console.log('Connected to the cloud.');
        this.replicationFromHandler = this.db.replicate.from(this.remoteDb, replicationOptions);
        this.replicationFromHandler.on('paused', (err) => {
          this.cloudState.setPull(!err);
        }).on('active',() => {
          this.cloudState.setPull(true);
        }).on('error',(err) => {
          console.log(err);
          this.cloudState.online = false;
          this.cloudState.couchError = true;
          // this.session.invalidate();//mark error by loggin out
        });;

        this.replicationToHandler = this.db.replicate.to(this.remoteDb, replicationOptions);
        this.replicationToHandler.on('paused',(err) => {
          this.cloudState.setPush(!err);
        }).on('active',() => {
          this.cloudState.setPush(true);
        }).on('error',(err) => {
          console.log(err);
          this.cloudState.online = false;
          this.cloudState.couchError = true;
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
        console.log('Disconnected from the cloud.');
      });
     
      const { target } = event;
      event.preventDefault();
      return true;
    } else {
      return false;
    }
  }
  
  connectRemote(){
    this.session.authenticate('authenticator:pouch', this.globalConfig.config.username, this.globalConfig.config.password).then(() => {
      console.log("Connection success!");
      this.cloudState.online = true;
      this.cloudState.connectionError = false;
    }).catch((reason) => {
      console.log("Connection failed!");
      // console.log(reason);
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
    this.db.rel.find(recordTypeName, obj.id).then(function(doc) {
      store.pushPayload(recordTypeName, doc);
    });
  }
}
