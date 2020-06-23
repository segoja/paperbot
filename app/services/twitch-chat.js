import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import tmi from 'tmi.js';
import { htmlSafe } from '@ember/template';
import { action } from "@ember/object";

export default class TwitchChatService extends Service {
  @service audio;
 
  @tracked botclient;
  @tracked chatclient;

  @tracked msglist = [];  
  get messages(){
    return this.msglist;
  }
  
  @tracked whisperlist = [];  
  get whispers(){
    return this.whisperlist;
  }
  
  @tracked queue = []; 
  @tracked channel = '';
  @tracked botUsername = '';
  @tracked botPassword = '';
  
  @tracked botConnected = false;
  @tracked chatConnected = false;
  @tracked chanId;
  @tracked commands;
  get commandlist(){
    return this.commands;
  }

  @tracked audiocommands;
  get audiocommandslist(){
    return this.audiocommands;
  }
  
  @tracked soundBoardEnabled = true;
  
  @tracked lastmessage = null;
  @tracked lastsongrequest = null;
  
  @tracked takessongrequests;
  
  @tracked channelBadges;
  
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
  
  
  
  init() {
    super.init(...arguments);
  }
  
  async connector(options, clientType){
    
    // We check what kind of client is connecting
    if(clientType === "bot"){
      if(this.botConnected === true){
        this.botclient.disconnect();
      }
      
      // this.channel = options.channels.toString();
      this.botUsername = options.identity.username.toString();
      this.botPassword = options.identity.password.replace(/oauth:/g, '');
      
      this.botclient = new tmi.client(options);
      // Register our event handlers (defined below)
      this.botclient.on('connecting', this.soundboard);
      this.botclient.on('connected', this.onBotConnectedHandler);
      this.botclient.on('disconnected', this.unloadSoundboard);
      this.botclient.on('message', this.messageHandler);
      // this.botclient.on('hosting', this.onHostHandler);
      // Connect the client
      this.botConnected = await this.botclient.connect().then(
        function(){
          console.log("bot client connected!");
          return true;
        }, function() {
          console.log("error connecting bot client!");
          return false;
        }
      );
      if(this.botConnected){
        this.botclient.join(this.channel);
        this.superHandler(this.botclient);
        this.chanId = this.twitchNameToUser(this.channel);
        this.channelBadges = this.getBadges(this.chanId);
      }
      
      return this.botConnected;
    }
    // We check what kind of client is connecting
    if(clientType === "chat"){
      if(this.chatConnected === true){
        this.chatclient.disconnect();
      }
      // this.channel = options.channels.toString();
      this.chatclient = new tmi.client(options);
      // Register our event handlers (defined below)
      // this.chatclient.on('connected', this.onChatConnectedHandler);
      // this.chatclient.on('message', this.messageHandler);
   
      // Connect the client
      this.chatConnected = await this.chatclient.connect().then(
        function() {
          console.log("chat client connected!");
          return true;
        }, 
        function() {
          console.log("error connecting chat client!");
          return false;
        }
      );
      if(this.chatConnected){
        this.chatclient.join(this.channel);
      }
      return this.chatConnected;
    }
  }

  async disconnector(){
    if(this.botConnected === true){
      this.botclient.disconnect().then(()=>{
        this.botConnected = false;
        this.channel = '';
        this.botUsername = '';
        console.log("The bot client got disconnected!");
      });
    }
    if(this.chatConnected === true){
      this.chatclient.disconnect().then(() => {
        this.chatConnected = false;
        this.channel = '';
        console.log("The chat client got disconnected!");        
      });
    }
   return true;
  }

