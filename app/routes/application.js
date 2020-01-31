import Route from '@ember/routing/route';
import ApplicationRouteMixin from 'ember-simple-auth/mixins/application-route-mixin';

export default class ApplicationRoute extends Route.extend(ApplicationRouteMixin) {
  sessionInvalidated() {
    //data may still be viewed, so no window.reload needed
    //remove sessionInvalidated and go back to default ApplicationRouteMixin behaviour if you want to clear JS cache after logout
    this.transitionTo('index');
  }
}
