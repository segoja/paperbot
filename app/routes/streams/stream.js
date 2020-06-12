import Route from '@ember/routing/route';

export default class StreamRoute extends Route {
  model (params) {
    return this.store.findRecord('stream', params.stream_id);
  }
}