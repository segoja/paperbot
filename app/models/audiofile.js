import { attr } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class AudiofileModel extends Model {
  @attr('string', { defaultValue: '' }) name;
  @attr('string', { defaultValue: '' }) command;
  @attr('boolean', { defaultValue: false }) active;

  @attr('boolean', { defaultValue: false }) admin;
  @attr('boolean', { defaultValue: false }) mod;
  @attr('boolean', { defaultValue: false }) vip;
  @attr('boolean', { defaultValue: false }) sub;

  @attr('number', { defaultValue: 0 }) cooldown;
  @attr('number', { defaultValue: 0 }) timer;
  @attr('string', { defaultValue: '' }) soundfile;
  @attr('number', { defaultValue: 0 }) volume;
  @attr('boolean', { defaultValue: false }) selected;
}
