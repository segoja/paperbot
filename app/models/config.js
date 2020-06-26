import { Model } from 'ember-pouch';
import { attr } from '@ember-data/model';

export default class ConfigModel extends Model {
  @attr('string', {defaultValue: ""}) name;
  @attr('string', {defaultValue: ""}) soundsfolder;
  @attr('string', {defaultValue: ""}) couchdbuser;
  @attr('string', {defaultValue: ""}) couchdbpassword;
  @attr('string', {defaultValue: ""}) couchdburl;

  @attr('boolean', {defaultValue: false}) darkmode;
  @attr('boolean', {defaultValue: false}) isdefault;
}