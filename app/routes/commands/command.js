import Route from '@ember/routing/route';

export default class CommandRoute extends Route {
  model (params) {
    return this.store.findRecord('command', params.command_id);
  }
}
