import { defineNuxtPlugin } from '#app'
import { debug, isFn, waitUntil } from '../utils'
import apiMethods from '../apiMethods'

// Define your options type here
interface MatomoOptions {
  blockLoading?: boolean;
  debug?: boolean;
  trackerUrl: string;
  siteId?: number;
  onMetaChange: boolean;
  // Add other option types as necessary
}

declare module '#app' {
  interface NuxtApp {
    $matomo: any;
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const options = useRuntimeConfig().public.matomo as any

  let tracker: any;

  if (options.blockLoading) {
    waitUntil(() => window.hasOwnProperty('Piwik')).then(() => {
      tracker = createTracker(options);
      if (tracker) {
        setupTracker(nuxtApp, tracker, options);
      }
    })
  } else {
    if (window.hasOwnProperty('Piwik')) {
      tracker = createTracker(options)
      setupTracker(nuxtApp, tracker, options)
    } else {
      // if window.Piwik is not (yet) available, add a Proxy which delays calls
      // to the tracker and execute them once the Piwik tracker becomes available
      let _tracker: any // The real Piwik tracker
      let delayedCalls = []
      const proxyTrackerCall = (fnName, ...args) => {
        if (_tracker) {
          return _tracker[fnName](...args)
        }

        if(debug || options.debug) {
          debug(`Delaying call to tracker: ${fnName}`)
        }
        delayedCalls.push([fnName, ...args])
      }

      if (typeof Proxy === 'function') {
        // Create a Proxy for any tracker property (IE11+)
        tracker = new Proxy({}, {
          get (target, key) {
            return (...args) => proxyTrackerCall(key, ...args)
          }
        })
      } else {
        if (options.addNoProxyWorkaround) {
          tracker = {}
          apiMethods.forEach((fnName) => {
            // IE9/10 dont support Proxies, create a proxy map for known api methods
            tracker[fnName] = (...args) => proxyTrackerCall(fnName, ...args)
          })
        }
      }

      // Log a warning when piwik doesnt become available within 10s (in debug mode)
      const hasPiwikCheck = setTimeout(() => {
        if (!window.Piwik) {
          debug(`window.Piwik was not set within timeout`)
        }
      }, 10000)

      // Use a getter/setter to know when window.Piwik becomes available
      let _windowPiwik: any
      Object.defineProperty(window, 'Piwik', {
        configurable: true,
        enumerable: true,
        get () {
          return _windowPiwik
        },
        set (newVal) {
          if(debug || options.debug) {
            clearTimeout(hasPiwikCheck)
            if (_windowPiwik) {
              debug(`window.Piwik is already defined`)
            }
          }

          _windowPiwik = newVal
          _tracker = createTracker(options, delayedCalls)
          delayedCalls = undefined
        }
      })

      setupTracker(nuxtApp, tracker, options)
    }
  }
})

function createTracker (options, delayedCalls = []) {
  if (!window.Piwik) {
    if(debug || options.debug) {
      debug(`window.Piwik not initialized, unable to create a tracker`)
    }
    return
  }

  const tracker = window.Piwik.getTracker(options.trackerUrl, options.siteId)

  // extend tracker
  tracker.setConsent = (val: any) => {
    if (val || val === undefined) {
      if(options.consentExpires > 0) {
        tracker.rememberConsentGiven(options.consentExpires)
      } else {
        tracker.setConsentGiven()
      }
    } else {
      tracker.forgetConsentGiven()
    }
  }

  if(debug || options.debug) {
    debug(`Created tracker for siteId ` + options.siteId + ` to ` + options.trackerUrl)

    if(options.verbose) {
    // wrap all Piwik functions for verbose logging
    Object.keys(tracker).forEach((key) => {
      const fn = tracker[key]
      if (isFn(fn)) {
        tracker[key] = (...args) => {
          debug(`Calling tracker.${key} with args ${JSON.stringify(args)}`)
          return fn.call(tracker, ...args)
        }
      }
    })
  }}

  if(options.cookies === false) {
    tracker.disableCookies()
  }
  if(options.consentRequired !== false) {
    tracker.requireConsent()
  }
  if(options.doNotTrack !== false) {
    tracker.setDoNotTrack(true)
  }

  while (delayedCalls.length) {
    const [fnName, ...args] = delayedCalls.shift()
    if (isFn(tracker[fnName])) {
      if(debug || options.debug) {
        debug(`Calling delayed ${fnName} on tracker`)
      }
      tracker[fnName](...args)
    }
  }

  return tracker
}

function setupTracker(nuxtApp, tracker: any, options: MatomoOptions) {
  const router = useRouter()

  // define base url
  const baseUrl = window.location.protocol +
    (window.location.protocol.slice(-1) === ':' ? '' : ':') +
    '//' +
    window.location.host

  const trackRoute = ({ to, from }) => {
    let url = baseUrl + to.fullPath
    let referrer = from && from.fullPath
    tracker.setDocumentTitle(document.title)
    tracker.setCustomUrl(url)
    if (referrer) {
      tracker.setReferrerUrl(baseUrl + referrer)
    }
    tracker.trackPageView(document.title)
  }

  // every time the route changes (fired on initialization too)
  router.afterEach((to, from) => {
    setTimeout(() => {
      trackRoute({ to, from })
    }, options.trackDelay)
  })
}