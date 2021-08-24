'use strict';

module.exports = function (environment) {
  let ENV = {
    modulePrefix: 'paperbot',
    environment,
    rootURL: process.env.EMBER_CLI_ELECTRON ? '' : '/',
    locationType: process.env.EMBER_CLI_ELECTRON ? 'hash' : 'auto',
    emberPouch: {
      saveHasMany: true,
    },
    EmberENV: {
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. EMBER_NATIVE_DECORATOR_SUPPORT: true
      },
      EXTEND_PROTOTYPES: {
        // Prevent Ember Data from overriding Date.parse.
        Date: false,
      },
    },
    fontawesome: {
      warnIfNoIconsIncluded: false,
      defaultPrefix: 'fas', // fas for Solid, fab for brands, fal for light(pro)
      // ...
    },
    // This fix the huge deprecated warning.
    emberKeyboard: {
      disableInputsInitializer: true,
      listeners: ['keyUp', 'keyDown', 'keyPress', 'click'], // use only `keyUp`, `keyDown`, and `click`,      
    },
    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    }
  };

  if (environment === 'development') {
     /*ENV.APP.LOG_RESOLVER = true;
     ENV.APP.LOG_ACTIVE_GENERATION = true;
     ENV.APP.LOG_TRANSITIONS = true;
     ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
     ENV.APP.LOG_VIEW_LOOKUPS = true;*/
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
    ENV.APP.autoboot = false;
  }

  // ENV.remote_couch = ''; // 'http://192.168.1.222:5984/paperbot';
  ENV.local_couch = 'paperbot';
  ENV.authAdapter = 'application';
  if (environment === 'production') {
    // ENV.rootURL = '/';
    // ENV.remote_couch = 'https://my.couchcluster.com/bloggr';
  }
  
  if ( ENV.remote_couch ) {
    // @TODO document why `contentSecurityPolicy` is needed, as it does not appear used anywhere else
    var remote_couch_hostname = ENV.remote_couch.substring(0, ENV.remote_couch.indexOf('/', 9))
    ENV.contentSecurityPolicy = {
      'connect-src': "'self' " + remote_couch_hostname
    };
  }
  
  return ENV;
};
