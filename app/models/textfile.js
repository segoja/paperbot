import Model,{ attr } from '@ember-data/model';

export default class textFileModel extends Model {
  @attr('string', { defaultValue: '' }) title;
  @attr('string', { defaultValue: '' }) artist;
  @attr('string', { defaultValue: '' }) lyrics;
  @attr('string', { defaultValue: '' }) type;
  @attr('boolean', { defaultValue: false }) selected;

  @attr('string') rev;
}
