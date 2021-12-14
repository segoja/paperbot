import Model, { attr } from '@ember-data/model';

export default class textFileModel extends Model {
  @attr('string', {defaultValue: ""}) title;
  @attr('string', {defaultValue: ""}) artist; 
  @attr('string', {defaultValue: ""}) lyrics;
  @attr('boolean', {defaultValue: true}) selected; 
  @attr('string') rev;
}