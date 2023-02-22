import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { htmlSafe } from '@ember/template';
import { action } from '@ember/object';
import { assign } from '@ember/polyfills';
import { sort } from '@ember/object/computed';
import moment from 'moment';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import tmi from 'tmi.js';
import { later, cancel } from '@ember/runloop';

export default class TwitchChatService extends Service {
  @service audio;
  @service globalConfig;
  @service queueHandler;
  @service currentUser;
  @service store;

  @tracked botclient;

  @tracked savechat = false;

  @tracked msglist = [];
  get messages() {
    if (this.savechat) {
      return this.msglist || [];
    } else {
      return this.msglist.slice(-45) || [];
    }
  }

  @tracked whisperlist = [];
  get whispers() {
    return this.whisperlist || [];
  }

  @tracked eventlist = [];
  get events() {
    return this.eventlist || [];
  }

  @tracked modactions = [];

  @tracked channel = '';
  @tracked botUsername = '';
  @tracked botPassword = '';

  @tracked botConnected = false;

  @tracked chanId;

  get commandlist() {
    return this.store.peekAll('command').filterBy('active', true);
  }

  get audiocommandslist() {
    return this.commandlist.filterBy('type', 'audio');
  }
  @tracked lastTimerId = '';
  @tracked lastTimerPos = 0;
  @tracked lastTimerOrder = 0;
  @tracked activeTimers = {};
  get timersList() {
    return this.store.peekAll('timer').filterBy('active', true);
  }

  get songs() {
    return this.store.peekAll('song').filterBy('active', true);
  }

  @tracked lastmessage = null;
  @tracked lastsongrequest = null;
  @tracked lastevent = null;
  @tracked lastmodaction = null;
  @tracked lastSoundCommand = null;
  get soundPlaying() {
    if (this.lastSoundCommand) {
      return this.lastSoundCommand.isPlaying;
    }
    return false;
  }

  @tracked takessongrequests = false;

  @tracked channelBadges = [];
  @tracked globalBadges = [];
  get allbadges() {
    let pack = [];
    console.log(this.globalBadges);
    console.log(this.channelBadges);
    if (this.channelBadges > 0) {
      pack = assign(this.globalBadges, this.channelBadges);
    }
    return pack;
  }

  defaultColors = [
    ('Red', 'rgb(255, 0, 0)'),
    ('Blue', 'rgb(0, 0, 255)'),
    ('Green', 'rgb(0, 255, 0)'),
    ('FireBrick', 'rgb(178, 34, 34)'),
    ('Coral', 'rgb(255, 127, 80)'),
    ('YellowGreen', 'rgb(154, 205, 50)'),
    ('OrangeRed', 'rgb(255, 69, 0)'),
    ('SeaGreen', 'rgb(46, 139, 87)'),
    ('GoldenRod', 'rgb(218, 165, 32)'),
    ('Chocolate', 'rgb(210, 105, 30)'),
    ('CadetBlue', 'rgb(95, 158, 160)'),
    ('DodgerBlue', 'rgb(30, 144, 255)'),
    ('HotPink', 'rgb(255, 105, 180)'),
    ('BlueViolet', 'rgb(138, 43, 226)'),
    ('SpringGreen', 'rgb(0, 255, 127)'),
  ];

  @tracked streamlabs;

  constructor() {
    super(...arguments);
  }

  async connector(options, clientType) {
    // We check what kind of client is connecting
    if (clientType === 'bot') {
      if (this.botConnected === true) {
        this.botclient.disconnect();
      }
    }

    if (!this.botConnected && clientType === 'bot') {
      // this.channel = options.channels.toString();
      this.botUsername = options.identity.username.toString();
      this.botPassword = options.identity.password.replace(/oauth:/g, '');

      this.botclient = new tmi.client(options);
      // Register our event handlers (defined below)
      this.botclient.on('connecting', this.soundboard);
      this.botclient.on('connected', this.timersLauncher);
      this.botclient.on('connected', this.onBotConnectedHandler);
      this.botclient.on('disconnected', this.unloadSoundboard);
      this.botclient.on('message', this.messageHandler);
      // this.botclient.on('hosting', this.onHostHandler);
      // Connect the client
      this.botConnected = await this.botclient.connect().then(
        function () {
          console.debug('bot client connected!');
          return true;
        },
        function () {
          console.debug('error connecting bot client!');
          return false;
        }
      );

      if (this.botConnected) {
        this.botclient.join(this.channel);
        this.superHandler(this.botclient);
        this.timersLauncher();
        // this.twitchNameToUser(this.channel);
        // console.debug(this.badgespack);
      }

      return this.botConnected;
    }
  }

  async disconnector() {
    var isDisconnected = false;
    if (this.botConnected === true) {
      this.botclient.disconnect().then(() => {
        this.botConnected = false;
        this.channel = '';
        this.botUsername = '';
        isDisconnected = true;
        console.debug('The bot client got disconnected!');
      });
    }
    return isDisconnected;
  }
  async disconnectBot() {
    var isDisconnected = false;
    if (this.botConnected === true) {
      this.botclient.disconnect().then(() => {
        this.botConnected = false;
        this.channel = '';
        this.botUsername = '';
        isDisconnected = true;
        console.debug('The bot client got disconnected!');
      });
    }
    return isDisconnected;
  }

