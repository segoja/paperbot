import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import tmi from 'tmi.js';
import { htmlSafe } from '@ember/template';
import { action } from "@ember/object";
import { assign } from '@ember/polyfills';
import { sort } from '@ember/object/computed';
import moment from 'moment';
import Fuse from 'fuse.js';
import computedFilterByQuery from 'ember-cli-filter-by-query';

export default class TwitchChatService extends Service {
  @service audio;
 
  @tracked botclient;
  @tracked chatclient;

  @tracked savechat = false;

  @tracked msglist = [];  
  get messages(){
    if (this.savechat){
      return this.msglist;
    } else {
      this.msglist = this.msglist.slice(-45);
      return this.msglist;
    }
  }
  
  @tracked whisperlist = [];  
  get whispers(){
    return this.whisperlist;
  }
  
  @tracked eventlist = []; 
  get events(){
    return this.eventlist;
  } 
  
  @tracked songqueue = []; 
  
  queueAscSorting = Object.freeze(['timestamp:asc']); 
  @sort (
    'songqueue',
    'queueAscSorting'
  ) arrangedAscQueue;
  
  queueDescSorting = Object.freeze(['timestamp:desc']);    
  @sort (
    'songqueue',
    'queueDescSorting'
  ) arrangedDescQueue;
  
  get pendingSongs() {
    return this.arrangedDescQueue.filterBy('processed', false);
  }
  
  get playedSongs() {
    return this.arrangedAscQueue.filterBy('processed', true);
  }
  

  
  @tracked modactions = []; 

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
  @tracked lastevent = null;
  @tracked lastmodaction = null;
  @tracked lastSoundCommand = null;
  @tracked takessongrequests;
  
