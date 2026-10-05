import { describe, expect, it } from 'vitest'
import { createInitialUiState, createStore, type FetchLike } from '../src/client/store.ts'

function fakeFetch(handlers: {
  status?: number
  body?: unknown
  calls?: Array<{ input: string, init?: { method?: string, body?: string } }>
}): FetchLike {
  return async (input, init) => {
    handlers.calls?.push({ input, init })
    return {
      status: handlers.status ?? 200,
      ok: (handlers.status ?? 200) < 400,
      json: async () => handlers.body ?? {}
    }
  }
}

describe('client store', () => {
  it('refresh maps /status into the UI state', async () => {
    const calls: Array<{ input: string }> = []
    const store = createStore(fakeFetch({ status: 200, body: { configured: true, stale: false, v: 1 }, calls }))
    await store.refresh()
    expect(store.getSnapshot()).toEqual({ ...createInitialUiState(), loaded: true, unauthorized: false, status: { configured: true, stale: false, v: 1 } })
    expect(calls[0]!.input).toBe('/plugins/dsh-password-login/status')
  })

  it('marks unauthorized on 401', async () => {
    const store = createStore(fakeFetch({ status: 401 }))
    await store.refresh()
    expect(store.getSnapshot().unauthorized).toBe(true)
  })

  it('rotate posts {current?, next} and reports success', async () => {
    const calls: Array<{ input: string, init?: { method?: string, body?: string } }> = []
    const store = createStore(fakeFetch({ status: 200, body: { ok: true, v: 1 }, calls }))
    const ok = await store.rotate({ current: 'old', next: 'newpass' })
    expect(ok).toBe(true)
    expect(calls[0]!.input).toBe('/plugins/dsh-password-login/rotate')
    expect(calls[0]!.init?.method).toBe('POST')
    expect(JSON.parse(calls[0]!.init?.body ?? '{}')).toEqual({ current: 'old', next: 'newpass' })
    expect(store.getSnapshot().message?.kind).toBe('ok')
  })

  it('rotate surfaces the server error message', async () => {
    const store = createStore(fakeFetch({ status: 401, body: { ok: false, error: 'invalid current password' } }))
    const ok = await store.rotate({ current: 'bad', next: 'newpass' })
    expect(ok).toBe(false)
    expect(store.getSnapshot().message).toEqual({ kind: 'error', text: 'invalid current password' })
  })

  it('first set omits the current field', async () => {
    const calls: Array<{ input: string, init?: { body?: string } }> = []
    const store = createStore(fakeFetch({ status: 200, calls }))
    await store.rotate({ next: 'first-pass' })
    expect(JSON.parse(calls[0]!.init?.body ?? '{}')).toEqual({ next: 'first-pass' })
  })
})
