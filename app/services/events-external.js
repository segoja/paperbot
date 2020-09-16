import Service from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import io from 'socket.io-client';
import moment from 'moment';
import { htmlSafe } from '@ember/template';


export default class EventsExternalService extends Service {

  @tracked type = null;  
  @tracked token = null;  
  @tracked client = null;
  
  // @tracked connected = false;
  
  get connected(){
    if(this.client != null){
      return !this.client.disconnected;
    } else {
      return false;
    }
  }
  
  @action createClient(){
    if(this.type && this.token && this.client === null && this.connected === false){
      if(this.type === "StreamLabs"){
        this.client = io('https://sockets.streamlabs.com?token=' + this.token, { transports: ['websocket']});        
        this.streamLabsEvents(this.client);
      } 
      
      if(this.type === "StreamElements"){        
        this.client = io('https://realtime.streamelements.com', { transports: ['websocket']});        
        this.streamElementEvents(this.client, this.token);        
      }      
    }
  }
  
  @action disconnectClient(){
    this.client.close();
    this.client = null;
  }  
  
  @action streamElementEvents(client, token){
    client.on('connect', function () {
      console.log('Successfully connected to the websocket');
      client.emit('authenticate', {
        method: 'jwt',
        token: token
      });
    });

    // Socket got disconnected
    client.on('disconnect', function () {
      console.log('Disconnected from websocket');
      //this.set('connected', false);
      // Reconnect
    });

    // Socket is authenticated
    client.on('authenticated',  function(data) {
      var { channelId } = data;
      //this.set('connected', true);
      console.log(this.connected);
      console.log(`Successfully connected to channel ${channelId}`);
    });
      
    
    client.on('event:test', (data) => {
      // console.log(data);
      // Structure as on JSON Schema
      var outputmessage = '';
      var type = '';
      switch (data.listener) {
        case 'follower-latest': {
          console.log("Follow");
          //console.log(data.event);            
          outputmessage = data.event.name+" Follow";
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'subscriber-latest': {
          console.log("Subscription");
          // console.log(data.event);
          outputmessage = data.event.name+" ";
          
          if(data.event.amount > 1){ 
            outputmessage = outputmessage.concat("resubscribed x"+data.event.amount+" with ");
          } else {
            outputmessage = outputmessage.concat("subscribed with ");
          }
          
          var tier = ""
          if(data.event.tier === 1000){ tier = "Tier 1"; } 
          if(data.event.tier === 1000){ tier = "Tier 2"; }
          if(data.event.tier === 1000){ tier = "Tier 3"; }
          if(data.event.tier === "prime"){ tier = "Prime"; } 
          
          outputmessage =  outputmessage.concat(tier+" for "+data.event.count+" months!");
          if(data.event.message != ''){
            outputmessage = outputmessage.concat(" Message: "+data.event.message);
          }
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'tip-latest': {
          console.log("Tip");
          outputmessage = data.event.name +" donated "+data.event.amount+"!";
          if(data.event.message){
            outputmessage =  outputmessage.concat(" Message: "+data.event.message);
          } 
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'cheer-latest': {
          console.log("Cheer");
          outputmessage = data.event.name +" cheered "+data.event.amount+" bits!";
          if(data.event.message){
            outputmessage =  outputmessage.concat(" Message: "+data.event.message);
          } 
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'raid-latest': {
          console.log("Raid");
          outputmessage = data.event.name+" raided with "+data.event.amount+" raiders!";
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'host-latest': {
          console.log("Host");
          outputmessage = data.event.name+" hosted with "+data.event.amount+" viewers!";
          type = data.event.type;
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'redemption-latest': {
          console.log("Redemption");
          outputmessage = data.event.name+" redeemed a "+data.event.item+"!";
          if(data.event.message){
            outputmessage =  outputmessage.concat(" Message: "+data.event.message);
          } 
          console.log(outputmessage);
          type = data.event.type;
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'merch-latest': {
          console.log("Merch");
          outputmessage = data.event.name+" purchased merch!";
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }

        default: {
          break;
        }
      }
    });
    
    
    client.on('event', (data) => {  
      // console.log(data);
      // Structure as on JSON Schema
      var outputmessage = ''
      var type = '';
      switch (data.listener) {
        case 'follower-latest': {
          console.log("Follow");
          //console.log(data.event);            
          outputmessage = data.event.name+" Follow";
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'subscriber-latest': {
          console.log("Subscription");
          // console.log(data.event);
          outputmessage = data.event.name+" ";
          
          if(data.event.amount > 1){ 
            outputmessage = outputmessage.concat("resubscribed x"+data.event.amount+" with ");
          } else {
            outputmessage = outputmessage.concat("subscribed with ");
          }
          
          var tier = ""
          if(data.event.tier === 1000){ tier = "Tier 1"; } 
          if(data.event.tier === 1000){ tier = "Tier 2"; }
          if(data.event.tier === 1000){ tier = "Tier 3"; }
          if(data.event.tier === "prime"){ tier = "Prime"; } 
          
          outputmessage =  outputmessage.concat(tier+" for "+data.event.count+" months!");
          if(data.event.message != ''){
            outputmessage = outputmessage.concat(" Message: "+data.event.message);
          }
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'tip-latest': {
          console.log("Tip");
          outputmessage = data.event.name +" donated "+data.event.amount+"!";
          if(data.event.message){
            outputmessage =  outputmessage.concat(" Message: "+data.event.message);
          }
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'cheer-latest': {
          console.log("Cheer");
          outputmessage = data.event.name +" cheered "+data.event.amount+" bits!";
          if(data.event.message){
            outputmessage =  outputmessage.concat(" Message: "+data.event.message);
          }
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'raid-latest': {
          console.log("Raid");
          outputmessage = data.event.name+" raided with "+data.event.amount+" raiders!";
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'host-latest': {
          console.log("Host");
          outputmessage = data.event.name+" hosted with "+data.event.amount+" viewers!";
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'redemption-latest': {
          console.log("Redemption");
          outputmessage = data.event.name+" redeemed a "+data.event.item+"!";
          if(data.event.message){
            outputmessage =  outputmessage.concat(" Message: "+data.event.message);
          }
          type = data.event.type;
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'merch-latest': {
          console.log("Merch");
          type = data.event.type;
          outputmessage = data.event.name+" purchased merch!";
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        default: {
          break;
        }
      }
    });
   
  }
  
  
  @action streamLabsEvents(client){
    client.on('connect', onConnect);
    
    client.on('disconnect', onDisconnect);
      
    client.on('event', (event) => {
      try {
        if (Array.isArray(event.message)) {
          event.message.forEach((message) => {
            handleEvent({
              type: event.type,
              for: event.for || '',
              message,
            });
          });
        }
      } catch (error) {
        this.emit('error', error);
      }
    });
    
    function handleEvent (event) {
      var outputmessage = '';
      var type = '';  
      switch (event.type) {
        case 'follow': {
          //console.log(data.event);  
          console.log("Follow");
          console.log(event); 
          break;
        }

        case 'subscription': {
          let isResub = !!event.sub_type && event.sub_type === 'resub';
          if (isResub) {
            console.log("Resubscription");          
            console.log(event);           
              /*...message,
              months: removeCommas(message.months) || 0,
              formattedMonths: message.months,*/
          } else {
            console.log("Subscription");
            console.log(event);           
          }
          break;
        }
        
        case 'donation': {
          console.log("Donation");
          console.log(event);
          /*
            ...message,
            amount: removeNonNumeric(message.amount),
            formattedAmount: (message.formattedAmount || message.formatted_amount || '').toString(),
            currency: message.currency || 'USD',
            */

          break;
        }
        case 'merch': {
          console.log("Merch");
          console.log(event);
          break;
        }

        case 'host': {
          console.log("Host");
          console.log(event);
          /*
            ...message,
            viewers: removeNonNumeric(message.viewers),
            formattedViewers: message.viewers.toString(),
            isTest,*/
          break;
        }

        case 'bits': {
          console.log("Bits");
          console.log(event);
          /*  ...message,
            amount: removeCommas(message.amount) || 0,
            formattedAmount: message.amount.toString(),
            isTest: !!message.isTest,
          */  
          break;
        }

        default: {
          console.log(event);
          break;
        }
      }
      this.eventHandler(outputmessage, type);
    }
    
    function onConnect() {
      console.log('Successfully connected to the websocket');
      //this.connected = true;
    }

    function onDisconnect() {
      console.log('Disconnected from websocket');
      //this.connected = false;
    }
  }
  
  @tracked eventlist = [];  
  get events(){
    return this.eventlist;
  }
  
  @tracked lastevent = null;
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
  
}


