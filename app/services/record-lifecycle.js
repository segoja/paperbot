import Service, { inject as service } from '@ember/service';

export default class RecordLifecycleService extends Service {
  @service store;

  async deleteSong(song) {
    const requests = [...(await song.requests)];
    for (const request of requests) {
      request.song = null;
      await request.save();
    }
    await song.destroyRecord();
  }

  async deleteClient(client) {
    const streams = new Map();
    for (const stream of await client.botclientstreams) {
      streams.set(stream.id, stream);
    }
    for (const stream of await client.chatclientstreams) {
      streams.set(stream.id, stream);
    }

    for (const stream of streams.values()) {
      if ((await stream.botclient)?.id === client.id) stream.botclient = null;
      if ((await stream.chatclient)?.id === client.id) stream.chatclient = null;
      await stream.save();
    }

    const config = this.store.peekRecord('config', 'ppbconfig');
    if (config) {
      if (config.defBotId === client.id) config.defbotclient = null;
      if (config.defChatId === client.id) config.defchatclient = null;
      if (config.hasDirtyAttributes) await config.save();
    }

    await client.destroyRecord();
  }

  async deleteOverlay(overlay) {
    const config = this.store.peekRecord('config', 'ppbconfig');
    if (config?.defOverlayId === overlay.id) {
      config.defOverlay = null;
      await config.save();
    }
    await overlay.destroyRecord();
  }
}