  // Called every time the bot connects to Twitch chat
  @action onBotConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
  }  
  // Called every time the bot connects to Twitch chat
  @action onChatConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
  }

  @action soundboard(){
    console.log("Loading the soundboard...");
    if(this.audiocommandslist.lenght !== 0){
      this.audiocommandslist.forEach((command) => {
        this.audio.load(command.soundfile).asSound(command.name).then(
          function() {
            console.log(command.soundfile+ " loaded in the soundboard");
          }, 
          function() {
            console.log("error loading "+command.soundfile+" in the soundboard!");
          }
        );
      });
    } else {
      console.log("No sound commands to load in soundboard!");
    }
  }  

  @action unloadSoundboard(){
    console.log("Unloading the soundboard...");
    if(this.audiocommandslist.lenght !== 0){
      this.audiocommandslist.forEach((command) => {
        this.audio.removeFromRegister('sound', command.name);
        console.log(command.soundfile+ " unloaded from the soundboard");
      });
    } else {
      console.log("No sound commands to unload in soundboard!");
    }
  }

  @action onHostHandler (channel, target, viewers) {
    console.log(channel+" hosted "+target+" with our "+viewers+" viewers.");
  }

  @action messageHandler(target, tags, msg, self){
    console.log(tags);

    this.lastmessage = {
      id: tags['id'] ? tags['id'].toString() : 'system',
      timestamp: new Date(),
      body: msg ? msg.toString() : null,
      parsedbody: this.parseMessage(msg.toString(), tags['emotes']).toString(),    
      user: tags['username'] ? tags['username'].toString() : this.botUsername,
      displayname: tags['display-name'] ? tags['display-name'].toString() : this.botUsername,      
      color: tags['color'] ? tags['color'].toString() : this.setDefaultColor(tags['username']).toString(),
      csscolor: tags['color'] ? htmlSafe('color: ' + tags['color']) : htmlSafe('color: ' + this.setDefaultColor(tags['username']).toString()),        
      badges: tags['badges'] ? tags['badges'] : null,
      type: tags['message-type'] ? tags['message-type'] : null,
      usertype: tags['user-type'] ? tags['user-type'].toString() : null,
      reward: tags['msg-id'] ? true : false,
      emotes: tags['emotes'] ? tags['emotes'] : null,
    };
    
    if(tags['message-type'] != "whisper"){
      if(tags['custom-reward-id'] && this.takessongrequests){
        this.botclient.say(target, '/me @'+tags['username']+ ' requested the song "'+msg+'"');
        this.lastsongrequest = {
          id: tags['id'] ? tags['id'].toString() : 'songsys',
          timestamp: new Date,
          type: tags['message-type'] ? tags['message-type'] : null,
          song: msg, 
          user: tags['username'] ? tags['username'].toString() : this.botUsername,
          displayname: tags['display-name'] ? tags['display-name'].toString() : this.botUsername,
          color: tags['color'] ? tags['color'].toString() : this.setDefaultColor(tags['username']).toString(),
          csscolor: tags['color'] ? htmlSafe('color: ' + tags['color']) : htmlSafe('color: ' + this.setDefaultColor(tags['username']).toString()),
          emotes: tags['emotes'] ? tags['emotes'] : null,
          processed: false,
        };
        this.queue.push(this.lastsongrequest);
      } else {
        this.msglist.push(this.lastmessage);
        this.commandHandler(target, tags, msg, self);
      }
    } else {
      this.whisperlist.push(this.lastmessage);
    }
  }

  // Called every time a message comes in
  @action commandHandler (target, tags, msg, self) {
    // Ignore messages from the bot so you don't create command infinite loops
    if (self) { return; }
    // Remove whitespace from chat message
    const commandName = msg.trim();
    
    // If the command is known, let's execute it      
    if(String(commandName).startsWith('!sr ') && this.takessongrequests){
      var song = commandName.replace(/!sr /g, '');
      if(song){
        this.botclient.say(target, '/me @'+tags['username']+ ' requested the song "'+song+'"');
        this.lastsongrequest = {
          id: tags['id'] ? tags['id'].toString() : 'songsys',
          timestamp: new Date,
          type: tags['message-type'] ? tags['message-type'] : null,
          song: song, 
          user: tags['username'] ? tags['username'].toString() : this.botUsername,
          displayname: tags['display-name'] ? tags['display-name'].toString() : this.botUsername,
          color: tags['color'] ? tags['color'].toString() : this.setDefaultColor(tags['username']).toString(),
          csscolor: tags['color'] ? htmlSafe('color: ' + tags['color']) : htmlSafe('color: ' + this.setDefaultColor(tags['username']).toString()),
          emotes: tags['emotes'] ? tags['emotes'] : null,
          processed: false,
        };
        this.queue.push(this.lastsongrequest);
      }
      console.log(`* Executed ${commandName} command`);        
    } else {        
      this.commandlist.forEach((command) => {
        if(String(commandName).startsWith(command.name) && command.name != '' && command.active){
          /*if (self) { 
            return;  
          } else {*/
            switch (command.type) {
              case 'parameterized':{
                let pattern = new RegExp(`${command.name}`, 'gi');
                
                let param = commandName.replace(pattern, '').trim();
                
                let answerraw = command.response;
                
                let answer = answerraw.replace(/\$param/g, param).trim();
                
                this.botclient.say(target, answer);
                
                console.log(`* Executed ${command.name} command`);
                
                break;
              }
              case 'audio':{
                if (this.soundBoardEnabled){
                  let sound = this.audio.getSound(command.name);
                  sound.changeGainTo(command.volume).from('percent');
                  sound.play();
                }
                break;
              }
              default:{
                this.botclient.say(target, command.response);
                console.log(`* Executed ${command.name} command`);
                break;
              }
            }
          /*}*/
        }
      });        
    }
  }


    /**
     * Sets the default color based on the nick.
     */
   @action setDefaultColor(nickname) {
      if (nickname === undefined) {
          return "#000000";
      }
      let name = nickname.toLowerCase();
      let n = name.codePointAt(0) + name.codePointAt(name.length - 1);
      let colorindex = n % this.defaultColors.length;
      let color = this.defaultColors[colorindex];     
      return color ;
    }

  @action parseBadges(emotes) {
    for(var i in emotes) {
        var e = emotes[i];
        for(var j in e) {
            var mote = e[j];
            if(typeof mote == 'string') {
                mote = mote.split('-');
                mote = [parseInt(mote[0]), parseInt(mote[1])];
                var length =  mote[1] - mote[0],
                    empty = Array.apply(null, new Array(length + 1)).map(function() { return '' });
                splitText = splitText.slice(0, mote[0]).concat(empty).concat(splitText.slice(mote[1] + 1, splitText.length));
                splitText.splice(mote[0], 1, '<img class="emoticon" src="https://static-cdn.jtvnw.net/badges/v1/' + i + '/3">');
            }
        }
    }
    return htmlSafe(splitText.join(''));
  }

  @action parseMessage(text, emotes) {
    var splitText = text.split('');
    for(var i in emotes) {
        var e = emotes[i];
        for(var j in e) {
            var mote = e[j];
            if(typeof mote == 'string') {
                mote = mote.split('-');
                mote = [parseInt(mote[0]), parseInt(mote[1])];
                var length =  mote[1] - mote[0],
                    empty = Array.apply(null, new Array(length + 1)).map(function() { return '' });
                splitText = splitText.slice(0, mote[0]).concat(empty).concat(splitText.slice(mote[1] + 1, splitText.length));
                splitText.splice(mote[0], 1, '<img class="emoticon" src="http://static-cdn.jtvnw.net/emoticons/v1/' + i + '/3.0">');
            }
        }
    }
    return htmlSafe(splitText.join(''));
  }
  // ************************ //
  // Badge retrieving system: //
  // ************************ //

    @action formQuerystring(qs = {}) {
      return Object.keys(qs)
        .map(key => `${key}=${qs[key]}`)
        .join('&');
    }

    async request({ base = '', endpoint = '', qs, headers = {}, method = 'get' }) {
      let opts = {
          method,
          headers: new Headers(headers)
        };
      return fetch(base + endpoint + '?' + this.formQuerystring(qs), opts)
      .then(res => res.json());
    }


  @action kraken(opts) {
    let defaults = {
        base: 'https://api.twitch.tv/kraken/',
        headers: {
          'Client-ID': this.botPassword,
          Accept: 'application/vnd.twitchtv.v5+json'
        }
      };
    return this.request(Object.assign(defaults, opts));
  }
  
  @action twitchNameToUser(username) {
    return this.kraken({
      endpoint: 'users',
      qs: { login: username.toString() }
    })
    .then(({ users }) => users[0] || null);
  }
  
  @action getBadges(channel) {
    let opts = {
      base: 'https://badges.twitch.tv/v1/badges/',
      endpoint: (channel ? `channels/${channel}` : 'global') + '/display',
      qs: { language: 'en' }
    };
    
    return this.kraken(opts).then(data => data.badge_sets);
  }

  
  @action superHandler(client){
    client.on("action", (channel, userstate, message, self) => {
        // Don't listen to my own messages..
        if (self) return;
        console.log(userstate);
        console.log(message);
        // Do your stuff.
    });

    client.on("anongiftpaidupgrade", (channel, username, userstate) => {
        // Do your stuff.
    });

    client.on("ban", (channel, username, reason, userstate) => {
        // Do your stuff.
        console.log(userstate);
        console.log(username+' - '+reason);
    });

    /*client.on("chat", (channel, userstate, message, self) => {
        // Don't listen to my own messages..
        if (self) return;
        // Do your stuff.
    });*/

    client.on("cheer", (channel, userstate, message) => {
        // Do your stuff.
        console.log(userstate);        
        console.log(message);
    });
    /*
    client.on("clearchat", (channel) => {
        // Do your stuff.
    });

    client.on("connected", (address, port) => {
        // Do your stuff.
    });


    client.on("connecting", (address, port) => {
        // Do your stuff.
    });


    client.on("disconnected", (reason) => {
        // Do your stuff.
    });*/

    client.on("emoteonly", (channel, enabled) => {
        // Do your stuff.
    });

    client.on("emotesets", (sets, obj) => {
        // Here are the emotes I can use:
        console.log(obj);
    });

    client.on("followersonly", (channel, enabled, length) => {
        // Do your stuff.
    });

    client.on("giftpaidupgrade", (channel, username, sender, userstate) => {
        // Do your stuff.
    });


    client.on("hosted", (channel, username, viewers, autohost) => {
        // Do your stuff.
    });

    client.on("hosting", (channel, target, viewers) => {
        // Do your stuff.
    });

    client.on("join", (channel, username, self) => {
        // Do your stuff.
      if(self){
        this.botclient.say(this.channel, '/me The bot is the house!');
      }

    });
  
    client.on("logon", () => {
        // Do your stuff.
    });
    /*
    client.on("message", (channel, userstate, message, self) => {
        // Don't listen to my own messages..
        if (self) return;

        // Handle different message types..
        switch(userstate["message-type"]) {
            case "action":
                // This is an action message..
                break;
            case "chat":
                // This is a chat message..
                break;
            case "whisper":
                // This is a whisper..
                break;
            default:
                // Something else ?
                break;
        }
    });*/

    client.on("messagedeleted", (channel, username, deletedMessage, userstate) => {
        // Do your stuff.
    });

    // Someone got modded
    client.on("mod", (channel, username) => {
        // Do your stuff.
    });

    // Get the Mod list
    client.on("mods", (channel, mods) => {
        // Do your stuff.
    });

    client.on("notice", (channel, msgid, message) => {
        // Do your stuff.
        console.log(msgid+' - '+message);
        
    });

    client.on("part", (channel, username, self) => {
        // Do your stuff.
    });

    client.on("ping", () => {
        // Do your stuff.
    });

    client.on("pong", (latency) => {
        // Do your stuff.
    });

    client.on("r9kbeta", (channel, enabled) => {
        // Do your stuff.
    });

    client.on("raided", (channel, username, viewers) => {
        // Do your stuff.
        console.log(username+' - '+viewers);
    });

    client.on("raw_message", (messageCloned, message) => {
       // console.log(message.raw);
    });

    client.on("reconnect", () => {
        // Do your stuff.
    });

    client.on("resub", (channel, username, months, message, userstate, methods) => {
        // Do your stuff.
        let cumulativeMonths = ~~userstate["msg-param-cumulative-months"];
        console.log(userstate);
        console.log(methods);
        

        console.log(username+' juscribed for '+cumulativeMonths+' and his curren streak is '+months+' consecutive months!');
    });

    client.on("roomstate", (channel, state) => {
        // Do your stuff.
    });

    client.on("serverchange", (channel) => {
        // Do your stuff.
    });

    client.on("slowmode", (channel, enabled, length) => {
        // Do your stuff.
    });

    client.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
        // Do your stuff.
        let senderCount = ~~userstate["msg-param-sender-count"];
    });

    client.on("submysterygift", (channel, username, numbOfSubs, methods, userstate) => {
        // Do your stuff.
        let senderCount = ~~userstate["msg-param-sender-count"];
    });

    // Subscribers only mode:
    client.on("subscribers", (channel, enabled) => {
        // Do your stuff.
    });


    client.on("subscription", (channel, username, method, message, userstate) => {
        // Do your stuff.
        console.log(userstate);
        console.log(username+' just juscribed with'+method);
        console.log(message);

    });

    client.on("timeout", (channel, username, reason, duration, userstate) => {
        // Do your stuff.
    });

    client.on("unhost", (channel, viewers) => {
        // Do your stuff.
    });


    client.on("unmod", (channel, username) => {
        // Do your stuff.
    });

    // Vip list
    client.on("vips", (channel, vips) => {
        // Do your stuff.
    });

    client.on("whisper", (from, userstate, message, self) => {
        // Don't listen to my own messages..
        if (self) return;

        // Do your stuff.
    });
  }
}
