import Route from '@ember/routing/route';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';

export default class SecretRoute extends Route.extend(AuthenticatedRouteMixin) {
  // do your secret model setup here
}
