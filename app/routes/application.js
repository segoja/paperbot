import Route from '@ember/routing/route';

export default class ApplicationRoute extends Route  {
  redirect() {
    this.transitionTo('streams');
  }
}
