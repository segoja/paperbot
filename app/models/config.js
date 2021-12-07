import { Model } from 'ember-pouch';
import { attr, belongsTo } from '@ember-data/model';

export default class ConfigModel extends Model {
  @attr('string', {defaultValue: ""}) name;
  @attr('string', {defaultValue: ""}) overlayfolder;
  @attr('string', {defaultValue: ""}) couchdbuser;
  @attr('string', {defaultValue: ""}) couchdbpassword;
  @attr('string', {defaultValue: ""}) couchdburl;

  @attr('string', {defaultValue: ""}) externalevents;  
  @attr('string', {defaultValue: ""}) externaleventskey;
  
  @attr('string', {defaultValue: ""}) lastPlayed;

  @attr('string', {defaultValue: ""}) defchannel;

  @belongsTo('client', { inverse: 'botclientconfigs', save: true }) defbotclient;
  @belongsTo('client', { inverse: 'chatclientconfigs', save: true }) defchatclient;

  @attr('boolean', {defaultValue: false}) darkmode;
  @attr('boolean', {defaultValue: false}) isdefault;
    
  get switcher(){
    return this.darkmode;
  }
}