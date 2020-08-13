import { Model } from 'ember-pouch';
import { readOnly } from '@ember/object/computed';
import { attr, belongsTo } from '@ember-data/model';

export default class StreamModel extends Model {
  @attr('string', {defaultValue: ""}) title;
  @attr('string', {defaultValue: ""}) channel;
  @attr('boolean', {defaultValue: false}) requests;
  @attr('boolean', {defaultValue: false}) finished;
  @attr('date') date;
  
  @attr chatlog;
  @attr songqueue;
  
  @belongsTo('client', { inverse: 'botclientstreams', save: true }) botclient;
  @belongsTo('client', { inverse: 'chatclientstreams', save: true }) chatclient;
  
  @readOnly('botuser.username') botName;
  @readOnly('chatuser.username') chatName;

  @readOnly('botuser.username') botName;
  @readOnly('chatuser.username') chatName;
}
