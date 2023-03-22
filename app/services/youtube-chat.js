import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { fetch } from '@tauri-apps/api/http';

export default class youtubeChatService extends Service {

  @service pubsubhubbub;

  async subscribe(livestreamId) {
    const callbackUrl = 'https://webhook.site/62450136-cd18-4b91-8aa4-ccabf7a69ce4';
    const topicUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=UCqqliyjLbIsBVHj3giKUeKw`;

    const hubUrl = await this.getHubUrl(topicUrl);
    if (!hubUrl) {
      throw new Error(`Unable to find PubSubHubbub hub for topic ${topicUrl}`);
    }

    const subscribeParams = {
      hub: hubUrl,
      topic: topicUrl,
      callback: callbackUrl,
      mode: 'subscribe',
      verify: 'async'
    };

    await this.pubsubhubbub.subscribe(subscribeParams);
  }

  async getHubUrl(topicUrl) {
    const response = await fetch(`https://pubsubhubbub.appspot.com/${encodeURIComponent(topicUrl)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log(response);
    const hubLinkHeader = response.url;
    if (!hubLinkHeader) {
      return null;
    }
    const hubUrlMatches = /<(.+)>;\s*rel="hub"/.exec(hubLinkHeader);
    if (!hubUrlMatches || hubUrlMatches.length < 2) {
      return null;
    }
    return hubUrlMatches[1];
  }
/*
  @tracked messages = [];
  @tracked pageToken = '';
  @tracked keepAlive = false;

  @action connectToChat(videoId, apiKey) {
    console.log(apiKey);
    fetch(`https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoId}&part=liveStreamingDetails`).then(async (response)=>{  
      
      const data = await response.json();
      // console.debug(response);
      // console.debug(data);
      if(data.items){
        const liveChatId = await data.items[0].liveStreamingDetails.activeLiveChatId;
        this.keepAlive = true;
        this.fetchMessages(liveChatId, apiKey, '');
      }
    }).catch((error)=>{
      console.log(error);
      this.keepAlive = false;
    });
  }

  @action fetchMessages(liveChatId, apiKey, pageToken) {   
    // The &part=element1,element2,element3... of the url defines what data do we want to retrieve from the API. 
    let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&key=${apiKey}&maxResults=2000&part=snippet,authorDetails`;
    if(pageToken){
      url += '&pageToken='+pageToken;
    }
    // console.log(url);
    fetch(url).then(async(response)=>{
      // console.log(response);
      const data = await response.json();
      if(data.nextPageToken){
        pageToken = data.pageToken;
      }
      if(data.items){
        data.items.forEach(item => {
          let exist = false;
          this.messages.forEach((message) => {
            if(message.id == item.id){
              exist = true;
            }
          }); 
          if(!exist){
            console.log('New message');
            this.messages.push({
              id: item.id,
              authorId: item.snippet.authorChannelId,
              author: item.authorDetails.displayName,
              message: item.snippet.displayMessage,
              date: item.snippet.publishedAt
            });
          }
        });
        if(this.messages.length > 5){
          this.messages = this.messages.slice(this.messages.length - 5);
        }
        setTimeout(() => {
          if(this.keepAlive){
            this.fetchMessages(liveChatId, apiKey, pageToken);
          }
        }, 5000); 
        // }, data.pollingIntervalMillis); 
      }   
    }).catch((error)=>{
      console.log(error);      
    });
  }
  
  @action disconnectFromChat() {
    this.keepAlive = false;
  }
*/
}