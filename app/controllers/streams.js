import Controller, { inject } from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 10;
  @tracked query = '';
}

export default class StreamsController extends Controller {
  @inject('streams.stream') stream;
  @service router;
  @service store;
  @service globalConfig;
  @service currentUser;

  queryParams = [
    { 'queryParamsObj.page': 'page' },
    { 'queryParamsObj.perPage': 'perPage' },
    { 'queryParamsObj.query': 'query' },
  ];

  queryParamsObj = new QueryParamsObj();

  async defaultSetter(stream) {
    stream.set('date', new Date());

    if (this.globalConfig.defchannel != null) {
      console.debug(this.globalConfig.defchannel);
      stream.set('channel', this.globalConfig.defchannel);
    }

    if (this.globalConfig.defbotclient != null) {
      var botclient = await this.store.peekRecord(
        'client',
        this.globalConfig.defbotclient
      );
      if (botclient) {
        console.debug(this.globalConfig.defbotclient);
        stream.set('botclient', botclient);
        await botclient.save().then(() => stream.save());
      }
    }

    if (this.globalConfig.defchatclient != null) {
      var chatclient = await this.store.peekRecord(
        'client',
        this.globalConfig.defchatclient
      );
      if (chatclient) {
        console.debug(this.globalConfig.defchatclient);
        stream.set('chatclient', chatclient);
        await chatclient.save().then(() => stream.save());
      }
    }

    this.router.transitionTo('streams.stream', stream);
  }

  @action createStream() {
    var newStream = this.store.createRecord('stream');

    newStream.save().then((stream) => {
      this.stream.isEditing = true;
      return this.defaultSetter(stream);
    });
  }

  @action gridResumeStream(stream) {
    this.stream.isEditing = false;
    this.router.transitionTo('streams.stream', stream);
  }

  @action gridEditStream(stream) {
    this.stream.isEditing = true;
    this.router.transitionTo('streams.stream', stream);
  }

  @action async gridDeleteStream(stream) {
    console.log(stream);

    let oldBotClient = '';
    let oldChatClient = '';
    if (stream.botName) {
      oldBotClient = (await stream.get('botclient')) || false;
    }
    if (stream.chatName) {
      oldChatClient = (await stream.get('chatclient')) || false;
    }

    stream.destroyRecord().then(() => {
      if (oldBotClient && oldChatClient) {
        if (oldBotClient.id != oldChatClient.id) {
          oldBotClient.save();
          oldChatClient.save();
        } else {
          oldBotClient.save();
        }
      } else {
        if (oldBotClient) {
          oldBotClient.save();
        }
        if (oldChatClient) {
          oldChatClient.save();
        }
      }

      this.currentUser.isViewing = false;
      this.stream.isEditing = false;
      this.currentUser.lastStream = null;
    });
  }
}
