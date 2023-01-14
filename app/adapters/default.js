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

export class DefaultAdapter extends Adapter {
  PouchDB = PouchDB;
  
}