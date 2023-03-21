import Service from '@ember/service';
import { fetch } from '@tauri-apps/api/http';


export default class PubSubHubbubService extends Service {
  
  async subscribe({ hub, topic, callback, mode = 'subscribe', verify = 'sync' }) {
    const params = {
      hub,
      topic,
      callback,
      mode,
      verify
    };

    const response = await fetch(hub, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(params)
    });

    if (response.status !== 204) {
      throw new Error(`PubSubHubbub subscription request failed with status ${response.status}`);
    }
  }

  async unsubscribe({ hub, topic, callback, mode = 'unsubscribe', verify = 'sync' }) {
    const params = {
      hub,
      topic,
      callback,
      mode,
      verify
    };

    const response = await fetch(hub, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(params)
    });

    if (response.status !== 204) {
      throw new Error(`PubSubHubbub unsubscription request failed with status ${response.status}`);
    }
  }
}