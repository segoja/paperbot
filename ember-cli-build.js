'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  let config = process.env.EMBER_ENV || 'development';
  let app = new EmberApp(defaults, {
    // Add options here
    outputPaths: {
      app: {
        css: {
          'app': 'assets/paperbot.css', // FOR LIGHT THEME => app.scss
        }
      }
    },
    SRI: {
      // crossorigin: 'anonymous',
      // This fix the tauri build blocking, but I have to check a better solution messing with cors.
      enabled: true
    },
    
    // Exclude .png favicons from being fingerprinted
    //origin: 'https://tauri.localhost/',
    fingerprint: {
      //prepend: 'https://tauri.localhost/',
      exclude: [
                 'android-chrome-192x192.png',
                 'android-chrome-512x512.png',
                 'apple-touch-icon.png',
                 'favicon-16x16.png',
                 'favicon-32x32.png',
                 'mstile-150x150.png'
               ]
    },
    'ember-bootstrap': {
      'bootstrapVersion': 5,
      'importBootstrapCSS': false,
      'insertEmberWormholeElementToDom': true
    },
    'ember-power-select': {
       theme: 'bootstrap'
    },
    'svgJar': {
      strategy: 'inline',
      optimizer: {
        plugins: [
          { removeTitle: false },
          { removeDesc: { removeAny: false } },
          { removeViewBox: true }
        ]
      },
    },
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
  /*
  const { Webpack } = require('@embroider/webpack');
  return require('@embroider/compat').compatBuild(app, Webpack, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
  });*/
  return app.toTree();
};
