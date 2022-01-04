import Model, { attr } from '@ember-data/model';

export default class SongModel extends Model {
  @attr('string', {defaultValue: ""}) twitchuser;
  @attr('string', {defaultValue: ""}) title;
  @attr('date', {defaultValue: ""}) date_added;
}