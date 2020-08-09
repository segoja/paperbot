import { Model } from 'ember-pouch';
import { attr, belongsTo } from '@ember-data/model';

export default class ConfigModel extends Model {
  @attr('string', {defaultValue: ""}) name;
  @attr('string', {defaultValue: ""}) overlayfolder;
  @attr('string', {defaultValue: ""}) couchdbuser;
  @attr('string', {defaultValue: ""}) couchdbpassword;
  @attr('string', {defaultValue: ""}) couchdburl;

  @attr('string', {defaultValue: ""}) defchannel;

  @belongsTo('client') defbotclient;
  @belongsTo('client') defchatclient;

  @attr('boolean', {defaultValue: false}) darkmode;
  @attr('boolean', {defaultValue: false}) isdefault;
  
  
  get switcher(){
    return this.darkmode;
  }
}