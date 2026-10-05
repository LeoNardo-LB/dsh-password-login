/**
 * dsh-password-login browser half: a page in the native Settings window
 * (settings.plugins.tab) managing the login password lifecycle.
 *
 * @module dsh-password-login/client
 */
import * as React from 'react'
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { SettingsTab } from './SettingsTab.tsx'
import { createStore } from './store-instance.ts'
import type { PasswordStore, PasswordUiState } from './store.ts'

export { createInitialUiState } from './store.ts'
export { createStore } from './store-instance.ts'
export { SettingsTab } from './SettingsTab.tsx'
export type { PasswordStore, PasswordUiState } from './store.ts'
export type { SettingsTabProps } from './SettingsTab.tsx'

/** Required client services: the slot registry. */
export const inject = ['slots']

/** Shared module-level store so every mount sees one state. */
let shared: PasswordStore | null = null

function sharedStore(): PasswordStore {
  if (shared === null) shared = createStore()
  return shared
}

/**
 * Client plugin body: register the Settings tab through a declaration-aware
 * inject wrapper (waits for the plugins section to declare the tab list,
 * rolls back with it).
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const store = sharedStore()
  ctx.inject(['slots'], (scope: ClientContext) => {
    scope.slots.inject('settings.plugins.tab', () =>
      scope.slots.register(
        { name: 'settings.plugins.tab', id: 'password-login', order: 21, label: () => '登录密码' },
        function PasswordLoginSettingsTab(): React.ReactNode {
          return <SettingsTabBridge store={store} />
        }
      )
    )
  })
}

/** Bridge keeps SettingsTab stable while binding the shared store. */
function SettingsTabBridge(props: { store: PasswordStore }): React.ReactNode {
  const [state, setState] = React.useState<PasswordUiState>(props.store.getSnapshot())
  React.useEffect(() => {
    const unsubscribe = props.store.subscribe(setState)
    void props.store.refresh()
    return unsubscribe
  }, [props.store])
  return <SettingsTab state={state} store={props.store} />
}
