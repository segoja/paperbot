'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function(defaults) {
  let app = new EmberApp(defaults, {
    // Add fonts to Service Worker asset cache
    'asset-cache': {
      include: [
       'fonts/**.*'
      ],
    },
    'ember-service-worker': {
      versionStrategy: 'every-build'
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

  return app.toTree();
};
