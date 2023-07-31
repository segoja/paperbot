import { Model } from 'ember-pouch';
import { attr, belongsTo } from '@ember-data/model';
import { readOnly } from '@ember/object/computed';

export default class RequestModel extends Model {
  @attr('date', { defaultValue: '' }) timestamp;
  @attr('string', { defaultValue: '' }) chatid;
  @attr('string', { defaultValue: '' }) externalId;
  @attr('string', { defaultValue: '' }) platform;
  @attr('string', { defaultValue: '' }) type;
  @attr('string', { defaultValue: '' }) user;
  @attr('string', { defaultValue: '' }) displayname;
  @attr('string', { defaultValue: '' }) color;
  @attr('string', { defaultValue: '' }) csscolor;
  @attr('string', { defaultValue: '' }) emotes;

  @attr('number', { defaultValue: 0 }) position;
  
  @attr('number', { defaultValue: 0 }) donation;
  @attr('string', { defaultValue: '' }) donationFormatted;
  @attr('boolean', { defaultValue: false }) isPremium;
  @attr('boolean', { defaultValue: false }) isPlaying;
  
  @attr('boolean', { defaultValue: false }) processed;

  @attr('string', { defaultValue: '' }) title;
  @attr('string', { defaultValue: '' }) artist;

  @belongsTo('song', { async: true, inverse: 'requests' }) song;
  @readOnly('song.title') songTitle;
  @readOnly('song.artist') songArtist;
  @readOnly('song.id') songId;
  @readOnly('song.isDeleted') songDeleted;

  get effectiveTitle() {
    return this.title || this.songTitle;
  }

  get effectiveArtist() {
    return this.artist || this.songArtist;
  }

  get fullText() {
    let text = '';
    text = '"' + this.effectiveTitle + '"';
    if (this.effectiveArtist) {
      text = text + ' by ' + this.effectiveArtist;
    }
    return text;
  }

  @attr('string') rev;
}
