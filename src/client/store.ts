/**
 * dsh-password-login browser half: a page in the native Settings window
 * (settings.plugins.tab) managing the login password lifecycle. Pure store
 * over injected fetch — node-testable, no Cordis surface here.
 */
import { ROUTE_PREFIX } from '../types.ts'

export interface PasswordStatus {
  configured: boolean
  stale: boolean
  v: number
}

export interface PasswordUiState {
  loaded: boolean
  unauthorized: boolean
  status?: PasswordStatus
  busy: boolean
  message?: { kind: 'ok' | 'error', text: string }
}

export interface PasswordStore {
  getSnapshot(): PasswordUiState
  subscribe(listener: (state: PasswordUiState) => void): () => void
  refresh(): Promise<void>
  rotate(input: { current?: string, next: string }): Promise<boolean>
}

export type FetchLike = (input: string, init?: { method?: string, headers?: Record<string, string>, body?: string }) => Promise<{
  status: number
  ok: boolean
  json(): Promise<unknown>
}>

export function createInitialUiState(): PasswordUiState {
  return { loaded: false, unauthorized: false, busy: false }
}

function errorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && !Array.isArray(body) && typeof (body as { error?: unknown }).error === 'string') {
    return (body as { error: string }).error
  }
  return fallback
}

export function createStore(fetchLike: FetchLike): PasswordStore {
  let state: PasswordUiState = createInitialUiState()
  const listeners = new Set<(state: PasswordUiState) => void>()
  const set = (patch: Partial<PasswordUiState>): void => {
    state = { ...state, ...patch }
    for (const listener of listeners) listener(state)
  }
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    async refresh(): Promise<void> {
      try {
        const response = await fetchLike(ROUTE_PREFIX + '/status')
        if (response.status === 401) {
          set({ loaded: true, unauthorized: true, status: undefined })
          return
        }
        const body = await response.json()
        if (!response.ok) {
          set({ loaded: true, message: { kind: 'error', text: errorMessage(body, 'status unavailable') } })
          return
        }
        set({ loaded: true, unauthorized: false, status: body as PasswordStatus, message: undefined })
      } catch {
        set({ loaded: true, message: { kind: 'error', text: 'network error' } })
      }
    },
    async rotate(input: { current?: string, next: string }): Promise<boolean> {
      set({ busy: true })
      try {
        const body: { next: string, current?: string } = { next: input.next }
        if (input.current !== undefined && input.current !== '') body.current = input.current
        const response = await fetchLike(ROUTE_PREFIX + '/rotate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        })
        const parsed = await response.json().catch(() => undefined)
        if (!response.ok) {
          set({ busy: false, message: { kind: 'error', text: errorMessage(parsed, 'rotation failed') } })
          return false
        }
        set({ busy: false })
        await this.refresh()
        set({ message: { kind: 'ok', text: input.current !== undefined ? '密码已轮换，所有已登录会话（含浏览器）已下线' : '密码已设置，此后任何对端都须凭密码进入' } })
        return true
      } catch {
        set({ busy: false, message: { kind: 'error', text: 'network error' } })
        return false
      }
    }
  }
}
