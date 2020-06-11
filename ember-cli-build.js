'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function(defaults) {
  let config = process.env.EMBER_ENV || 'development';
  let app = new EmberApp(defaults, {
    // IE 11 needs a Polyfill for startsWith
    'ember-cli-babel': {
      includePolyfill: true
    },

    // Add fonts to Service Worker cache first
    'esw-cache-first': {
      patterns: [
        'fonts/fontawesome(.+)',
      ]
    },

    'ember-service-worker': {
      versionStrategy: 'every-build',
      enabled: config != 'development'
    },

    // Exclude .png favicons from being fingerprinted
    fingerprint: {
      exclude: [
                 'android-chrome-192x192.png',
                 'android-chrome-512x512.png',
                 'apple-touch-icon.png',
                 'favicon-16x16.png',
                 'favicon-32x32.png',
                 'mstile-150x150.png'
               ]
    },

    'ember-power-select': {
       theme: 'bootstrap'
    },

    'ember-bootstrap': {
      'bootstrapVersion': 4,
      'importBootstrapCSS': true
    }
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.
  app.import('node_modules/moment/moment.js', {
    using: [
      { transformation: 'amd', as: 'moment' }
    ]
  });

  app.import('node_modules/marked/marked.min.js', {
    using: [
      { transformation: 'amd', as: 'marked' }
    ]
  });

  // app.import('node_modules/bootstrap/dist/css/bootstrap.min.css');

  return app.toTree();
};
