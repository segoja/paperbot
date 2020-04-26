import Route from '@ember/routing/route';

export default class CommandsRoute extends Route {
  model () {
    return this.store.findAll('command');
  }

  redirect (model, transition) {
    if (transition.targetName === 'commands.index') {
      if (model.get('length') !== 0) {
        // this.transitionTo('commands.command', model.model.sortBy('date').reverse().get('firstObject'));
      }
    }
  }
}
