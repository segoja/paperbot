import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import tmi from 'tmi.js';
import { htmlSafe } from '@ember/template';
import { run } from '@ember/runloop';
import EmberObject, { action, computed } from "@ember/object";
import { isEmpty } from '@ember/utils';

export default class TwitchChatService extends Service {
  @service store;
  @service audio;
  @service activeClient;
 
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
  @tracked password = '';
  
  @tracked botConnected = false;
  @tracked chatConnected = false;

  @tracked commands  = this.store.findAll('command');
  get commandlist(){
    return this.commands;
  }
  @tracked clients = this.store.findAll('client');
  get clientlist(){
    return this.clients;
  }
  
  @tracked audiocommandlist = []
  
  @tracked lastmessage = null;
  @tracked lastsongrequest = null;
  
  init() {
    super.init(...arguments);
  }
  
  async connector(options, clientType){
    
    // We check what kind of client is connecting
    if(clientType === "bot"){
      if(this.botConnected === true){
        this.botclient.disconnect();
      }
      this.channel = options.channels.toString();
      this.botUsername = options.identity.username.toString();
      this.botclient = new tmi.client(options);
      // Register our event handlers (defined below)
      // this.botclient.on('connected', this.onBotConnectedHandler);
      this.botclient.on('message', this.messageHandler);
      this.botclient.on('hosting', this.onHostHandler);
      // this.superHandler(this.botclient);

      // Connect the client
      this.botConnected =  await this.botclient.connect().then(
        success => {
          console.log("bot client connected!");
          return true;
        }, 
        error => {
          console.log("error connecting bot client!");
          return false;
        }
      );
      return this.botConnected;
    }
    // We check what kind of client is connecting
    if(clientType === "chat"){
      if(this.chatConnected === true){
        this.chatclient.disconnect();
      }
      this.channel = options.channels.toString();
      this.chatclient = new tmi.client(options);
      // Register our event handlers (defined below)
      // this.chatclient.on('connected', this.onChatConnectedHandler);
      //this.chatclient.on('message', this.messageHandler);
   
      // Connect the client
      this.chatConnected =  await this.chatclient.connect().then(
        success => {
          console.log("chat client connected!");
          return true;
        }, 
        error => {
          console.log("error connecting chat client!");
          return false;
        }
      );
      return this.chatConnected;
    }    
  }
  
  async disconnector(){
    if(this.botConnected === true){
      this.botclient.disconnect().then(success => {
        this.botConnected = false;
        this.channel = '';
        this.botUsername = '';
        console.log("The bot client got disconnected!");
      });
    }
    if(this.chatConnected === true){
      this.chatclient.disconnect().then(success => {
        this.chatConnected = false;
        this.channel = '';
        console.log("The chat client got disconnected!");        
      });
    }
   return true;
  }
  
  @action onHostHandler (channel, target, viewers) {
    console.log(channel+" hosted "+target+" with our "+viewers+" viewers.");
  }

