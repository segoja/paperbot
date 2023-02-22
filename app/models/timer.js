import { attr } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class TimerModel extends Model {
  @attr('string', { defaultValue: '' }) name;
  @attr('string', { defaultValue: '' }) type;
  @attr('boolean', { defaultValue: false }) active;
  @attr('number', { defaultValue: 1 }) time;
  @attr('number', { defaultValue: 5 }) chatlines;
  @attr('string', { defaultValue: '' }) message;
  @attr('string', { defaultValue: '' }) soundfile;
  @attr('number', { defaultValue: 0 }) volume;
  @attr('date', { defaultValue: '' }) date_added;
}
