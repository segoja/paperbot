import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';

export default class PbStreamEditComponent extends Component {
  @service eventsExternal;
  @service twitchChat;
  @service youtubeChat;
  @service globalConfig;
  @service audio;
  @service currentUser;
  @service queueHandler;

  @tracked saving = false;

  get optsbot() {
    return this.args.stream.botclient.get('optsgetter');
  }

  get optschat() {
    return this.args.stream.chatclient.get('optsgetter');
  }

  @tracked message = '';
  @tracked msglist = [];

  get canEvents() {
    if (
      this.globalConfig.config.externaleventskey &&
      this.globalConfig.config.externalevents
    ) {
      return true;
    }
    return false;
  }

  get canConnect() {
    if (this.optsbot || this.canEvents) {
      return true;
    }
    return false;
  }

  get isConnected() {
    // console.log('Events external: ', this.eventsExternal.client);
    if (this.eventsExternal.connected || this.twitchChat.botConnected) {
      return true;
    }
    return false;
  }

  get disableBotButton() {
    if (this.args.stream.finished === true) {
      return true;
    }
    if (
      this.args.stream.botclient === '' &&
      this.args.stream.channel === '' &&
      !this.canEvents
    ) {
      return true;
    }
    return false;
  }

  get disconnectButton() {
    if (!this.twitchChat.botConnected && !this.eventsExternal.connected) {
      return true;
    } else {
      return false;
    }
  }

  // With this getter we limit the number of messages displayed on screen.
  /* get messages() {
    return this.msglist.slice(-45);
  }*/

  // With this getter we limit the number of events displayed on screen.
  get events() {
    let events = [];
    if (this.arrangedDescEvents.length > 0) {
      events = this.arrangedDescEvents;
    }
    return events;
  }

  get audiocommandslist() {
    let result = this.args.commands
      .filterBy('type', 'audio')
      .filterBy('active', true);
    return result;
  }

  constructor() {
    super(...arguments);
    // These lines is to allow switching to other routes
    // without losing the active chat history and song queue.
    if (this.eventsExternal.connected) {
      this.eventlist = this.eventsExternal.events;
    } else {
      this.eventlist = this.twitchChat.events;
    }

    // this.queueHandler.songqueue = this.queueHandler.songqueue.slice();
    this.queueHandler.scrollPlayedPosition =
      this.queueHandler.pendingSongs.length;
    this.queueHandler.scrollPendingPosition =
      this.queueHandler.playedSongs.length;
  }

  // Bot and Chat related actions:

  @action connectBot() {
    if (this.optsbot) {
      if (this.args.stream.channel != '') {
        // this.optsbot.channels = [this.args.stream.channel];
        this.twitchChat.channel = this.args.stream.channel;
      }
      this.twitchChat.savechat = this.args.stream.savechat;

      this.twitchChat.botUsername = this.args.stream.botName || '';
      this.twitchChat.chatUsername = this.args.stream.chatName || '';

      this.twitchChat.connector(this.optsbot, 'bot').then(() => {
        let opts = this.optchat || this.optsbot;
        this.twitchChat.connector(opts, 'chat');
      });
    }
    if (
      this.args.stream.events &&
      this.globalConfig.config.externaleventskey &&
      this.globalConfig.config.externalevents
    ) {
      this.eventsExternal.token = this.globalConfig.config.externaleventskey;
      this.eventsExternal.type = this.globalConfig.config.externalevents;
      this.eventsExternal.createClient();
    }
  }

  @action disconnectClients() {
    this.twitchChat.disconnector().then(
      function () {
        console.debug('Bot and Chat clients disconnected!');
        //
      },
      function () {
        console.debug('Error disconnecting!');
      }
    );
    if (this.eventsExternal.connected) {
      this.eventsExternal.disconnectClient();
    }
  }

