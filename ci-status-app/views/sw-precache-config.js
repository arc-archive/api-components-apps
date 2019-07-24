module.exports = {
  staticFileGlobs: ['src/**/*', 'manifest.json', '!auth/**/*'],
  runtimeCaching: [
    {
      urlPattern: /\/@webcomponents\/webcomponentsjs\//,
      handler: 'fastest'
    }
  ],
  navigateFallbackWhitelist: [/\/[^\/\.|login|logout|callback]*(\?|$)/]
};
