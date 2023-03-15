import { Adapter } from 'ember-pouch';

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
  .plugin(indexeddb)
  .plugin(idb)
  .plugin(HttpPouch)
  .plugin(mapreduce)
  .plugin(replication)
  .plugin(auth);

export default class ConfigAdapter extends Adapter {
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
}
