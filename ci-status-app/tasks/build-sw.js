const workboxBuild = require('workbox-build');
const path = require('path');

const buildSW = () => {
  // This will return a Promise
  return workboxBuild.generateSW({
    globDirectory: path.join(__dirname, '..', 'dist'),
    globIgnores: [
      'node_modules/@polymer/app-storage/app-indexeddb-mirror/app-indexeddb-mirror-client.js',
      'node_modules/@polymer/app-storage/app-indexeddb-mirror/app-indexeddb-mirror.js',
      'node_modules/@polymer/app-storage/app-indexeddb-mirror/common-worker.js',
    ],
    globPatterns: [
      '**/*.{html,json,js,css}',
      'images/**/*.{png,ico}',
      'manifest.json',
      'node_modules/@polymer/app-storage/app-indexeddb-mirror/app-indexeddb-mirror-worker.js'
    ],
    swDest: path.join(__dirname, '..', 'dist', 'sw.js'),
    navigateFallback: '/index.html',
    offlineGoogleAnalytics: true,
    runtimeCaching: [{
      urlPattern: new RegExp('^https://api.advancedrestclient.com/v1/'),
      handler: 'NetworkFirst',
      options: {
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    }],
  });
};
(async () => {
  const result = await buildSW();
  /* eslint-disable no-console */
  console.log('SW generation result:');
  console.log(`Cached ${result.count} files, with total size of ${result.size} bytes.`);
  if (result.warnings) {
    result.warnings.forEach((warning) => console.error(warning));
  }
})();
