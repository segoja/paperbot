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
      // Structure as on JSON Schema
      var outputmessage = '';
      var type = '';
      switch (data.listener) {
        case 'follower-latest': {
          console.log("Follow");
          //console.log(data.event);            
          outputmessage = data.event.name+" Followed the stream.";
          type = "follow";
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'subscriber-latest': {
          console.log("Subscription");
          console.log(data.event);
          
          if(data.event.bulkGifted){
            outputmessage = data.event.sender+" gifted "+data.event.amount+" subs to community.";
          } else {
            if (data.event.gifted && data.event.sender){
              outputmessage = data.event.sender+" gifted a sub to "+data.event.name+" who ";
            } else {
              outputmessage = data.event.name+" ";
            }
            if(data.event.count > 1){ 
              outputmessage = outputmessage.concat("resubscribed with ");
              type = "resub";
            } else {
              outputmessage = outputmessage.concat("subscribed with ");
              type = "sub";
            }
            var tier = ""
            if(data.event.tier === 1000){ tier = "Tier 1"; } 
            if(data.event.tier === 2000){ tier = "Tier 2"; }
            if(data.event.tier === 3000){ tier = "Tier 3"; }
            if(data.event.tier === "prime"){ tier = "Prime"; } 
            
            outputmessage =  outputmessage.concat(tier+" for "+data.event.count+" months!");
            if(data.event.message != ''){
              outputmessage = outputmessage.concat(" Message: "+data.event.message);
            }          
          }          
          if (data.event.gifted || data.event.amount === "gifted"){
            type = "gift";
          }          
          if(data.event.bulkGifted) {
            type = "bulk";
          }
          

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
          type = "donation";
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
          type = "cheer";
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'raid-latest': {
          console.log("Raid");
          outputmessage = data.event.name+" raided with "+data.event.amount+" raiders!";
          type = "raid";
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'host-latest': {
          console.log("Host");
          outputmessage = data.event.name+" hosted with "+data.event.amount+" viewers!";
          type = "host";
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
          type = "redemption";
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'merch-latest': {
          console.log("Merch");
          outputmessage = data.event.name+" purchased merch!";
          type = "merch";
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
          outputmessage = data.event.name+" has followed.";
          type = "follow";
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'subscriber-latest': {
          console.log("Subscription");
          console.log(data.event);
          if (data.event.gifted && data.event.sender){
            outputmessage = data.event.sender+" gifted a sub to "+data.event.name+" who ";
          } else {
            outputmessage = data.event.name+" ";
          }
          
          if(data.event.amount > 1){ 
            outputmessage = outputmessage.concat("resubscribed x"+data.event.amount+" with ");
            type = "resub";
          } else {
            outputmessage = outputmessage.concat("subscribed with ");
            type = "sub";
          }          
          if (data.event.gifted || data.event.amount === "gifted"){
            type = "gift";
          }
          
          var tier = ""
          if(data.event.tier === 1000){ tier = "Tier 1"; } 
          if(data.event.tier === 2000){ tier = "Tier 2"; }
          if(data.event.tier === 3000){ tier = "Tier 3"; }
          if(data.event.tier === "prime"){ tier = "Prime"; } 
          
          outputmessage =  outputmessage.concat(tier+" for "+data.event.count+" months!");
          if(data.event.message != ''){
            outputmessage = outputmessage.concat(" Message: "+data.event.message);
          }
          
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
          type = "donation";
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
          type = "cheer";
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'raid-latest': {
          console.log("Raid");
          outputmessage = data.event.name+" raided with "+data.event.amount+" raiders!";
          type = "raid";
          console.log(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'host-latest': {
          console.log("Host");
          outputmessage = data.event.name+" hosted with "+data.event.amount+" viewers!";
          type = "host";
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
          type = "redemption";
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'merch-latest': {
          console.log("Merch");
          outputmessage = data.event.name+" purchased merch!";
          type = "merch";
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
    
    client.on('connect', function () {
      console.log('Successfully connected to the websocket');
    });
    
    client.on('disconnect', function () {
      console.log('Disconnected from websocket');
    });
    
    client.on('event', (data) => {
      // console.log(event);
      try {
        if (Array.isArray(data.message)) {
          data.message.forEach((event) => {
            var outputmessage = '';
            var type = '';
            switch (data.type) {
              case 'follow': {
                outputmessage = event.name + " has followed.";
                type = "follow";
                this.eventHandler(outputmessage, type);          
                break;
              }
              case 'subscription': {
                let tier = ""
                if(event.sub_plan === "1000"){ tier = "Tier 1"; } 
                if(event.sub_plan === "2000"){ tier = "Tier 2"; }
                if(event.sub_plan === "3000"){ tier = "Tier 3"; }
                if(event.sub_plan === "prime"){ tier = "Prime"; }
                outputmessage = event.name + " has subscribed ("+tier+").";
                type = "sub";
                this.eventHandler(outputmessage, type);
                break;
              }        
              case 'resub': {
                let tier = ""
                if(event.sub_plan === "1000"){ tier = "Tier 1"; } 
                if(event.sub_plan === "2000"){ tier = "Tier 2"; }
                if(event.sub_plan === "3000"){ tier = "Tier 3"; }
                if(event.sub_plan === "prime"){ tier = "Prime"; }
                if(event.streak_months){
                  outputmessage = event.name + " resubscribed ("+tier+") for "+event.streak_months+" months in a row! ("+event.months+" total).";
                } else {
                  outputmessage = event.name + " resubscribed ("+tier+") for "+event.months+" months!";
                }
                type = "resub";
                this.eventHandler(outputmessage, type);
                break;
              }            
              case 'donation': {
                outputmessage = event.from+" donated "+event.formatted_amount+"!"
                if(event.message){
                  outputmessage = outputmessage.concat(" Message: "+event.message);
                }
                type = "donation";                
                this.eventHandler(outputmessage, type);
                break;
              }
              case 'merch': {
                outputmessage = event.from+" bought 1 "+event.product+"!"
                if(event.message){
                  outputmessage = outputmessage.concat(" Message: "+event.message);
                }
                type = "merch";       
                this.eventHandler(outputmessage, type);
                break;
              }

              case 'host': {
                if(event.viewers > 1){
                  outputmessage = event.name+" has hosted you with "+event.viewers+" viewers!"
                } else{
                  outputmessage = event.name+" has hosted you with "+event.viewers+" viewer!"
                }
                type = "host";  
                this.eventHandler(outputmessage, type);
                break;
              }

              case 'raid': {
                if(event.raiders > 1){
                  outputmessage = event.name+" has raided you with "+event.raiders+" raiders!"
                } else{
                  outputmessage = event.name+" has raided you with "+event.raiders+" raider!"
                }
                type = "raid";  
                this.eventHandler(outputmessage, type);
                break;
              }

              case 'bits': {
                outputmessage = event.name+" has used "+event.amount+" bits!"
                if(event.message){
                  outputmessage = outputmessage.concat(" Message: "+event.message);
                }
                type = "cheer";                
                this.eventHandler(outputmessage, type);
                break;
              }

              default: {
                console.log(data);
                break;
              }
            }

          });
        }
      } catch (error) {
        console.log(error);
      }
    });
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


