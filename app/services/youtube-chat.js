import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';
import { io } from 'socket.io-client';

export default class YoutubeChatService extends Service {
  @service ajax;
  @tracked messages = [];

  // Replace YOUR_API_KEY with your actual API key
  apiKey = 'YOUR_API_KEY';

  @task(function* (liveChatId) {
    // Connect to the push notification server
    const endpoint = `https://pubsubhubbub.appspot.com/subscribe`;
    const callbackUrl = `https://${window.location.host}/youtube-chat/${liveChatId}/callback`;
    const topicUrl = `https://www.youtube.com/live_chat?v=${liveChatId}`;

    const response = yield this.ajax.post(endpoint, {
      data: {
        'hub.callback': callbackUrl,
        'hub.mode': 'subscribe',
        'hub.topic': topicUrl,
        'hub.verify': 'async',
        'hub.verify_token': 'youtube-chat'
      }
    });

    // Connect to the WebSocket-based notification channel
    const socket = io(response.hub.url, {
      transports: ['websocket'],
      query: {
        'hub.mode': 'subscribe',
        'hub.topic': topicUrl,
        'hub.verify': 'async',
        'hub.verify_token': 'youtube-chat',
        'oauth_consumer_key': '',
        'oauth_nonce': '',
        'oauth_signature': '',
        'oauth_signature_method': '',
        'oauth_timestamp': '',
        'oauth_token': '',
        'oauth_version': ''
      }
    });

    socket.on('connect', () => {
      console.log('Connected to push notification server');
    });

    socket.on('error', (error) => {
      console.error('Push notification server error', error);
    });

    socket.on('chatMessage', (message) => {
      console.log('Received chat message', message);
      this.messages.pushObject(message);
    });

    // Keep the task running indefinitely
    yield new Promise(() => {});
  }) subscribeToChatTask;

  connectToChat(liveChatId) {
    // Start subscribing to the chat messages
    this.subscribeToChatTask.perform(liveChatId);
  }
}