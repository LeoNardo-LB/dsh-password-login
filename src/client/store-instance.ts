/** Browser-bound store construction: window fetch. */
import { createStore as createPasswordStore } from './store.ts'
import type { PasswordStore } from './store.ts'

/** Create the browser store bound to window.fetch. */
export function createStore(): PasswordStore {
  return createPasswordStore(window.fetch.bind(window) as unknown as Parameters<typeof createPasswordStore>[0])
}
