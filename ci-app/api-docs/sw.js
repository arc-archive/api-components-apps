/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js');

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    'url': 'apic-import-e75c50fc.js',
    'revision': '12e19a0136b8440e243d8694471e3a2a'
  },
  {
    'url': 'index.html',
    'revision': 'dd6b9bfef38f9d9276d16131b4e96646'
  },
  {
    'url': 'legacy/apic-import-5897af62.js',
    'revision': 'e800e1ec506a0ab8c53e970bd692c77d'
  },
  {
    'url': 'polyfills/core-js.577a5602a7262d6256830802d4aaab43.js',
    'revision': 'ccf205728fe514f8276191669b5ea48d'
  },
  {
    'url': 'polyfills/custom-elements-es5-adapter.84b300ee818dce8b351c7cc7c100bcf7.js',
    'revision': 'cff507bc95ad1d6bf1a415cc9c8852b0'
  },
  {
    'url': 'polyfills/dynamic-import.b745cfc9384367cc18b42bbef2bbdcd9.js',
    'revision': 'ed55766050be285197b8f511eacedb62'
  },
  {
    'url': 'polyfills/fetch.191258a74d74243758f52065f3d0962a.js',
    'revision': 'fcdc4efda1fe1b52f814e36273ff745d'
  },
  {
    'url': 'polyfills/regenerator-runtime.92d44da139046113cb3739b173605787.js',
    'revision': '3aa324bcf8f59cd0eebf46796948aafa'
  },
  {
    'url': 'polyfills/systemjs.6dfbfd8f2c3e558918ed74d133a6757a.js',
    'revision': '683aabfb9b006607885b83e45e9a1768'
  },
  {
    'url': 'polyfills/webcomponents.d406f4685fdfb412c61f23b3ae18f2dc.js',
    'revision': 'b1db7cb76380495a55ff4f65a9648f0e'
  }
].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});

workbox.routing.registerNavigationRoute(workbox.precaching.getCacheKeyForURL('/index.html'));