  @action finishStream() {
    if (this.args.stream.finished != true) {
      if (this.args.stream.savechat) {
        this.args.stream.chatlog = this.twitchChat.msglist;
      }

      this.args.stream.songqueue = [];
      if (this.queueHandler.songqueue.length > 0) {
        this.queueHandler.playedSongs.reverse().forEach(async (request) => {
          let entry = {
            timestamp: request.timestamp,
            song: request.fullText,
            user: request.user,
            processed: request.processed,
          };
          this.args.stream.songqueue.push(entry);
          // await request.destroyRecord();
        });

        this.queueHandler.pendingSongs.forEach(async (request) => {
          let entry = {
            timestamp: request.timestamp,
            song: request.fullText,
            user: request.user,
            processed: request.processed,
          };
          this.args.stream.songqueue.push(entry);
          // await request.destroyRecord();
        });
      }

      this.args.stream.eventlog = [];
      if (this.eventsExternal.connected) {
        if (this.eventsExternal.arrangedEvents.length > 0) {
          this.eventsExternal.arrangedEvents.forEach(async (event) => {
            let entry = {
              id: event.externalId,
              platform: event.platform,
              type: event.type,
              timestamp: event.timestamp,
              parsedbody: event.parsedbody,
            };
            this.args.stream.eventlog.push(entry);
            await event.destroyRecord();
          });
        }
      }

      if (
        this.twitchChat.botConnected === true ||
        this.twitchChat.chatConnected === true ||
        this.eventsExternal.connected
      ) {
        this.disconnectClients();
      }

      this.args.stream.finished = true;
      this.args.saveStream();
      this.twitchChat.eventlist = [];
      this.twitchChat.whisperlist = [];
      this.twitchChat.msglist = [];
      this.msglist = [];
    }
  }

  // Stream saving actions

  @action doneEditing() {
    this.args.saveStream();
    this.saving = true;
    later(() => {
      this.saving = false;
    }, 500);
  }

  @action doneAndReturnEditing() {
    this.args.saveAndReturnStream();
  }

  // Soundboard toggle
  @action soundboardToggle() {
    this.audio.toggle();
  }

  // Pannels interaction

  @action togglePan(pannel) {
    if (pannel === 'setlist') {
      this.globalConfig.config.cpansetlist =
        !this.globalConfig.config.cpansetlist;
    }
    if (pannel === 'pending') {
      this.globalConfig.config.cpanpending =
        !this.globalConfig.config.cpanpending;
    }
    if (pannel === 'played') {
      this.globalConfig.config.cpanplayed =
        !this.globalConfig.config.cpanplayed;
    }
    if (pannel === 'messages') {
      this.globalConfig.config.cpanmessages =
        !this.globalConfig.config.cpanmessages;
    }
    if (pannel === 'events') {
      this.globalConfig.config.cpanevents =
        !this.globalConfig.config.cpanevents;
    }
    this.globalConfig.config.save();
  }

  @action toggleEvents() {
    this.globalConfig.config.cpanevents = !this.globalConfig.config.cpanevents;
    this.globalConfig.config.save();
  }

  @action toggleSetlist() {
    this.globalConfig.config.cpansetlist =
      !this.globalConfig.config.cpansetlist;
    this.globalConfig.config.save();
  }

  @action queueWriter() {
    if (this.args.stream.requests) {
      this.queueHandler.takesSongRequests =
        !this.queueHandler.takesSongRequests;
    }
    if (this.globalConfig.config.overlayType === 'file') {
      if (
        this.args.stream.requests &&
        this.globalConfig.config.overlayfolder != ''
      ) {
        this.currentUser.updateQueueOverlay =
          !this.currentUser.updateQueueOverlay;
        // this.currentUser.queueToFile = !this.currentUser.queueToFile;
        this.queueHandler.fileContent(this.queueHandler.pendingSongs);
      } else {
        // this.currentUser.queueToFile = false;
        this.currentUser.updateQueueOverlay = false;
      }
    } else if (
      this.args.stream.requests &&
      this.globalConfig.config.overlayType === 'window'
    ) {
      // this.currentUser.queueToFile = false;
      this.currentUser.updateQueueOverlay =
        !this.currentUser.updateQueueOverlay;
      this.currentUser.toggleOverlay();
    } else if (this.args.stream.requests) {
      this.currentUser.updateQueueOverlay =
        !this.currentUser.updateQueueOverlay;
    }
  }
}
