export default defineNuxtConfig({
  modules: ['../src/module'],
  myModule: {},
  devtools: { enabled: true },
  matomo: {
    siteId: 5,
    matomoUrl: '//matomo.spell.fm/',
    debug: true,
    verbose: true,
  }
})
