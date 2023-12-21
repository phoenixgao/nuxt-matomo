import type { RouteLocationNormalized } from 'vue-router'

export function debug (msg: string) {
  console.debug(`[nuxt-matomo] ${msg}`)
}

export function warn (msg: string) {
  console.warn(`[nuxt-matomo] ${msg}`)
}

export function isFn (fn: unknown) {
  return typeof fn === 'function'
}

export function waitFor (time: number = 0) {
  return new Promise(resolve => setTimeout(resolve, time || 0))
}

export async function waitUntil (condition: () => boolean, timeout: number = 10000, interval: number = 10) {
  let duration = 0
  while (!(isFn(condition) ? condition() : condition)) {
    await waitFor(interval)
    duration += interval

    if (duration >= timeout) {
      break
    }
  }
}

export function routeOption (key: string, thisArg: any, from: RouteLocationNormalized, to: RouteLocationNormalized, ...args: any[]): any {
  const matched = to.matched[0]
  if (!matched) return null
  const matchedComponent = matched.components?.default
  if (!matchedComponent) return null
  return componentOption(matchedComponent, key, thisArg, from, to, ...args)
}

export function componentOption (component: any, key: string, thisArg: any, ...args: any[]): any {
  if (!component || !component.options || component.options[key] === undefined) {
    return null
  }

  const option = component.options[key]
  return isFn(option) ? option.call(thisArg, ...args) : option
}