  @tracked channelBadges = [];
  @tracked globalBadges = [];
  get allbadges(){
    let pack = assign(this.globalBadges, this.channelBadges);
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
        this.twitchNameToUser(this.channel);
        console.log(this.badgespack);
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
      this.chatUsername = options.identity.username.toString();
      this.chatPassword = options.identity.password.replace(/oauth:/g, '');
   
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
    var isDisconnected = false;
    if(this.botConnected === true){
      this.botclient.disconnect().then(()=>{
        this.botConnected = false;
        this.channel = '';
        this.botUsername = '';
        isDisconnected = true;
        console.log("The bot client got disconnected!");
      });
    }
    if(this.chatConnected === true){
      this.chatclient.disconnect().then(() => {
        this.chatConnected = false;
        this.channel = '';
        isDisconnected = true;
        console.log("The chat client got disconnected!");        
      });
    }
    return isDisconnected;     
  }
  async disconnectBot(){
    var isDisconnected = false;
    if(this.botConnected === true){
      this.botclient.disconnect().then(()=>{
        this.botConnected = false;
        this.channel = '';
        this.botUsername = '';
        isDisconnected = true;
        console.log("The bot client got disconnected!");
      });
    }
   return isDisconnected;
  }
  async disconnectChat(){
    var isDisconnected = false;
    if(this.chatConnected === true){
      this.chatclient.disconnect().then(() => {
        this.chatConnected = false;
        this.channel = '';
        isDisconnected = true;
        console.log("The chat client got disconnected!");        
      });
    }
   return isDisconnected;
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
    // console.log(tags);
    // this.parseBadges(tags['badges']);
    
    this.lastmessage = {
      id: tags['id'] ? tags['id'].toString() : 'system',
      timestamp: moment().format(),
      body: msg ? msg.toString() : null,
      parsedbody: this.parseMessage(msg.toString(), tags['emotes']).toString(),    
      user: tags['username'] ? tags['username'].toString() : this.botUsername,
      displayname: tags['display-name'] ? tags['display-name'].toString() : this.botUsername,      
      color: tags['color'] ? tags['color'].toString() : this.setDefaultColor(tags['username']).toString(),
      csscolor: tags['color'] ? htmlSafe('color: ' + tags['color']) : htmlSafe('color: ' + this.setDefaultColor(tags['username']).toString()),        
      badges: tags['badges'] ? tags['badges'] : null,
      htmlbadges:  tags['badges'] ? this.parseBadges(tags['badges']).toString() : '',
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
          timestamp: moment().format(),
          type: tags['message-type'] ? tags['message-type'] : null,
          song: msg, 
          user: tags['username'] ? tags['username'].toString() : this.botUsername,
          displayname: tags['display-name'] ? tags['display-name'].toString() : this.botUsername,
          color: tags['color'] ? tags['color'].toString() : this.setDefaultColor(tags['username']).toString(),
          csscolor: tags['color'] ? htmlSafe('color: ' + tags['color']) : htmlSafe('color: ' + this.setDefaultColor(tags['username']).toString()),
          emotes: tags['emotes'] ? tags['emotes'] : null,
          processed: false,
        };
        this.songqueue.push(this.lastsongrequest);
      } else {
        this.msglist.push(this.lastmessage);
        this.commandHandler(target, tags, msg, self);
      }
    } else {
      this.whisperlist.push(this.lastmessage);
    }
  }

  songsSorting = Object.freeze(['date_added:asc']);
  
  @sort (
    'songs',
    'songsSorting'
  ) arrangedSongs; 
  
  @tracked requestpattern = '';
  
  @computedFilterByQuery(
    'arrangedSongs',
    ['title','artist','keywords'],
    'requestpattern',
    { conjunction: 'and', sort: false}
  ) filteredSongs;

  
  
  // Called every time a message comes in
  @action commandHandler (target, tags, msg, self) {
    // Ignore messages from the bot so you don't create command infinite loops
    if (self) { return; }
    // Remove whitespace from chat message
    const commandName = msg.trim();
    
    // If the command is known, let's execute it      
    if(String(commandName).startsWith('!sr ') && this.takessongrequests){
      var song = commandName.replace(/!sr /g, "");
      if(song){
        /*let options = {
          includeScore: true,
          findAllMatches: true,
          ignoreLocation: true,
          // useExtendedSearch: true,
          minMatchCharLength: 2,
          //ignoreFieldNorm: true,
          threshold: 0.2,
          keys: [
            {
              name: 'fullstring',
            },
          ]
        }
        let fuse = new Fuse(this.songs, options);
        var tokenized = song.replace(/ /g, " ");
        console.log(tokenized);
        var search = fuse.search(tokenized);
        console.log(search);
        var bestmatch = search.shift(); */       

        this.requestpattern = song;
        
        if (this.filteredSongs.get('length') !== 0 ) { 
          console.log("we found songs!");  
          var bestmatch = this.filteredSongs.shift();
          console.log("=================");
          console.log(bestmatch);
          console.log("=================");
          if(bestmatch.active){
            if(this.commandPermissionHandler(bestmatch, tags) === true){
              song = bestmatch.title+" by "+bestmatch.artist;
              this.botclient.say(target, '/me @'+tags['username']+ ' requested the song "'+song+'"');
              this.lastsongrequest = {
                id: tags['id'] ? tags['id'].toString() : 'songsys',
                timestamp: moment().format(),
                type: tags['message-type'] ? tags['message-type'] : null,
                song: song, 
                user: tags['username'] ? tags['username'].toString() : this.botUsername,
                displayname: tags['display-name'] ? tags['display-name'].toString() : this.botUsername,
                color: tags['color'] ? tags['color'].toString() : this.setDefaultColor(tags['username']).toString(),
                csscolor: tags['color'] ? htmlSafe('color: ' + tags['color']) : htmlSafe('color: ' + this.setDefaultColor(tags['username']).toString()),
                emotes: tags['emotes'] ? tags['emotes'] : null,
                processed: false,
              };
              this.songqueue.push(this.lastsongrequest);              
            } else {
              this.botclient.say(target, "/me @"+tags['username']+" you are not allowed to request that song.");
            }
          
          } else {
            this.botclient.say(target, "/me I coudln't infer the song @"+tags['username']+". Try again!");
          }
        } else {
          this.botclient.say(target, '/me @'+tags['username']+ ' that song is not in the songlist. Try again!');         
        }
      }
      console.log(`* Executed ${commandName} command`);        
    } else {
      this.commandlist.forEach((command) => {
          if(String(commandName).startsWith(command.name) && command.name != '' && command.active){
            /*if (self) { 
              return;  
            } else {*/
            if(this.commandPermissionHandler(command, tags) === true){
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
                    this.lastSoundCommand = sound;
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
            } else{ 
              console.log("Not authorized to use "+command.name+" command.")
            } 
            /*}*/
          }

      });        
    }
  }

  
  @action commandPermissionHandler(command, tags){
    // console.log(tags['badges']);
    if(tags['badges'] != null){
      var admin = false;      
      var mod = false;
      var vip = false;
      var sub = false;      
      
      for(var category in tags['badges']) {
        switch (category) {
          case 'broadcaster':{
            admin = true;
            break;
          }
          case 'moderator':{
            mod = true;
            break;
          }
          case 'vip':{
            vip = true;
            break;
          }
          case 'subscriber':{
            sub = true;
            break;
          }          
        }
      }
      //console.log('User -> admin: '+admin+', mod: '+mod+', vip: '+vip+', sub: '+sub+'');
      //console.log('Command -> admin: '+command.admin+', mod: '+command.mod+', vip: '+command.vip+', sub: '+command.sub+'');
      
      if(command.admin === true && admin === true){
        return true;
      }
      
      if(command.mod === true && (mod === true || admin === true)){
        return true;
      }
      
      if(command.vip === true && (vip === true|| mod === true || admin === true)){
        return true;
      }
      
      if(command.sub === true && (sub === true || vip === true || mod === true || admin === true)){
        return true
      }
      
      if(command.sub === false && command.vip === false && command.mod === false && command.admin === false){
        return true;
      } 
    }
    if(tags['badges'] === null && (command.sub === true || command.vip === true || command.mod === true || command.admin === true)){      
      return false;
    }
    
    if(command.sub === false && command.vip === false && command.mod === false && command.admin === false){      
      return true;
    }    
    return false;
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

  @action parseBadges(userbadges) {
    var htmlbadges = '';
    // console.log(userbadges);
    for(var category in userbadges) {
      // console.log("this is the first index: "+category);
      var badge = userbadges[category];
      // console.log("this is the second index: "+badge);        
        if (this.allbadges[category]['versions'][badge] !== 'undefined'){
          
          let description = this.allbadges[category]['versions'][badge]['description'];
          let url = this.allbadges[category]['versions'][badge]['image_url_4x'];
          
          htmlbadges = htmlbadges+'<img class="twitch-badge" title="'+description+'" src="'+url+'">';            
        }    
    }    
    return htmlSafe(htmlbadges);    
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
                splitText.splice(mote[0], 1, '<img class="twitch-emoticon" src="http://static-cdn.jtvnw.net/emoticons/v1/' + i + '/3.0">');
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
      .map(key => `${key}=${qs[key]}`)
      .join('&');
  }

  request({ base = '', endpoint = '', qs, headers = {}, method = 'get' }) {
    let opts = {
        method,
        headers: new Headers(headers)
      };
    return fetch(base + endpoint + '?' + this.formQuerystring(qs), opts)
    .then(res => res.json());
  }


  kraken(opts) {
    let defaults = {
        base: 'https://api.twitch.tv/kraken/',
        headers: {
          'Client-ID': this.botUsername,
          'Authorization': 'OAuth '+this.botPassword,          
          Accept: 'application/vnd.twitchtv.v5+json'
        }
      };
    
    return this.request(Object.assign(defaults, opts));
  }
  
  twitchNameToUser(username) {
    let opts = {
      endpoint: 'users',
      qs: { login: username }
    };
    
    this.kraken(opts).then((data) => {
      // console.log(username+' id number is: '+data.users[0]._id);
      this.chanId = data.users[0]._id;
      //console.log(this.chanId);
      this.getBadges(this.chanId);
      this.getBadges('');
    });
  }
  
  getBadges(channel) {
    let opts = {
      base: 'https://badges.twitch.tv/v1/badges/',
      endpoint: (channel ? `channels/${channel}` : 'global') + '/display',
      qs: { language: 'en' }
    };
    
    this.kraken(opts).then((data) => {
      //console.log('Getting badges!');
      //console.log(data.badge_sets);
      if(channel){
        this.channelBadges = data.badge_sets;        
      } else {
        this.globalBadges = data.badge_sets;
      }
      if(this.channelBadges && this.globalBadges){
        //console.log(this.allbadges);
      }
    });
  }
  
  
  
  
  
  @action superHandler(client){

    client.on("ban", (channel, username, reason, userstate) => {
        // Do your stuff.
        this.chateventHandler("<strong>@"+username+"</strong> has been banned.");
    });

    client.on("unban", (channel, username, reason, userstate) => {
        // Do your stuff.
        this.chateventHandler("<strong>@"+username+"</strong> has been unbanned.");
    });

    client.on("clearchat", (channel) => {
        // Do your stuff.
        this.chateventHandler("<strong>"+channel+"</strong> room has been cleared.");
    });

    client.on("emoteonly", (channel, enabled) => {
        // Do your stuff.
        let message = "";
        if(enabled){  
          message = "<strong#"+channel+"</strong> enabled emotes only mode";
        } else {
          message = "<strong>"+channel+"</strong> disabled emotes only mode";
        }        
        this.chateventHandler(message);      
    });

    client.on("followersonly", (channel, enabled, length) => {
        // Do your stuff.
        let message = "";
        if(enabled){
          if(lenght){
            message = "<strong>"+channel+"</strong> enabled followers only mode for "+lenght+"s.";
          } else {
            message = "<strong>"+channel+"</strong> enabled followers only mode";
          }
        } else {
          message = "<strong>"+channel+"</strong> disabled followers only mode";
        }
        this.chateventHandler(message);
    });

    client.on("hosting", (channel, target, viewers) => {
        // Do your stuff.
        this.chateventHandler("<strong>"+channel+"</strong> is hosting <strong>@"+target+"</strong> with <strong>"+viewers+"</strong> viewers");
    });

    client.on("messagedeleted", (channel, username, deletedMessage, userstate) => {
        // Do your stuff.
        this.msglist.slice(-60).map((msg)=>{
          if (msg['id'] == userstate["target-msg-id"]){
            msg['type'] = 'deleted';
          }
        });
        this.chateventHandler("<strong>"+channel+"</strong> deleted <strong>@"+username+"</strong> message: "+deletedMessage);
    });

    // Someone got modded
    client.on("mod", (channel, username) => {
        // Do your stuff.
        this.chateventHandler("<strong>"+channel+"</strong> modded <strong>@"+username+"</strong>!");
    });

    client.on("notice", (channel, msgid, message) => {
        // Do your stuff.
        console.log("we got a notice!");
        this.chateventHandler(message);    
    });

    client.on("slowmode", (channel, enabled, length) => {
        // Do your stuff.
        let message = "";
        if(enabled){
          if(lenght){
            message = "<strong>"+channel+"</strong> enabled slow mode for "+lenght+"s.";
          } else {
            message = "<strong>"+channel+"</strong> enabled slow mode";
          }
        } else {
          message = "<strong>"+channel+"</strong> disabled slow mode";
        }
        this.chateventHandler(message);
    });    
    
    // Subscribers only mode:
    client.on("subscribers", (channel, enabled) => {
        // Do your stuff.
        let message = "";
        if(enabled){  
          message = "<strong>"+channel+"</strong> enabled subscribers only mode";
        } else {
          message = "<strong>"+channel+"</strong> disabled subscribers only mode";
        }
        this.chateventHandler(message);
    });

    client.on("timeout", (channel, username, reason, duration, userstate) => {
        // Do your stuff.
        // console.log(userstate);
        let message = "";
        if(reason){
          message = "<strong>@"+username+"</strong> has been timed out for "+duration+"s because: "+reason;
        } else {
          message = "<strong>@"+username+"</strong> has been timed out for "+duration+"s";
        }
        
        this.chateventHandler(message);
    });

    client.on("unhost", (channel, viewers) => {
        // Do your stuff.
        this.chateventHandler(""+channel+" stopped hosting the stream with "+viewers+" viewers");
    });


    client.on("unmod", (channel, username) => {
        // Do your stuff.
        this.chateventHandler(""+channel+" unmodded @"+username+"  :(");
    });

    // Vip list
    client.on("vips", (channel, vips) => {
        // Do your stuff.
        console.log(channel);
        console.log(vips);
    });

    client.on("whisper", (from, userstate, message, self) => {
        // Don't listen to my own messages..
        if (self) return;

        // Do your stuff.
    });
    
    
    // Stream events you would get in streamlabels event list.
    client.on("anongiftpaidupgrade", (channel, username, userstate) => {
        // Do your stuff.
        this.eventHandler("@"+username+" got upgraded to "+userstate["msg-param-cumulative-months"]+".", "gift");
    });
    
    client.on("cheer", (channel, userstate, message) => {
        // Do your stuff.
        this.eventHandler(""+channel+" got cheered by @"+userstate['display-name']+" with "+userstate['bits']+" and the message: "+message, "cheer");
    });
    
    client.on("follow", (channel, userstate) => {
        // Do your stuff.
        this.eventHandler(""+channel+" got a new follower");
    });
    
    client.on("hosted", (channel, username, viewers, autohost) => {
        // Do your stuff.
        this.eventHandler(""+channel+" has been hosted by @"+username+" with "+viewers+" viewers. The raid is autohost? "+autohost, "host");
    });
    
    client.on("raided", (channel, username, viewers) => {
        // Do your stuff.
        this.eventHandler(""+channel+" has been raided by @"+username+" with "+viewers+" viewers.", "raid");
    });
    
    client.on("resub", (channel, username, streakMonths, msg, tags, methods) => {
        // Do your stuff.
        
        let plan = "";
        if(methods['plan'] != null){
          switch (methods['plan']) {
            case 'Prime':{
              plan = "Prime";
              break;
            }
            case '1000':{
              plan = "Tier 1";
              break;
            }
            case '2000':{
              plan = "Tier 2";
              break;
            }
            case '3000':{
              plan = "Tier 3";
              break;
            }         
          }
        }
        this.eventHandler("@"+username+" resubscribed at "+plan+". They've subscribed for "+tags["msg-param-cumulative-months"]+" months!", "resub");        
    });


    
    client.on("submysterygift", (channel, username, numbOfSubs, methods, userstate) => {
        // Do your stuff.
        /*console.log("Mistery gifted: =============================")
        console.log(methods);
        console.log(userstate);*/
        this.eventHandler("@"+username+" gifted "+numbOfSubs+" subs.", "gift");
    });
    
    client.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
        // Do your stuff.
        /*console.log("Sub gifted: =============================")
        console.log(methods);
        console.log(userstate);*/      
        this.eventHandler("@"+username+" gifted @"+recipient+" a sub.", "gift");
    });
    
    client.on("subscription", (channel, username, method, message, userstate) => {
        // Do your stuff.
        /*console.log("Subscribed: =============================")
        console.log(method);
        console.log(userstate);
        console.log(message);*/
        var plan = '';
        if(method['plan'] != null){
          switch (method['plan']) {
            case 'Prime':{
              plan = "Prime";
              break;
            }
            case '1000':{
              plan = "Tier 1";
              break;
            }
            case '2000':{
              plan = "Tier 2";
              break;
            }
            case '3000':{
              plan = "Tier 3";
              break;
            }         
          }
        }
        this.eventHandler("@"+username+" subscribed to "+channel+" with "+plan+".", "sub");
    });
  }
  
  @action chateventHandler(notice){
    this.lastmessage = {
      id: 'system',
      timestamp: moment().format(),
      body: null,
      parsedbody: this.parseMessage(notice, []).toString(),    
      user: "[Info]",
      displayname: "[Info]",      
      color: "inherit",
      csscolor: htmlSafe('color: inherit'),        
      badges: null,
      htmlbadges:  '',
      type: "system",
      usertype: null,
      reward: false,
      emotes: null
    };
    this.msglist.push(this.lastmessage);
  }

  @tracked lastEvent = null;
  @action eventHandler(event, type){
    
    this.lastevent = {
      id: 'event',
      timestamp: moment().format(),
      parsedbody: this.parseMessage(event, []).toString(),    
      user: "event",
      displayname: "event",      
      color: "#cccccc",
      csscolor: htmlSafe('color: #cccccc'),        
      badges: null,
      htmlbadges:  '',
      type: type ? "event-"+type.toString() : "event",
      usertype: null,
      reward: false,
      emotes: null,
    };
    this.eventlist.push(this.lastevent);
  }
}
