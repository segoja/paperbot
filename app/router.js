import EmberRouter from '@ember/routing/router';
import config from './config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('commands', function () {
    this.route('command', { path: ':command_id' });
  });
  this.route('clients', function () {
    this.route('client', { path: ':client_id' });
  });
  this.route('timers', function () {
    this.route('timer', { path: ':timer_id' });
  });
  this.route('songs', function () {
    this.route('song', { path: ':song_id' });
  });
  this.route('streams', function () {
    this.route('stream', { path: ':stream_id' });
  });
  this.route('reader');
  this.route('overlay');
});
