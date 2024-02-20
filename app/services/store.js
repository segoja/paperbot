// All imports from ember-data/* should be updated to @ember-data/* except for ember-data/store. When you are using ember-data (as opposed to installing the individual packages) you should import from ember-data/store instead of @ember-data/store in order to receive the appropriate configuration of defaults.

import Store from 'ember-data/store';
// import Store from '@ember-data/store';
import Cache from '@ember-data/json-api';

export default class extends Store {
  createCache(storeWrapper) {
    return new Cache(storeWrapper);
  }
}
