import { attr } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class ClientModel extends Model {
  @attr('string', {defaultValue: ""}) username;
  @attr ('string', {defaultValue: ""}) type;
  @attr('string', {defaultValue: ""}) oauth;
  
  @attr ('boolean', {defaultValue: true}) defaultbot;
  @attr ('boolean', {defaultValue: true}) defaultchat;
  
  @attr('string', {defaultValue: ""}) channel;
  @attr ('boolean', {defaultValue: true}) debug;
  @attr ('boolean', {defaultValue: true}) reconnect;
  @attr ('boolean', {defaultValue: true}) secure;

  get optsgetter(){
    let opts = {
      options: { 
        debug: this.debug, 
      },
      connection: {
        reconnect: this.reconnect,
        secure: this.secure
      },
      identity: {
        username: this.username ? this.username : null,
        password: this.oauth ? this.oauth : null
      },
      //channels: [this.channel ? this.channel : null]
    };
    return opts;
  }
}
