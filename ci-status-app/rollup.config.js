import { createDefaultConfig } from '@open-wc/building-rollup';
import { generateSW } from 'rollup-plugin-workbox';
import cpy from 'rollup-plugin-cpy';
import path from 'path';

const config = createDefaultConfig({ input: './index.html' });
export default {
  ...config,
  output: {
    ...config.output,
    // sourcemap: false,
  },
  plugins: [
    ...config.plugins,
    cpy({
      files: [
        './images/**/*.*',
        './manifest.json',
        './index.css',
        './robots.txt',
        './humans.txt',
        './node_modules/@polymer/app-storage/app-indexeddb-mirror/*.js',
      ],
      dest: 'dist',
      options: {
        parents: true,
      },
    }),
    generateSW({
      swDest: path.join(__dirname, 'dist', 'sw.js'),
      globDirectory: path.join(__dirname, 'dist'),
      offlineGoogleAnalytics: true,
      runtimeCaching: [{
        urlPattern: new RegExp('^https://api.advancedrestclient.com/'),
        handler: 'NetworkFirst',
        options: {
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }],
    }),
  ],
};