  @action messageHandler(target, tags, msg, self){
    this.lastmessage = {
      id: tags['id'] ? tags['id'].toString() : 'system',
      timestamp: new Date(),
      body: msg ? msg.toString() : null,
      parsedbody: this.parseMessage(msg.toString(), tags['emotes']).toString(),    
      user: tags['username'] ? tags['username'].toString() : this.botUsername,
      color: tags['color'] ? tags['color'].toString() : null,
      csscolor: tags['color'] ? htmlSafe('color: ' + tags['color']) : null,        
      badges: tags['badges'] ? tags['badges'] : null,
      type: tags['message-type'] ? tags['message-type'] : null,
      usertype: tags['user-type'] ? tags['user-type'].toString() : null,
      reward: tags['msg-id'] ? true : false,
      emotes: tags['emotes'] ? tags['emotes'] : null,
    };
    
    if(tags['message-type'] != "whisper"){
      if(tags['custom-reward-id']){
        this.botclient.say(target, '/me @'+tags['username']+ ' requested the song "'+msg+'"');
        this.lastsongrequest = {
          id: tags['id'] ? tags['id'].toString() : 'songsys',
          timestamp: new Date,
          type: tags['message-type'] ? tags['message-type'] : null,
          song: msg, 
          user: tags['username'] ? tags['username'].toString() : this.botUsername,
          color: tags['color'] ? tags['color'].toString() : null,
          csscolor: tags['color'] ? htmlSafe('color: ' + tags['color']) : null,
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
  //if (self) { return; } // Ignore messages from the bot
  // Remove whitespace from chat message
    const commandName = msg.trim();
    console.log(tags);
    
    // If the command is known, let's execute it      
    if(String(commandName).startsWith('!sr ')){
      var song = commandName.replace(/!sr /g, '');
      if(song){
        this.botclient.say(target, '/me @'+tags['username']+ ' requested the song "'+song+'"');
        this.lastsongrequest = {
          id: tags['id'] ? tags['id'].toString() : 'songsys',
          timestamp: new Date,
          type: tags['message-type'] ? tags['message-type'] : null,
          song: song, 
          user: tags['username'] ? tags['username'].toString() : this.botUsername,
          color: tags['color'] ? tags['color'].toString() : null,
          csscolor: tags['color'] ? htmlSafe('color: ' + tags['color']) : null,
          emotes: tags['emotes'] ? tags['emotes'] : null,
          processed: false,
        };
        this.queue.push(this.lastsongrequest);
      }
      console.log(`* Executed ${commandName} command`);        
    } else {        
      this.commandlist.forEach((command) => {
        if(String(commandName).startsWith(command.name)){
          /*if (self) { 
            return;  
          } else {*/
            switch (command.type) {
              case 'param':
                let pattern = new RegExp(`${command.name}`, 'gi');
                
                let param = commandName.replace(pattern, '').trim();
                
                let answerraw = command.response;
                
                let answer = answerraw.replace(/\$param/g, param).trim();
                
                this.botclient.say(target, answer);
                
                console.log(`* Executed ${command.name} command`);
              break;
              case 'audio':
                this.audio.load(command.soundfile).asSound(command.name).then(() =>{
                    this.audio.getSound(command.name).play();
                  });
              break;
              default:
                this.botclient.say(target, command.response);
                console.log(`* Executed ${command.name} command`);
              break;
            }
          /*}*/
        }
      });        
    }
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
    return splitText.join('');
  }

  
  // Called every time the bot connects to Twitch chat
  @action onBotConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    //alert(this.botclient.username);
    this.botclient.say(this.channel, '/me ### The bot is the house! ###');
  }  
  // Called every time the bot connects to Twitch chat
  @action onChatConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    //alert(this.botclient.username);
    this.botclient.say(this.channel, '/me connected using paperbot\'s client!');
  }
  
  superHandler(client){
    client.on("action", (channel, userstate, message, self) => {
        // Don't listen to my own messages..
        if (self) return;

        // Do your stuff.
    });

    client.on("anongiftpaidupgrade", (channel, username, userstate) => {
        // Do your stuff.
    });

    client.on("ban", (channel, username, reason, userstate) => {
        // Do your stuff.
    });

    client.on("chat", (channel, userstate, message, self) => {
        // Don't listen to my own messages..
        if (self) return;
        // Do your stuff.
    });

    client.on("cheer", (channel, userstate, message) => {
        // Do your stuff.
    });

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
    });

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
    });


    client.on("logon", () => {
        // Do your stuff.
    });

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
    });

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
    });

    client.on("raw_message", (messageCloned, message) => {
        console.log(message.raw);
    });

    client.on("reconnect", () => {
        // Do your stuff.
    });

    client.on("resub", (channel, username, months, message, userstate, methods) => {
        // Do your stuff.
        let cumulativeMonths = ~~userstate["msg-param-cumulative-months"];
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