  // Called every time the bot connects to Twitch chat
  @action onBotConnectedHandler(addr, port) {
    console.debug(`* Connected to ${addr}:${port}`);
  }

  @action async timersLauncher() {
    let count = 1;

    if (this.currentUser.isTauri) {
      let audioTimersList = this.timersList.filterBy('type', 'audio');
      if ((await audioTimersList.length) > 0) {
        if ((await this.timersList.length) > 0) {
          this.audio.loadSounds(audioTimersList);
        } else {
          console.debug('No sound timers to load in soundboard!');
        }
      }
    }
    this.timersList.map((timer) => {
      this.timerScheduler(timer, count);
      count = count + 1;
    });
  }

  async timerScheduler(timer, order) {
    if (!timer.isDeleted && this.botConnected && this.channel) {
      if (this.activeTimers[timer.id] && !timer.active) {
        //console.log('The timer was active, cancelling')
        cancel(this.activeTimers[timer.id]);
        this.activeTimers[timer.id] = '';
      } else {
        //console.log('Scheduling the timer...')
        let time = this.globalConfig.config.timerTime * 60 * 1000;

        this.activeTimers[timer.id] = await later(() => {
          if (this.msglist.length > 0) {
            let diff = this.msglist.length - this.lastTimerPos;
            if (
              diff >= this.globalConfig.config.timerLines &&
              this.lastTimerId != timer.id &&
              this.lastTimerOrder < order
            ) {
              this.lastTimerId = timer.id;
              if (this.timersList.length === order) {
                this.lastTimerOrder = 0;
              } else {
                this.lastTimerOrder = order;
              }
              this.botclient.say(this.channel, timer.message);
              if (timer.type === 'audio' && this.currentUser.isTauri) {
                this.audio.playSound(timer);
              }
              this.lastTimerPos = this.msglist.get('length');
            }
          }
          this.timerScheduler(timer, order);
        }, time);
      }
    }
    //console.log(this.activeTimers);
  }

  @action async soundboard() {
    if (this.currentUser.isTauri) {
      console.debug('Loading the soundboard...');
      if ((await this.audiocommandslist.length) > 0) {
        this.audio.loadSounds(this.audiocommandslist);
      } else {
        console.debug('No sound commands to load in soundboard!');
      }
    }
  }

  @action async unloadSoundboard() {
    if (this.currentUser.isTauri) {
      console.debug('Unloading the soundboard...');
      if ((await this.audiocommandslist.length) > 0) {
        this.audio.unloadSounds(this.audiocommandslist);
      } else {
        console.debug('No sound commands to unload in soundboard!');
      }
    }
  }

  @action onHostHandler(channel, target, viewers) {
    console.debug(
      channel + ' hosted ' + target + ' with our ' + viewers + ' viewers.'
    );
  }

