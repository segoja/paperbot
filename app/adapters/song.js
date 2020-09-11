import JSONAPIAdapter from '@ember-data/adapter/json-api';

export default class ApplicationAdapter extends JSONAPIAdapter {  
  host = "http://paper.bot";
  namespace = "api"; 
  headers = {
   Accept: "application/json"
  };
 
  
}