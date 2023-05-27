import { attr, hasMany } from '@ember-data/model';
import { Model } from 'ember-pouch';

export default class ClientModel extends Model {
  @attr('string', { defaultValue: '' }) type;

  @attr('string', { defaultValue: '' }) publicKey;
  @attr('string', { defaultValue: '' }) username;
  @attr('string', { defaultValue: '' }) oauth;

  @attr('string', { defaultValue: '' }) channel;
  @attr('boolean', { defaultValue: false }) debug;
  @attr('boolean', { defaultValue: true }) reconnect;
  @attr('boolean', { defaultValue: true }) secure;

  @hasMany('stream', { inverse: 'botclient', async: true })
  botclientstreams;
  @hasMany('stream', { inverse: 'chatclient', async: true })
  chatclientstreams;

  @hasMany('config', { inverse: 'defbotclient', async: true })
  botclientconfigs;
  @hasMany('config', { inverse: 'defchatclient', async: true })
  chatclientconfigs;

  get optsgetter() {
    let opts = '';
    if (this.username && this.oauth) {
      opts = {
        options: {
          debug: this.debug,
          skipUpdatingEmotesets: true,
        },
        connection: {
          reconnect: this.reconnect,
          secure: this.secure,
        },
        identity: {
          username: this.username ? this.username : null,
          password: this.oauth ? this.oauth : null,
        },
        //channels: [this.channel ? this.channel : null]
      };
    }
    return opts;
  }

  @attr('string') rev;
}
