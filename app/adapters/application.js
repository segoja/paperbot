import config from '../config/environment';
import PouchDB from 'ember-pouch/pouchdb';
import { Adapter } from 'ember-pouch';
import { assert } from '@ember/debug';
import { isEmpty } from '@ember/utils';
import { inject as service } from '@ember/service';

export default class ApplicationAdapter extends Adapter {
  @service cloudState;
  @service refreshIndicator;
  @service store;
  
  constructor() {
    super(...arguments);

    const localDb = config.local_couch || 'paperbot';

    assert('local_couch must be set', !isEmpty(localDb));

    const db = new PouchDB(localDb, {attachments: true});   
    this.db = db;

    return this;
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
