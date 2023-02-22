import { Model } from 'ember-pouch';
import { readOnly } from '@ember/object/computed';
import { attr, belongsTo } from '@ember-data/model';

export default class StreamModel extends Model {
  @attr('string', { defaultValue: '' }) title;
  @attr('string', { defaultValue: '' }) channel;
  @attr('boolean', { defaultValue: false }) savechat;
  @attr('boolean', { defaultValue: false }) events;
  @attr('boolean', { defaultValue: false }) requests;
  @attr('boolean', { defaultValue: false }) finished;
  @attr('date') date;

  @attr eventlog;
  @attr chatlog;
  @attr songqueue;

  @belongsTo('client', { inverse: 'botclientstreams', save: true }) botclient;
  @belongsTo('client', { inverse: 'chatclientstreams', save: true }) chatclient;

  @readOnly('botclient.username') botName;
  @readOnly('chatclient.username') chatName;
}
