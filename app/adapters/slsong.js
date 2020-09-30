// import JSONAPIAdapter from '@ember-data/adapter/json-api';
import RESTAdapter from '@ember-data/adapter/rest';

export default class SlsongAdapter extends RESTAdapter {  
  host = "http://paper.bot";
  namespace = "api";
  headers = {
   Accept: "application/json",
   "Content-Type": "application/json"
  };
}