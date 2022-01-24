import { attr } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class TimerModel extends Model {
  @attr('string', {defaultValue: ""}) name;
  @attr('string', {defaultValue: ""}) type;
  @attr('boolean', {defaultValue: false}) active;
  @attr('string', {defaultValue: "300"}) time;
  @attr('string', {defaultValue: ""}) message;
  @attr('string', {defaultValue: ""}) soundfile;
  @attr('string', {defaultValue: "0"}) volume;
  @attr('date', {defaultValue: ""}) date_added;
}
