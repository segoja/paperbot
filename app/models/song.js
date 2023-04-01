import { Model } from 'ember-pouch';
import { attr, hasMany } from '@ember-data/model';

export default class SongModel extends Model {
  @attr('string', { defaultValue: '' }) title;
  @attr('string', { defaultValue: '' }) artist;
  @attr('string', { defaultValue: '' }) lyrics;
  @attr('string', { defaultValue: '' }) type;

  @attr('string', { defaultValue: '' }) keywords;

  @attr('boolean', { defaultValue: true }) active;

  @attr('boolean', { defaultValue: false }) admin;
  @attr('boolean', { defaultValue: false }) mod;
  @attr('boolean', { defaultValue: false }) vip;
  @attr('boolean', { defaultValue: false }) sub;

  @attr('date', { defaultValue: '' }) date_added;
  @attr('date', { defaultValue: '' }) last_requested;
  @attr('date', { defaultValue: '' }) last_played;
  
  @attr('number', { defaultValue: 0.85 }) zoomLevel;
  @attr('number', { defaultValue: 0 }) transKey;
  @attr('boolean', { defaultValue: true }) viewMode;

  @hasMany('request', { async: true, inverse: 'song' }) requests;

  @attr('number', { defaultValue: 0 }) times_requested;
  @attr('number', { defaultValue: 0 }) times_played;
  
  @attr('string', { defaultValue: '' }) account;

  @attr('string', { defaultValue: '' }) remoteid;

  get fullstring() {
    let string =
      this.title.toString() +
      ' ' +
      this.artist.toString() +
      ' ' +
      this.keywords.toString();
    return string.toString();
  }

  get fullText() {
    let text = '"' + this.title + '"';
    if (this.artist) {
      text = text + ' by ' + this.artist;
    }
    return text;
  }

  @attr('string') rev;
}
