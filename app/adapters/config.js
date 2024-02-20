import Adapter from './pouch';
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

    // Uncomment the next two lines if you want to use indexeddb:
    //this.db = new PouchDB('i-paperbot-config', { adapter: 'indexeddb', live: true});
    //this.wipePrevDbs();

    // Comment the following line if you want to use indexeddb:
    this.db = new PouchDB('paperbot-config', { adapter: 'idb', live: true });

    return this;
  }

  async wipePrevDbs() {
    const dbs = await window.indexedDB.databases();
    let databases = dbs.filter(
      (db) => db.name.includes('_pouch_') && db.name.includes('paperbot-config')
    );
    if (databases.length > 0) {
      databases.forEach(async (oldPouch) => {
        let oldDb = new PouchDB(oldPouch.name);
        let dnInfo = await oldDb.info();
        if (dnInfo.adapter == 'idb') {
          oldDb.replicate
            .to(this.db, { live: false, retry: false, attachments: true })
            .on('error', async (err) => {
              console.debug('Application: Something exploded while copying');
              console.debug(await err.error);
            })
            .on('complete', async (info) => {
              if (info.ok) {
                console.debug(
                  'Application: Replication from old idb is complete, now deleting...'
                );
                oldDb
                  .destroy()
                  .then(function (response) {
                    console.debug(
                      'Application: Deleted old idb database.',
                      response
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
