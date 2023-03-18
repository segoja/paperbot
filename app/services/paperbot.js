import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { htmlSafe } from '@ember/template';
import { action } from '@ember/object';
import { assign } from '@ember/polyfills';
import moment from 'moment';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import tmi from 'tmi.js';
import { later, cancel } from '@ember/runloop';
import { TrackedArray } from 'tracked-built-ins';

export default class TwitchChatService extends Service {
  @service audio;
  @service globalConfig;
  @service queueHandler;
  @service currentUser;
  @service store;
  
  constructor() {
    super(...arguments);
  }
  
  
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

  @tracked botConnected = false;

  @tracked chanId;

  @tracked commands = new TrackedArray();
  get commandlist() {
    return this.commands.filter(
      (command) => command.active && !command.isDeleted
    );
  }

  get audiocommandslist() {
    return this.commandlist.filter((command) => command.type == 'audio');
  }

  @tracked lastTimerId = '';
  @tracked lastTimerPos = 0;
  @tracked lastTimerOrder = 0;
  @tracked activeTimers = new TrackedArray();

  @tracked timers = new TrackedArray();
  get timersList() {
    return this.timers.filter((timer) => timer.active && !timer.isDeleted);
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
    console.debug('Scheduling timers...');
    if (this.currentUser.isTauri) {
      let audioTimersList = this.timersList.filter(
        (timer) => timer.type == 'audio'
      );
      if ((await audioTimersList.length) > 0) {
        if ((await this.timersList.length) > 0) {
          this.audio.loadSounds(audioTimersList);
        } else {
          console.debug('No sound timers to load in soundboard!');
        }
      }
    }
    console.log(this.timersList);
    this.activeTimers = new TrackedArray();
    this.timersList.map((timer) => {
      this.timerScheduler(timer, count);
      count = count + 1;
    });
  }

  /*
    The timer scheduler works the following way:
    Timers are fired when two criteria are met: 
    - The specified time has passed
    - The amount of lines between the previous timer and the moment 
     the new one is scheduled is bigger than the specified number of lines in the settings.
    If the number of lines is not bigger the timer will be rescheduled the specified time 
    ahead over and over again until the number of chat lines required have been reached.
    
    The scheduler also avoids to fire the same timer twice in a row.
  */
  @action async timerScheduler(timer, order) {
    if (
      !timer.hasDirtyAttributes &&
      !timer.isDeleted &&
      this.botConnected &&
      this.channel
    ) {
      if (this.activeTimers[timer.id] && !timer.active) {
        //console.debug('The timer was active, cancelling')
        cancel(this.activeTimers[timer.id].action);
        this.activeTimers.splice(timer.id, 1);
      } else {
        // let canSchedule = false;

        //if(canSchedule){
        let time = this.globalConfig.config.timerTime * 60 * 1000;
        console.debug('Scheduling the timer ' + timer.name + '...');
        this.activeTimers[timer.id] = {
          action: await later(() => {
            if (this.msglist.length > 0) {
              let diff = this.msglist.length - this.lastTimerPos;

              let repeatable =
                this.activeTimers.length == 1
                  ? true
                  : this.lastTimerId != timer.id;

              if (
                diff >= this.globalConfig.config.timerLines &&
                repeatable &&
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
                this.lastTimerPos = this.msglist.length;
              }
            }
            // If there was an existing timer scheduled we cancel it so we can avoid duplicated timers:
            if (this.activeTimers[timer.id]) {
              cancel(this.activeTimers[timer.id].action);
              this.activeTimers.splice(timer.id, 1);
            }
            this.timerScheduler(timer, order);
          }, time),
          rev: timer.rev,
        };
        //}
      }
    }
    //console.debug(this.activeTimers);
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
        this.currentUser.lastStream.requests &&
        String(msg).startsWith('!sr ')
      ) {
        var song = msg.replace(/!sr /g, '');
        song = song.replace(/&/g, ' ');
        song = song.replace(/\//g, ' ');
        song = song.replace(/-/g, ' ');
        song = song.replace(/[^a-zA-Z0-9'?! ]/g, '');
        console.debug(song);
        if (song) {
          this.requestpattern = song;

          if (this.filteredSongs.length > 0) {
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
                  let nextPosition = await this.queueHandler.nextPosition();

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

                  this.lastsongrequest.title = bestmatch.title || '';
                  this.lastsongrequest.artist = bestmatch.artist || '';

                  this.lastsongrequest.save().then(async () => {
                    // Song statistics:
                    bestmatch.times_requested =
                      Number(bestmatch.times_requested) + 1;
                    bestmatch.last_requested = new Date();
                    await bestmatch.save();

                    console.debug(
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

  @tracked requestpattern = '';
  @computedFilterByQuery(
    'queueHandler.songList',
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
        if (
          this.takessongrequests &&
          this.currentUser.updateQueueOverlay &&
          this.currentUser.lastStream.requests
        ) {
          var song = commandName.replace(/!sr /g, '');
          song = song.replace(/&/g, ' ');
          song = song.replace(/\//g, ' ');
          song = song.replace(/-/g, ' ');
          song = song.replace(/[^a-zA-Z0-9'?! ]/g, '');
          console.debug(song);
          if (song) {
            this.requestpattern = song;

            if (this.filteredSongs.length > 0) {
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
                    let nextPosition = await this.queueHandler.nextPosition();

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
                    
                    this.lastsongrequest.title = bestmatch.title || '';
                    this.lastsongrequest.artist = bestmatch.artist || '';
                    
                    this.lastsongrequest.save().then(async () => {
                      // Song statistics:
                      bestmatch.times_requested =
                        Number(bestmatch.times_requested) + 1;
                      bestmatch.last_requested = new Date();
                      await bestmatch.save();

                      console.debug(
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
            console.debug(quietTime);
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
          this.currentUser.lastStream.requests &&
          String(commandName).startsWith('!random')
        ) {
          if ((await this.queueHandler.availableSongs.length) > 0) {
            let max = this.queueHandler.availableSongs.length;
            let position = Math.floor(Math.random() * max);
            let firstSong = this.queueHandler.availableSongs[position];

            if (firstSong) {
              let nextPosition = await this.queueHandler.nextPosition();

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
              
              this.lastsongrequest.title = firstSong.title || '';
              this.lastsongrequest.artist = firstSong.artist || '';

              this.lastsongrequest.save().then(async () => {
                // Song statistics:
                firstSong.times_requested =
                  Number(firstSong.times_requested) + 1;
                firstSong.last_requested = new Date();
                await firstSong.save();

                console.debug(
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
          if ((await this.queueHandler.pendingSongs.length) > 1) {
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
          if ((await this.queueHandler.playedSongs.length) > 0) {
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
          if ((await this.queueHandler.pendingSongs.length) > 0) {
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
          if ((await this.queueHandler.pendingSongs.length) > 0) {
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
          if (this.queueHandler.pendingSongs.length > 0) {
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
          if ((await this.commandlist.length) > 0) {
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
