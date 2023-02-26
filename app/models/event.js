import { Model } from 'ember-pouch';
import { attr } from '@ember-data/model';

export default class EventModel extends Model {
  @attr('string', { defaultValue: '' }) eventId;
  @attr('date', { defaultValue: '' }) timestamp;
  @attr('string', { defaultValue: '' }) parsedbody;
  @attr('string', { defaultValue: '' }) user;
  @attr('string', { defaultValue: '' }) displayname;
  @attr('string', { defaultValue: '' }) color;
  @attr('string', { defaultValue: '' }) csscolor;
  @attr('string', { defaultValue: '' }) badges;
  @attr('string', { defaultValue: '' }) htmlbadges;
  @attr('string', { defaultValue: '' }) type;
  @attr('string', { defaultValue: '' }) usertype;
  @attr('string', { defaultValue: '' }) reward;
  @attr('string', { defaultValue: '' }) emotes;
}
