// import JSONAPIAdapter from '@ember-data/adapter/json-api';
import RESTAdapter from '@ember-data/adapter/rest';

export default class SlsongAdapter extends RESTAdapter {  
  host = "http://paper.bot";
  namespace = "api";
  headers = {
   Accept: "application/json",
   "Content-Type": "application/json"
  };
  // primaryKey = 'id';
  shouldReloadRecord(store, slsong) {
     return true;
  }
  /*
  handleResponse(status) {
    if (503 === status) {
      return new MaintenanceError();
    }
    return this._super(...arguments);
  }*/
  
}