import { Model } from 'ember-pouch';
import { attr, hasMany } from '@ember-data/model';

export default class OverlayModel extends Model {
  @attr('string', { defaultValue: '' }) name;
  
  // Queue overlay parts:
  @attr('string', { defaultValue: '' }) qContainer;
  @attr('string', { defaultValue: '' }) qHeader;
  @attr('string', { defaultValue: '' }) qItems;
  
  // Notifications overlay parts:
  @attr('string', { defaultValue: '' }) nContainer;
  @attr('string', { defaultValue: '' }) nHeader;
  @attr('string', { defaultValue: '' }) nItems;
  
  @hasMany('stream', { inverse: 'overlay', save: true, async: true })
  streams;
  @hasMany('config', { inverse: 'defOverlay', save: true, async: true })
  configs;

  @attr('string') rev;
}
