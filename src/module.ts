import { defineNuxtModule, addPlugin, createResolver, addTemplate } from '@nuxt/kit'
import { defu } from 'defu'

// Module options TypeScript interface definition
export interface ModuleOptions {
  trackDelay?: number,
  debug?: boolean,
  verbose?: boolean,
  siteId?: number,
  matomoUrl?: string,
  trackerUrl?: string,
  scriptUrl?: string,
  cookies?: boolean,
  consentRequired?: boolean,
  consentExpires?: number,
  doNotTrack?: boolean,
  blockLoading?: boolean,
  addNoProxyWorkaround?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-matomo',
    configKey: 'matomo'
  },
  // Default configuration options of the Nuxt module
  defaults: () => ({
    trackDelay: 350,
    debug: false,
    verbose: false,
    siteId: undefined,
    matomoUrl: '',
    trackerUrl: '',
    scriptUrl: '',
    cookies: true,
    consentRequired: false,
    consentExpires: 0,
    doNotTrack: false,
    blockLoading: false,
    addNoProxyWorkaround: true,
  }),
  setup (options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // do not enable in dev mode, unless debug is enabled or node-env is set to production
    if (nuxt.options.dev && !options.debug && process.env.NODE_ENV !== 'production') {
      return
    }

    options.trackerUrl = options.trackerUrl || options.matomoUrl + 'piwik.php'
    options.scriptUrl = options.scriptUrl || options.matomoUrl + 'piwik.js'

    const head = nuxt.options.app.head
    head.script = head.script ?? []

    head.script.push({
      src: options.scriptUrl,
      defer: true,
      async: true
    })

    nuxt.options.runtimeConfig.public.matomo = defu(nuxt.options.runtimeConfig.public.matomo as any, {
      blockLoading: options.blockLoading,
      debug: options.debug,
      trackDelay: options.trackDelay,
      siteId: options.siteId,
      trackerUrl: options.trackerUrl,
      addNoProxyWorkaround: options.addNoProxyWorkaround,
      cookies: options.cookies,
      consentRequired: options.consentRequired,
      consentExpires: options.consentExpires,
      verbose: options.verbose,
      doNotTrack: options.doNotTrack,
    })

    addTemplate(resolver.resolve('./utils'))
    addTemplate(resolver.resolve('./apiMethods'))
    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin.client'))
  }
})
