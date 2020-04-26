import config from '../config/environment';
import PouchDB from 'ember-pouch/pouchdb';
import { Adapter } from 'ember-pouch';
import { assert } from '@ember/debug';
import { isEmpty } from '@ember/utils';
import { inject as service } from '@ember/service';
import auth from 'pouchdb-authentication';

PouchDB.plugin(auth);

export default class ApplicationAdapter extends Adapter {
  @service session;
  @service cloudState;
  @service refreshIndicator;

  constructor() {
    super(...arguments);

    const localDb = config.local_couch || 'paperbot';

    assert('local_couch must be set', !isEmpty(localDb));

    const db = new PouchDB(localDb);
    this.set('db', db);

    // If we have specified a remote CouchDB instance, then replicate our local database to it
    if ( config.remote_couch ) {
      const remoteDb = new PouchDB(config.remote_couch, {
        fetch: function (url, opts) {
          opts.credentials = 'include';
          return PouchDB.fetch(url, opts);
        }
      });

      const replicationOptions = {
        live: true,
        retry: true
      };

      db.replicate.from(remoteDb, replicationOptions).on('paused', (err) => {
        this.cloudState.setPull(!err);
      });

      db.replicate.to(remoteDb, replicationOptions).on('denied', (err) => {
        if (!err.id.startsWith('_design/')) {
          //there was an error pushing, probably logged out outside of this app (couch/cloudant dashboard)
          this.session.invalidate();//this cancels the replication

          throw({message: "Replication failed. Check login?"});//prevent doc from being marked replicated
        }
      }).on('paused',(err) => {
        this.cloudState.setPush(!err);
      }).on('error',() => {
        this.session.invalidate();//mark error by loggin out
      });

      this.set('remoteDb', remoteDb);
    }

    return this;
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
