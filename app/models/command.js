import { attr } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class CommandModel extends Model {
  @attr('string', {defaultValue: ""}) name;
  @attr('string', {defaultValue: ""}) type;
  @attr('string', {defaultValue: "0"}) cooldown;
  @attr('string', {defaultValue: "300"}) timer;
  @attr('string', {defaultValue: ""}) response;
  @attr('string', {defaultValue: ""}) soundfile;
  @attr('string', {defaultValue: "0"}) volume;
}
