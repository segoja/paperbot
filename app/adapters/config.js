import config from '../config/environment';
import { Adapter } from 'ember-pouch';
import { assert } from '@ember/debug';
import { isEmpty } from '@ember/utils';

import PouchDB from 'pouchdb-core';
import PouchDBFind from 'pouchdb-find';
import PouchDBRelational from 'relational-pouch';
import indexeddb from 'pouchdb-adapter-indexeddb';
import idb from 'pouchdb-adapter-idb';
import HttpPouch from 'pouchdb-adapter-http';
import mapreduce from 'pouchdb-mapreduce';

PouchDB.plugin(PouchDBFind)
  .plugin(PouchDBRelational)
  .plugin(idb)
  .plugin(indexeddb)
  .plugin(HttpPouch)
  .plugin(mapreduce);

export default class ConfigAdapter extends Adapter {

  constructor() {
    super(...arguments);

    const localDb = 'paperbot-config';

    assert('local_couch must be set', !isEmpty(localDb));

    const db = new PouchDB(localDb);
    this.set('db', db);

    return this;
  }
}
