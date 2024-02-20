import Model, { attr, hasMany } from '@ember-data/model';

export default class OverlayModel extends Model {
  @attr('string', { defaultValue: '' }) name;

  @attr('string', { defaultValue: '' }) font;
  // Queue overlay parts:
  @attr('string', { defaultValue: '' }) qContainer;
  @attr('string', { defaultValue: '' }) qItems;
  @attr('string', { defaultValue: '' }) qCss;

  // Notifications overlay parts:
  @attr('string', { defaultValue: '' }) nContainer;
  @attr('string', { defaultValue: '' }) nItems;
  @attr('string', { defaultValue: '' }) nCss;

  @hasMany('config', { inverse: 'defOverlay', save: true, async: true })
  configs;

  @attr('string') rev;
}
