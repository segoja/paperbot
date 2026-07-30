'use strict';

const path = require('path');
const { generateSW } = require('workbox-build');

const distDirectory = path.join(__dirname, '..', 'dist');

generateSW({
  globDirectory: distDirectory,
  globPatterns: [
    '**/*.{html,js,css,json,svg,png,ico,webp,jpg,jpeg,gif,avif,woff,woff2,ttf,eot,otf}',
  ],
  globIgnores: [
    '**/*.map',
    '**/*.LICENSE.txt',
    '**/tests/**',
    'testem.js',
    'ember-cli-live-reload.js',
    'robots*.txt',
    'browserconfig.xml',
    'crossdomain.xml',
  ],
  swDest: path.join(distDirectory, 'sw.js'),
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/tests(?:\/|$)/],
  cleanupOutdatedCaches: true,
  skipWaiting: true,
  clientsClaim: true,
  sourcemap: false,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
}).then(({ count, size, warnings }) => {
  if (warnings.length > 0) {
    warnings.forEach((warning) => console.warn(warning));
  }

  console.log(
    `Generated dist/sw.js with ${count} precached files (${size} bytes).`,
  );
});
