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
      this.botclient.on('connected', this.onBotConnectedHandler);
      this.botclient.on('message', this.messageHandler);
      this.botclient.on('hosting', this.onHostHandler);
   
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
      this.chatclient.on('connected', this.onChatConnectedHandler);
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
      user: tags['username'] ? tags['username'].toString() : this.botUsername,
      color: tags['color'] ? tags['color'].toString() : null,
      csscolor: tags['color'] ? htmlSafe('color: ' + tags['color']) : null,        
      badges: tags['badges'] ? tags['badges'] : null,
      type: tags['message-type'] ? tags['message-type'] : null,
      usertype: tags['user-type'] ? tags['user-type'].toString() : null,        
    };
    this.msglist.push(this.lastmessage);
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
        this.botclient.say(target, '@'+tags['username']+ ' requested the song "'+song+'"');
        this.lastsongrequest = {
          id: tags['id'] ? tags['id'].toString() : 'songsys',
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
}
