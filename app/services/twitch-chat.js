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
 
  @tracked client;
  @tracked messages = [];
  @tracked queue = []; 
  @tracked channel = '';
  @tracked username = '';
  @tracked password = '';
  @tracked botStatus = 'disconnected';
  @tracked commands  = this.store.findAll('command');
  get commandlist(){
    return this.commands;
  }
  @tracked clientlist = this.store.findAll('client');
  
  @tracked audiocommandlist = []
  
  @tracked lastmessage = null;
  @tracked lastsongrequest = null;
  
  init() {
    super.init(...arguments);
    
    this.optsbot = this.activeClient.activeBot;
    this.optschat = this.activeClient.activeChat;

    this.opts = {
        options: { 
          debug: true, 
        },
        connection: {
          reconnect: true,
          secure: true
        },
        identity: {
          username: this.username,
          password: this.password
        },
        channels: [this.channel]
       };
    
    this.client = new tmi.client(this.opts);
    // Register our event handlers (defined below)
    this.client.on('connected', this.onConnectedHandler);
    this.client.on('message', this.messageHandler);
    this.client.on('hosting', this.onHostHandler);
    this.client.connect();
  }
  
  async connector(options){
    if(this.botStatus === 'connected'){
      this.client.disconnect();
    }
    this.channel = options.channels.toString();
    this.client = new tmi.client(options);
    // Register our event handlers (defined below)
    this.client.on('connected', this.onConnectedHandler);
    this.client.on('message', this.messageHandler);
    this.client.on('hosting', this.onHostHandler);
 
    this.botStatus = 'connected';
    // Connect the client
    this.client.connect();
  }
  
  @action onHostHandler (channel, target, viewers) {
    console.log(channel+" hosted "+target+" with our "+viewers+" viewers.");
  }

  @action messageHandler(target, tags, msg, self){
    this.lastmessage = {
      timestamp: new Date(),
      body: msg ? msg.toString() : null,
      user: tags['username'] ? tags['username'].toString() : this.activeClient.activeBot.identity.username,
      color: tags['color'] ? tags['color'].toString() : null,
      csscolor: tags['color'] ? htmlSafe('color: ' + tags['color']) : null,        
      badges: tags['badges'] ? tags['badges'] : null,
      type: tags['message-type'] ? tags['message-type'] : null,
      usertype: tags['user-type'] ? tags['user-type'].toString() : null,        
    };
    this.messages.push(this.lastmessage);
    this.commandHandler(target, tags, msg, self);
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
        this.client.say(target, '@'+tags['username']+ ' requested the song "'+song+'"');
        this.lastsongrequest = {
          timestamp: new Date,
          song: song, 
          user: tags['username'].toString(),
          color: tags['color'].toString(),
          csscolor: htmlSafe('color: ' + tags['color']),        
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
                
                this.client.say(target, answer);
                
                console.log(`* Executed ${command.name} command`);
              break;
              case 'audio':
                this.audio.load(command.soundfile).asSound(command.name).then(() =>{
                  this.audio.getSound(command.name).play();
                });
              break;
              default:
                this.client.say(target, command.response);
                console.log(`* Executed ${command.name} command`);
              break;
            }
          /*}*/
        }
      });        
    }
  }
  
  // Called every time the bot connects to Twitch chat
  @action onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    //alert(this.botclient.username);
    this.client.say(this.channel, '/me ### Paperbot is here baby! ###');
  }
}
