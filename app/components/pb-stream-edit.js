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

  get disableBotButton() {
    if (
      this.args.stream.finished === true ||
      this.args.stream.botclient === '' ||
      this.args.stream.channel === ''
    ) {
      return true;
    } else {
      return false;
    }
  }

  get disconnectButton() {
    if (this.twitchChat.botConnected === false) {
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
    this.queueHandler.scrollPlayedPosition = this.queueHandler.pendingSongs.length;
    this.queueHandler.scrollPendingPosition = this.queueHandler.playedSongs.length;
  }

  @action moves(el, container, handle) {
    return handle.classList.contains('dragula-handle');
  }

  // Bot and Chat related actions:

  @action connectBot() {
    if (this.args.stream.channel != '') {
      // this.optsbot.channels = [this.args.stream.channel];
      this.twitchChat.channel = this.args.stream.channel;
    }
    this.twitchChat.savechat = this.args.stream.savechat;

    this.twitchChat.botUsername = this.args.stream.botName || '';
    this.twitchChat.chatUsername = this.args.stream.chatName || '';

    if (
      this.args.stream.events &&
      this.globalConfig.config.externaleventskey &&
      this.globalConfig.config.externalevents
    ) {
      this.eventsExternal.token = this.globalConfig.config.externaleventskey;
      this.eventsExternal.type = this.globalConfig.config.externalevents;
      this.eventsExternal.createClient();
    }

    this.twitchChat.connector(this.optsbot, 'bot').then(()=>{
      let opts = this.optchat || this.optsbot;
      this.twitchChat.connector(opts, "chat");
    });
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
    this.globalConfig.config.cpansetlist = !this.globalConfig.config.cpansetlist;
    this.globalConfig.config.save();
  }

  @action toggleExtraPanRight() {
    this.globalConfig.config.extraPanRight =
      !this.globalConfig.config.extraPanRight;
    if (this.globalConfig.config.extraPanRight) {
      this.globalConfig.config.extraPanRightTop = true;
      this.globalConfig.config.extraPanRightBottom = true;
    }
    this.globalConfig.config.save();
  }

  @action toggleExtraPanRightTop() {
    this.globalConfig.config.extraPanRightTop = !this.globalConfig.config.extraPanRightTop;
    if(!this.globalConfig.config.extraPanRightBottom && !this.globalConfig.config.extraPanRightTop){
      this.globalConfig.config.extraPanRight = false;
    }  else  {
      this.globalConfig.config.extraPanRight = true;
    }   
    this.globalConfig.config.save();
  }

  @action toggleExtraPanRightBottom() {
    this.globalConfig.config.extraPanRightBottom = !this.globalConfig.config.extraPanRightBottom;
    if(!this.globalConfig.config.extraPanRightBottom && !this.globalConfig.config.extraPanRightTop){
      this.globalConfig.config.extraPanRight = false;
    }  else  {
      this.globalConfig.config.extraPanRight = true;
    }   
    this.globalConfig.config.save();
  }

  @action toggleExtraPanLeft() {
    this.globalConfig.config.extraPanLeft =
      !this.globalConfig.config.extraPanLeft;
    if (this.globalConfig.config.extraPanLeft) {
      this.globalConfig.config.extraPanLeftTop = true;
      this.globalConfig.config.extraPanLeftBottom = true;
    }
    this.globalConfig.config.save();
  }

  @action toggleExtraPanLeftTop() {
    this.globalConfig.config.extraPanLeftTop =
      !this.globalConfig.config.extraPanLeftTop;
    this.globalConfig.config.save();
  }

  @action toggleExtraPanLeftBottom() {
    this.globalConfig.config.extraPanLeftBottom =
      !this.globalConfig.config.extraPanLeftBottom;
    this.globalConfig.config.save();
  }

  @action queueWriter() {
    if (this.args.stream.requests) {
      this.twitchChat.takessongrequests = !this.twitchChat.takessongrequests;
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
