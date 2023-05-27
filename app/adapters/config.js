import { Adapter } from 'ember-pouch';
import { inject as service } from '@ember/service';

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
  .plugin(auth)
  .plugin(HttpPouch)
  .plugin(idb)
  .plugin(indexeddb)
  .plugin(mapreduce)
  .plugin(PouchDBRelational)
  .plugin(replication);

export default class ConfigAdapter extends Adapter {
  @service store;

  constructor() {
    super(...arguments);

    // this.olddb = new PouchDB('paperbot-config', { adapter: 'idb' });

    //this.db = new PouchDB('i-paperbot-config', { adapter: 'indexeddb', live: true, retry: true });
    this.db = new PouchDB('paperbot-config', { adapter: 'idb' });

    /*this.olddb.replicate.to(this.db, { live: false, retry: false, attachments: true }).on('error', async (err) => {
      console.debug('Config: Something exploded while copying');
      console.debug(await err.error); 
    }).on('complete', async (info) => { 
      if(info.ok){
        console.debug('Config: Replication from old idb is complete, now deleting...');
        this.olddb.destroy().then(function (response) {
          console.debug('Config: Deleted old idb database.');
        }).catch(function (err) {
          console.debug(err);
        });
      }
    });*/

    return this;
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
}
