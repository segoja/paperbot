import JSONAPIAdapter from '@ember-data/adapter/json-api';

export default class SLNotificationAdapter extends JSONAPIAdapter {  
  host = "https://sockets.streamlabs.com/?token=";
  namespace = "api"; 
  headers = {
   Accept: "application/json"
  };
}