import { attr } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class ClientModel extends Model {
  @attr ('boolean', {defaultValue: true}) defaultbot;
  @attr ('boolean', {defaultValue: true}) defaultchat;
  @attr ('string', {defaultValue: 'bot'}) type;
  
  @attr('string', {defaultValue: ""}) username;
  @attr('string', {defaultValue: ""}) oauth;
  @attr('string', {defaultValue: ""}) channel;  
  @attr ('boolean', {defaultValue: true}) debug;
  @attr ('boolean', {defaultValue: true}) reconnect;
  @attr ('boolean', {defaultValue: true}) secure;
}