  @action async messageHandler(target, tags, msg, self) {
    //console.debug('__________________________');
    //console.debug(msg);
    //console.debug(tags);
    // this.parseBadges(tags['badges']);

    this.lastmessage = {
      id: tags['id'] ? tags['id'].toString() : 'system',
      timestamp: moment().format(),
      body: msg ? msg.toString() : null,
      parsedbody: this.parseMessage(msg.toString(), tags['emotes']).toString(),
      user: tags['username'] ? tags['username'].toString() : this.botUsername,
      displayname: tags['display-name']
        ? tags['display-name'].toString()
        : this.botUsername,
      color: tags['color']
        ? tags['color'].toString()
        : this.setDefaultColor(tags['username']).toString(),
      csscolor: tags['color']
        ? htmlSafe('color: ' + tags['color'])
        : htmlSafe(
            'color: ' + this.setDefaultColor(tags['username']).toString()
          ),
      badges: tags['badges'] ? tags['badges'] : null,
      htmlbadges: '', //tags['badges'] ? this.parseBadges(tags['badges']).toString() : '',
      type: tags['message-type'] ? tags['message-type'] : null,
      usertype: tags['user-type'] ? tags['user-type'].toString() : null,
      reward: tags['msg-id'] ? true : false,
      emotes: tags['emotes'] ? tags['emotes'] : null,
    };

    if (tags['message-type'] != 'whisper') {
      if (
        tags['custom-reward-id'] &&
        this.takessongrequests &&
        this.currentUser.updateQueueOverlay &&
        String(msg).startsWith('!sr ')
      ) {
        var song = commandName.replace(/!sr /g, '');
        song = song.replace(/&/g, ' ');
        song = song.replace(/\//g, ' ');
        song = song.replace(/\-/g, ' ');
        song = song.replace(/[^a-zA-Z0-9'?! ]/g, '');
        console.debug(song);
        if (song) {
          this.requestpattern = song;

          if ((await this.filteredSongs.get('length')) > 0) {
            var bestmatch = await this.filteredSongs.shift();
            let hasBeenRequested = this.queueHandler.songqueue.find(
              (item) => item.fullText === bestmatch.fullText
            );
            if (
              (await hasBeenRequested) &&
              !this.globalConfig.config.allowDuplicated
            ) {
              this.botclient.say(
                target,
                '/me The song ' +
                  bestmatch.fullText +
                  ' has already been requested!'
              );
            } else {
              if (bestmatch.active) {
                if (this.commandPermissionHandler(bestmatch, tags) === true) {
                  let nextPosition = this.queueHandler.nextPosition;

                  this.lastsongrequest = this.store.createRecord('request');
                  this.lastsongrequest.chatid = tags['id']
                    ? tags['id'].toString()
                    : 'songsys';
                  this.lastsongrequest.timestamp = new Date();
                  this.lastsongrequest.type = tags['message-type']
                    ? tags['message-type']
                    : null;
                  this.lastsongrequest.song = bestmatch;
                  this.lastsongrequest.user = tags['username']
                    ? tags['username'].toString()
                    : this.botUsername;
                  this.lastsongrequest.displayname = tags['display-name']
                    ? tags['display-name'].toString()
                    : this.botUsername;
                  this.lastsongrequest.position = nextPosition;

                  this.lastsongrequest.save().then(async () => {
                    // Song statistics:
                    bestmatch.times_requested =
                      Number(bestmatch.times_requested) + 1;
                    bestmatch.last_requested = new Date();
                    await bestmatch.save();

                    console.log(
                      bestmatch.fullText + ' added at position ' + nextPosition
                    );
                    this.queueHandler.scrollPendingPosition = 0;
                    this.queueHandler.scrollPlayedPosition = 0;
                    this.queueHandler.lastsongrequest = this.lastsongrequest;

                    // changing this could break the reader.
                    this.botclient.say(
                      target,
                      '/me @' +
                        tags['username'] +
                        ' requested the song ' +
                        bestmatch.fullText
                    );
                  });
                } else {
                  this.botclient.say(
                    target,
                    '/me @' +
                      tags['username'] +
                      ' you are not allowed to request that song.'
                  );
                }
              } else {
                this.botclient.say(
                  target,
                  "/me I coudln't infer the song @" +
                    tags['username'] +
                    '. Try again!'
                );
              }
            }
          } else {
            this.botclient.say(
              target,
              '/me @' +
                tags['username'] +
                ' that song is not in the songlist. Try again!'
            );
          }
        }
      } else {
        this.msglist.push(this.lastmessage);
        this.commandHandler(target, tags, msg, self);
      }
    } else {
      this.whisperlist.push(this.lastmessage);
    }
  }

  songsSorting = Object.freeze(['date_added:asc']);
  @sort('songs', 'songsSorting') arrangedSongs;

  @tracked requestpattern = '';
  @computedFilterByQuery(
    'arrangedSongs',
    ['title', 'artist', 'keywords'],
    'requestpattern',
    { conjunction: 'and', sort: false }
  )
  filteredSongs;

  // Called every time a message comes in
  @action async commandHandler(target, tags, msg, self) {
    // Ignore messages from the bot so you don't create command infinite loops
    if (self) {
      return;
    }
    // Remove whitespace from chat message
    const commandName = msg.trim().toLowerCase();
    if (String(commandName).startsWith('!')) {
      // If the command is known, let's execute it
      if (String(commandName).startsWith('!sr ')) {
        if (this.takessongrequests && this.currentUser.updateQueueOverlay) {
          var song = commandName.replace(/!sr /g, '');
          song = song.replace(/&/g, ' ');
          song = song.replace(/\//g, ' ');
          song = song.replace(/\-/g, ' ');
          song = song.replace(/[^a-zA-Z0-9'?! ]/g, '');
          console.debug(song);
          if (song) {
            this.requestpattern = song;

            if (this.filteredSongs.get('length') > 0) {
              var bestmatch = await this.filteredSongs.shift();

              let hasBeenRequested = this.queueHandler.songqueue.find(
                (item) => item.fullText === bestmatch.fullText
              );
              if (
                (await hasBeenRequested) &&
                !this.globalConfig.config.allowDuplicated
              ) {
                this.botclient.say(
                  target,
                  '/me The song ' +
                    bestmatch.fullText +
                    ' has already been requested!'
                );
              } else {
                if (bestmatch.active) {
                  if (this.commandPermissionHandler(bestmatch, tags) === true) {
                    let nextPosition = this.queueHandler.nextPosition;

                    this.lastsongrequest = this.store.createRecord('request');
                    this.lastsongrequest.chatid = tags['id']
                      ? tags['id'].toString()
                      : 'songsys';
                    this.lastsongrequest.timestamp = new Date();
                    this.lastsongrequest.type = tags['message-type']
                      ? tags['message-type']
                      : null;
                    this.lastsongrequest.song = bestmatch;
                    this.lastsongrequest.user = tags['username']
                      ? tags['username'].toString()
                      : this.botUsername;
                    this.lastsongrequest.displayname = tags['display-name']
                      ? tags['display-name'].toString()
                      : this.botUsername;
                    this.lastsongrequest.processed = false;
                    this.lastsongrequest.position = nextPosition;

                    this.lastsongrequest.save().then(async () => {
                      // Song statistics:
                      bestmatch.times_requested =
                        Number(bestmatch.times_requested) + 1;
                      bestmatch.last_requested = new Date();
                      await bestmatch.save();

                      console.log(
                        bestmatch.fullText +
                          ' added at position ' +
                          nextPosition
                      );

                      this.queueHandler.scrollPendingPosition = 0;
                      this.queueHandler.scrollPlayedPosition = 0;
                      this.queueHandler.lastsongrequest = this.lastsongrequest;

                      // changing this could break the reader.
                      this.botclient.say(
                        target,
                        '/me @' +
                          tags['username'] +
                          ' requested the song ' +
                          bestmatch.fullText
                      );
                    });
                  } else {
                    this.botclient.say(
                      target,
                      '/me @' +
                        tags['username'] +
                        ' you are not allowed to request that song.'
                    );
                  }
                } else {
                  this.botclient.say(
                    target,
                    "/me I coudln't infer the song @" +
                      tags['username'] +
                      '. Try again!'
                  );
                }
              }
            } else {
              this.botclient.say(
                target,
                '/me @' +
                  tags['username'] +
                  ' that song is not in the songlist. Try again!'
              );
            }
          }
          console.debug(`* Executed ${commandName} command`);
        } else {
          this.botclient.say(target, '/me Requests are disabled.');
        }
      } else {
        if (
          String(commandName).startsWith('!ykq') &&
          this.currentUser.isTauri
        ) {
          let internalCommand = {
            admin: true,
            mod: true,
            vip: false,
            sub: false,
          };
          if (
            this.commandPermissionHandler(internalCommand, tags) === true &&
            this.audio.SBstatus
          ) {
            let quietTime = Number(
              commandName.toLowerCase().replace(/!ykq/g, '').trim()
            );
            this.audio.isEnabled = false;
            console.log(quietTime);
            if (!isNaN(quietTime)) {
              if (quietTime > 0) {
                later(() => {
                  this.audio.isEnabled = true;
                }, quietTime * 1000);
                this.botclient.say(
                  target,
                  '/me Enjoy the silence a little bit...'
                );
              } else {
                this.botclient.say(target, '/me Enjoy the silence...');
              }
            } else {
              this.botclient.say(target, '/me Enjoy the silence...');
            }
            //this.botclient.say(target, '/me MrDestructoid enjoy the silence...');
            if (
              this.lastSoundCommand != null &&
              this.lastSoundCommand.isPlaying
            ) {
              this.lastSoundCommand.changeGainTo(0).from('percent');
              this.lastSoundCommand.stop();
            }
          }
          // !random adds a random non played/requested song to the queue:
        } else if (
          this.takessongrequests &&
          this.currentUser.updateQueueOverlay &&
          String(commandName).startsWith('!random')
        ) {
          if ((await this.queueHandler.availableSongs.get('length')) > 0) {
            let max = this.queueHandler.availableSongs.get('length');
            let position = Math.floor(Math.random() * max);
            let firstSong = this.queueHandler.availableSongs[position];

            if (firstSong) {
              let nextPosition = this.queueHandler.nextPosition;

              this.lastsongrequest = this.store.createRecord('request');
              this.lastsongrequest.chatid = tags['id']
                ? tags['id'].toString()
                : 'songsys';
              this.lastsongrequest.timestamp = new Date();
              this.lastsongrequest.type = tags['message-type']
                ? tags['message-type']
                : null;
              this.lastsongrequest.song = firstSong;
              this.lastsongrequest.user = tags['username']
                ? tags['username'].toString()
                : this.botUsername;
              this.lastsongrequest.displayname = tags['display-name']
                ? tags['display-name'].toString()
                : this.botUsername;
              this.lastsongrequest.processed = false;
              this.lastsongrequest.position = nextPosition;

              this.lastsongrequest.save().then(async () => {
                // Song statistics:
                firstSong.times_requested =
                  Number(firstSong.times_requested) + 1;
                firstSong.last_requested = new Date();
                await firstSong.save();

                console.log(
                  firstSong.fullText + ' added at position ' + nextPosition
                );

                this.queueHandler.scrollPendingPosition = 0;
                this.queueHandler.scrollPlayedPosition = 0;
                this.queueHandler.lastsongrequest = this.lastsongrequest;

                // changing this could break the reader.
                this.botclient.say(
                  target,
                  '/me @' +
                    tags['username'] +
                    ' randomly requested the song ' +
                    firstSong.fullText
                );
              });
            }
          } else {
            this.botclient.say(
              target,
              '/me There are no songs available to add.'
            );
          }
          // !next or!nextsong  show the last song played:
        } else if (
          String(commandName).startsWith('!next') ||
          String(commandName).startsWith('!nextsong')
        ) {
          if ((await this.queueHandler.pendingSongs.get('length')) > 1) {
            let firstSong = this.queueHandler.pendingSongs[1];
            if (firstSong) {
              this.botclient.say(
                target,
                '/me Next song is: ' + firstSong.fullText
              );
            }
          } else {
            this.botclient.say(target, '/me There are no songs to play next.');
          }
          // !last,!lastsong or !lastplayed show the last song played:
        } else if (
          String(commandName).startsWith('!last') ||
          String(commandName).startsWith('!lastplayed') ||
          String(commandName).startsWith('!lastsong') ||
          String(commandName).startsWith('!previous') ||
          String(commandName).startsWith('!prev') ||
          String(commandName).startsWith('!previoussong') ||
          String(commandName).startsWith('!ps')
        ) {
          if ((await this.queueHandler.playedSongs.get('length')) > 0) {
            let firstSong = this.queueHandler.playedSongs.get('firstObject');
            if (firstSong) {
              this.botclient.say(
                target,
                '/me Last played song was: ' + firstSong.fullText
              );
            }
          } else {
            this.botclient.say(
              target,
              '/me There are no songs in the played list.'
            );
          }
          // !current or !song show the song the streamer is playing:
        } else if (
          String(commandName).startsWith('!current') ||
          String(commandName).startsWith('!song') ||
          String(commandName).startsWith('!cs')
        ) {
          if ((await this.queueHandler.pendingSongs.get('length')) > 0) {
            let firstSong = this.queueHandler.pendingSongs.get('firstObject');
            if (firstSong) {
              this.botclient.say(target, '/me Playing: ' + firstSong.fullText);
            }
          } else {
            this.botclient.say(target, '/me There are no songs in the queue.');
          }
          // !queue lists the songs in queue:
        } else if (
          String(commandName).startsWith('!queue') ||
          String(commandName).startsWith('!sq')
        ) {
          if ((await this.queueHandler.pendingSongs.get('length')) > 0) {
            let count = 0;
            /*
            this.botclient.say(target, "/me Songs in queue:");
            this.queueHandler.pendingSongs.forEach(async (item)=>{
              if(count < 6){
                count = Number(count) + 1;
                await this.botclient.say(target, '/me '+count+'. '+item.title);
              }
            });
            */
            let message = 'Songs in queue: ';
            this.queueHandler.pendingSongs.forEach(async (item) => {
              if (count < 6) {
                count = Number(count) + 1;
                message += '#' + count + '. ' + item.title + ' ';
              }
            });
            this.botclient.say(target, '/me ' + message);
          } else {
            this.botclient.say(target, '/me There are no songs in the queue.');
          }
          // !ws removes the last song the user requested. Allows one param (mods only), to delete the last request from another user.
        } else if (String(commandName).startsWith('!ws')) {
          if (this.queueHandler.pendingSongs.get('length') > 0) {
            let internalCommand = {
              admin: true,
              mod: true,
              vip: false,
              sub: false,
            };
            let targetUser = commandName
              .toLowerCase()
              .replace(/!ws/g, '')
              .trim();

            if (
              this.commandPermissionHandler(internalCommand, tags) === true &&
              targetUser
            ) {
              let targetLastSong = await this.queueHandler.pendingSongs
                .reverse()
                .find((item) => item.user == targetUser);
              if (targetLastSong) {
                let songname = targetLastSong.fullText;
                targetLastSong.destroyRecord().then(() => {
                  this.botclient.say(
                    target,
                    '/me the song ' + songname + ' has been removed.'
                  );
                });
              } else {
                this.botclient.say(
                  target,
                  '/me The user @' +
                    targetUser +
                    " doesn't have any song in the queue."
                );
              }
            } else {
              let commandUser = tags['username']
                ? tags['username'].toString()
                : this.botUsername;
              if (targetUser) {
                this.botclient.say(
                  target,
                  "/me you don't have permissions to delete someone else's songs."
                );
              } else {
                let userLastSong = await this.queueHandler.pendingSongs
                  .reverse()
                  .find((item) => item.user == commandUser);
                if (userLastSong) {
                  let songname = userLastSong.fullText;
                  userLastSong.destroyRecord().then(() => {
                    this.botclient.say(
                      target,
                      '/me the song ' + songname + ' has been removed.'
                    );
                  });
                } else {
                  this.botclient.say(
                    target,
                    "/me you don't have songs in the queue."
                  );
                }
              }
            }
          } else {
            this.botclient.say(target, '/me There are no songs to be removed.');
          }
        } else {
          if ((await this.commandlist.get('length')) > 0) {
            this.commandlist.forEach((command) => {
              if (
                String(commandName).startsWith(command.name) &&
                command.name != '' &&
                command.active &&
                (String(commandName).endsWith(command.name) ||
                  String(commandName).startsWith(command.name + ' '))
              ) {
                /*if (self) { 
                    return;  
                  } else {*/
                if (this.commandPermissionHandler(command, tags) === true) {
                  switch (command.type) {
                    case 'parameterized': {
                      let pattern = new RegExp(`${command.name}`, 'gi');

                      let param = commandName.replace(pattern, '').trim();

                      let answerraw = command.response;

                      let answer = answerraw.replace(/\$param/g, param).trim();

                      if (isNaN(command.timer)) {
                        this.botclient.say(target, answer);
                        console.debug(`* Executed ${command.name} command`);
                      } else {
                        later(() => {
                          this.botclient.say(target, answer);
                          console.debug(`* Executed ${command.name} command`);
                        }, command.timer);
                      }
                      break;
                    }
                    case 'audio': {
                      if (this.currentUser.isTauri) {
                        if (this.audio.SBstatus) {
                          this.audio.playSound(command);
                        }
                      }
                      break;
                    }
                    default: {
                      if (isNaN(command.timer)) {
                        this.botclient.say(target, command.response);
                        console.debug(`* Executed ${command.name} command`);
                      } else {
                        later(() => {
                          this.botclient.say(target, command.response);
                          console.debug(`* Executed ${command.name} command`);
                        }, command.timer);
                      }
                      break;
                    }
                  }
                } else {
                  console.debug(
                    'Not authorized to use ' + command.name + ' command.'
                  );
                }
                /*}*/
              }
            });
          } else {
            console.debug('There are no commands to lauch.');
          }
        }
      }
    }
  }

  @action commandPermissionHandler(command, tags) {
    // console.debug(tags['badges']);
    if (tags['badges'] != null) {
      var admin = false;
      var mod = false;
      var vip = false;
      var sub = false;

      for (var category in tags['badges']) {
        switch (category) {
          case 'broadcaster': {
            admin = true;
            break;
          }
          case 'moderator': {
            mod = true;
            break;
          }
          case 'vip': {
            vip = true;
            break;
          }
          case 'subscriber': {
            sub = true;
            break;
          }
        }
      }
      //console.debug('User -> admin: '+admin+', mod: '+mod+', vip: '+vip+', sub: '+sub+'');
      //console.debug('Command -> admin: '+command.admin+', mod: '+command.mod+', vip: '+command.vip+', sub: '+command.sub+'');

      if (command.admin === true && admin === true) {
        return true;
      }

      if (command.mod === true && (mod === true || admin === true)) {
        return true;
      }

      if (
        command.vip === true &&
        (vip === true || mod === true || admin === true)
      ) {
        return true;
      }

      if (
        command.sub === true &&
        (sub === true || vip === true || mod === true || admin === true)
      ) {
        return true;
      }

      if (
        command.sub === false &&
        command.vip === false &&
        command.mod === false &&
        command.admin === false
      ) {
        return true;
      }
    }
    if (
      tags['badges'] === null &&
      (command.sub === true ||
        command.vip === true ||
        command.mod === true ||
        command.admin === true)
    ) {
      return false;
    }

    if (
      command.sub === false &&
      command.vip === false &&
      command.mod === false &&
      command.admin === false
    ) {
      return true;
    }
    return false;
  }

  /**
   * Sets the default color based on the nick.
   */
  @action setDefaultColor(nickname) {
    if (nickname === undefined) {
      return '#000000';
    }
    let name = nickname.toLowerCase();
    let n = name.codePointAt(0) + name.codePointAt(name.length - 1);
    let colorindex = n % this.defaultColors.length;
    let color = this.defaultColors[colorindex];
    return color;
  }

  @action parseBadges(userbadges) {
    var htmlbadges = '';
    // console.debug(userbadges);
    if (this.allbadges.length > 0) {
      for (var category in userbadges) {
        // console.debug("this is the first index: "+category);
        var badge = userbadges[category];
        // console.debug("this is the second index: "+badge);
        if (this.allbadges[category]['versions'][badge] !== 'undefined') {
          let description =
            this.allbadges[category]['versions'][badge]['description'];
          let url = this.allbadges[category]['versions'][badge]['image_url_4x'];

          htmlbadges =
            htmlbadges +
            '<img class="twitch-badge" title="' +
            description +
            '" src="' +
            url +
            '">';
        }
      }
    } else {
      console.debug('No badges to parse');
    }
    return htmlSafe(htmlbadges);
  }

  @action parseMessage(text, emotes) {
    var splitText = text.split('');
    for (var i in emotes) {
      var e = emotes[i];
      for (var j in e) {
        var mote = e[j];
        if (typeof mote == 'string') {
          mote = mote.split('-');
          mote = [parseInt(mote[0]), parseInt(mote[1])];
          var length = mote[1] - mote[0],
            empty = Array.apply(null, new Array(length + 1)).map(function () {
              return '';
            });
          splitText = splitText
            .slice(0, mote[0])
            .concat(empty)
            .concat(splitText.slice(mote[1] + 1, splitText.length));
          splitText.splice(
            mote[0],
            1,
            '<img class="twitch-emoticon" src="http://static-cdn.jtvnw.net/emoticons/v1/' +
              i +
              '/3.0">'
          );
        }
      }
    }
    return htmlSafe(splitText.join(''));
  }
  // ************************ //
  // Badge retrieving system: //
  // ************************ //

  formQuerystring(qs = {}) {
    return Object.keys(qs)
      .map((key) => `${key}=${qs[key]}`)
      .join('&');
  }

  request({ base = '', endpoint = '', qs, headers = {}, method = 'get' }) {
    let opts = {
      method,
      headers: new Headers(headers),
    };
    return fetch(base + endpoint + '?' + this.formQuerystring(qs), opts).then(
      (res) => res.json()
    );
  }

  kraken(opts) {
    let defaults = {
      base: 'https://api.twitch.tv/kraken/',
      headers: {
        'Client-ID': this.botUsername,
        Authorization: 'OAuth ' + this.botPassword,
        Accept: 'application/vnd.twitchtv.v5+json',
      },
    };

    return this.request(Object.assign(defaults, opts));
  }

  twitchNameToUser(username) {
    let opts = {
      endpoint: 'users',
      qs: { login: username },
    };

    this.kraken(opts).then((data) => {
      // console.debug(username+' id number is: '+data.users[0]._id);
      this.chanId = data.users[0]._id;
      //console.debug(this.chanId);
      this.getBadges(this.chanId);
      this.getBadges('');
    });
  }

  getBadges(channel) {
    let opts = {
      base: 'https://badges.twitch.tv/v1/badges/',
      endpoint: (channel ? `channels/${channel}` : 'global') + '/display',
      qs: { language: 'en' },
    };

    this.kraken(opts).then((data) => {
      //console.debug('Getting badges!');
      //console.debug(data.badge_sets);
      if (channel) {
        this.channelBadges = data.badge_sets;
      } else {
        this.globalBadges = data.badge_sets;
      }
      if (this.channelBadges && this.globalBadges) {
        //console.debug(this.allbadges);
      }
    });
  }

  @action superHandler(client) {
    client.on('ban', (channel, username, reason, userstate) => {
      // Do your stuff.
      this.chateventHandler(
        '<strong>@' + username + '</strong> has been banned.'
      );
    });

    client.on('unban', (channel, username, reason, userstate) => {
      // Do your stuff.
      this.chateventHandler(
        '<strong>@' + username + '</strong> has been unbanned.'
      );
    });

    client.on('chant', (channel, username, reason, userstate) => {
      // Do your stuff.
      this.chateventHandler(
        '<strong>@' + username + '</strong> started a chant!'
      );
    });

    client.on('clearchat', (channel) => {
      // Do your stuff.
      this.chateventHandler(
        '<strong>' + channel + '</strong> room has been cleared.'
      );
    });

    client.on('emoteonly', (channel, enabled) => {
      // Do your stuff.
      let message = '';
      if (enabled) {
        message = '<strong#' + channel + '</strong> enabled emotes only mode';
      } else {
        message = '<strong>' + channel + '</strong> disabled emotes only mode';
      }
      this.chateventHandler(message);
    });

    client.on('followersonly', (channel, enabled, length) => {
      // Do your stuff.
      let message = '';
      if (enabled) {
        if (length) {
          message =
            '<strong>' +
            channel +
            '</strong> enabled followers only mode for ' +
            length +
            's.';
        } else {
          message =
            '<strong>' + channel + '</strong> enabled followers only mode';
        }
      } else {
        message =
          '<strong>' + channel + '</strong> disabled followers only mode';
      }
      this.chateventHandler(message);
    });

    client.on('hosting', (channel, target, viewers) => {
      // Do your stuff.
      this.chateventHandler(
        '<strong>' +
          channel +
          '</strong> is hosting <strong>@' +
          target +
          '</strong> with <strong>' +
          viewers +
          '</strong> viewers'
      );
    });

    client.on(
      'messagedeleted',
      (channel, username, deletedMessage, userstate) => {
        // Do your stuff.
        this.msglist.slice(-60).map((msg) => {
          if (msg['id'] == userstate['target-msg-id']) {
            msg['type'] = 'deleted';
          }
        });
        this.chateventHandler(
          '<strong>' +
            channel +
            '</strong> deleted <strong>@' +
            username +
            '</strong> message: ' +
            deletedMessage
        );
      }
    );

    // Someone got modded
    client.on('mod', (channel, username) => {
      // Do your stuff.
      this.chateventHandler(
        '<strong>' +
          channel +
          '</strong> modded <strong>@' +
          username +
          '</strong>!'
      );
    });

    client.on('notice', (channel, msgid, message) => {
      // Do your stuff.
      console.debug('we got a notice!');
      this.chateventHandler(message);
    });

    client.on('slowmode', (channel, enabled, length) => {
      // Do your stuff.
      let message = '';
      if (enabled) {
        if (length) {
          message =
            '<strong>' +
            channel +
            '</strong> enabled slow mode for ' +
            length +
            's.';
        } else {
          message = '<strong>' + channel + '</strong> enabled slow mode';
        }
      } else {
        message = '<strong>' + channel + '</strong> disabled slow mode';
      }
      this.chateventHandler(message);
    });

    // Subscribers only mode:
    client.on('subscribers', (channel, enabled) => {
      // Do your stuff.
      let message = '';
      if (enabled) {
        message =
          '<strong>' + channel + '</strong> enabled subscribers only mode';
      } else {
        message =
          '<strong>' + channel + '</strong> disabled subscribers only mode';
      }
      this.chateventHandler(message);
    });

    client.on('timeout', (channel, username, reason, duration, userstate) => {
      // Do your stuff.
      // console.debug(userstate);
      let message = '';
      if (reason) {
        message =
          '<strong>@' +
          username +
          '</strong> has been timed out for ' +
          duration +
          's because: ' +
          reason;
      } else {
        message =
          '<strong>@' +
          username +
          '</strong> has been timed out for ' +
          duration +
          's';
      }

      this.chateventHandler(message);
    });

    client.on('unhost', (channel, viewers) => {
      // Do your stuff.
      this.chateventHandler(
        '' +
          channel +
          ' stopped hosting the stream with ' +
          viewers +
          ' viewers'
      );
    });

    client.on('unmod', (channel, username) => {
      // Do your stuff.
      this.chateventHandler('' + channel + ' unmodded @' + username + '  :(');
    });

    // Vip list
    client.on('vips', (channel, vips) => {
      // Do your stuff.
      console.debug(channel);
      console.debug(vips);
    });

    client.on('whisper', (from, userstate, message, self) => {
      // Don't listen to my own messages..
      if (self) return;

      // Do your stuff.
    });

    // Stream events you would get in streamlabels event list.
    client.on('anongiftpaidupgrade', (channel, username, userstate) => {
      // Do your stuff.
      this.eventHandler(
        '@' +
          username +
          ' got upgraded to ' +
          userstate['msg-param-cumulative-months'] +
          '.',
        'gift'
      );
    });

    client.on('cheer', (channel, userstate, message) => {
      // Do your stuff.
      this.eventHandler(
        '' +
          channel +
          ' got cheered by @' +
          userstate['display-name'] +
          ' with ' +
          userstate['bits'] +
          ' and the message: ' +
          message,
        'cheer'
      );
    });

    client.on('follow', (channel, userstate) => {
      // Do your stuff.
      this.eventHandler('' + channel + ' got a new follower');
    });

    client.on('hosted', (channel, username, viewers, autohost) => {
      // Do your stuff.
      this.eventHandler(
        '' +
          channel +
          ' has been hosted by @' +
          username +
          ' with ' +
          viewers +
          ' viewers. The raid is autohost? ' +
          autohost,
        'host'
      );
    });

    client.on('raided', (channel, username, viewers) => {
      // Do your stuff.
      this.eventHandler(
        '' +
          channel +
          ' has been raided by @' +
          username +
          ' with ' +
          viewers +
          ' viewers.',
        'raid'
      );
    });

    client.on(
      'resub',
      (channel, username, streakMonths, msg, tags, methods) => {
        // Do your stuff.

        let plan = '';
        if (methods['plan'] != null) {
          switch (methods['plan']) {
            case 'Prime': {
              plan = 'Prime';
              break;
            }
            case '1000': {
              plan = 'Tier 1';
              break;
            }
            case '2000': {
              plan = 'Tier 2';
              break;
            }
            case '3000': {
              plan = 'Tier 3';
              break;
            }
          }
        }
        this.eventHandler(
          '@' +
            username +
            ' resubscribed at ' +
            plan +
            ". They've subscribed for " +
            tags['msg-param-cumulative-months'] +
            ' months!',
          'resub'
        );
      }
    );

    client.on(
      'submysterygift',
      (channel, username, numbOfSubs, methods, userstate) => {
        // Do your stuff.
        /*console.debug("Mistery gifted: =============================")
        console.debug(methods);
        console.debug(userstate);*/
        this.eventHandler(
          '@' + username + ' gifted ' + numbOfSubs + ' subs.',
          'gift'
        );
      }
    );

    client.on(
      'subgift',
      (channel, username, streakMonths, recipient, methods, userstate) => {
        // Do your stuff.
        /*console.debug("Sub gifted: =============================")
        console.debug(methods);
        console.debug(userstate);*/
        this.eventHandler(
          '@' + username + ' gifted @' + recipient + ' a sub.',
          'gift'
        );
      }
    );

    client.on(
      'subscription',
      (channel, username, method, message, userstate) => {
        // Do your stuff.
        /*console.debug("Subscribed: =============================")
        console.debug(method);
        console.debug(userstate);
        console.debug(message);*/
        var plan = '';
        if (method['plan'] != null) {
          switch (method['plan']) {
            case 'Prime': {
              plan = 'Prime';
              break;
            }
            case '1000': {
              plan = 'Tier 1';
              break;
            }
            case '2000': {
              plan = 'Tier 2';
              break;
            }
            case '3000': {
              plan = 'Tier 3';
              break;
            }
          }
        }
        this.eventHandler(
          '@' + username + ' subscribed to ' + channel + ' with ' + plan + '.',
          'sub'
        );
      }
    );
  }

  @action chateventHandler(notice) {
    this.lastmessage = {
      id: 'system',
      timestamp: moment().format(),
      body: null,
      parsedbody: this.parseMessage(notice, []).toString(),
      user: '[Info]',
      displayname: '[Info]',
      color: 'inherit',
      csscolor: htmlSafe('color: inherit'),
      badges: null,
      htmlbadges: '',
      type: 'system',
      usertype: null,
      reward: false,
      emotes: null,
    };
    this.msglist.push(this.lastmessage);
  }

  @tracked lastEvent = null;
  @action eventHandler(event, type) {
    this.lastevent = {
      id: 'event',
      timestamp: moment().format(),
      parsedbody: this.parseMessage(event, []).toString(),
      user: 'event',
      displayname: 'event',
      color: '#cccccc',
      csscolor: htmlSafe('color: #cccccc'),
      badges: null,
      htmlbadges: '',
      type: type ? 'event-' + type.toString() : 'event',
      usertype: null,
      reward: false,
      emotes: null,
    };
    this.eventlist.push(this.lastevent);
  }
}
