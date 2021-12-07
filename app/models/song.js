import { Model } from 'ember-pouch';
import { attr } from '@ember-data/model';

export default class SongModel extends Model {
  @attr('string', {defaultValue: ""}) title;
  @attr('string', {defaultValue: ""}) artist;
  @attr('string', {defaultValue: ""}) lyrics;
  @attr('string', {defaultValue: ""}) type;   
  
  @attr('string', {defaultValue: ""}) keywords;

  @attr('boolean', {defaultValue: true}) active;

  @attr('boolean', {defaultValue: false}) admin;
  @attr('boolean', {defaultValue: false}) mod;
  @attr('boolean', {defaultValue: false}) vip;
  @attr('boolean', {defaultValue: false}) sub;
  
  @attr('string', {defaultValue: ""}) date_added;  
  @attr('string', {defaultValue: ""}) last_request;  
  
  @attr('number', {defaultValue: ""}) times_requested;
  @attr('number', {defaultValue: ""}) times_played;
  
  @attr('string', {defaultValue: ""}) account;
  
  @attr('string', {defaultValue: ""}) remoteid;  
  
  get fullstring(){
    let string = this.title.toString()+' '+this.artist.toString()+' '+this.keywords.toString();
    return string.toString();
  }
}