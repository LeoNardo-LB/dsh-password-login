import { describe, expect, it } from 'vitest'
import { passesBrowserFence } from '../src/hardening.ts'

describe('passesBrowserFence (uniform on every endpoint)', () => {
  it('allows native requests (no browser markers)', () => {
    expect(passesBrowserFence({ host: '127.0.0.1:8180' })).toBe(true)
  })

  it('allows same-origin browser requests', () => {
    expect(passesBrowserFence({ host: '127.0.0.1:8180', origin: 'http://127.0.0.1:8180', 'sec-fetch-site': 'same-origin' })).toBe(true)
  })

  it('rejects cross-site markers', () => {
    expect(passesBrowserFence({ host: '127.0.0.1:8180', 'sec-fetch-site': 'cross-site' })).toBe(false)
  })

  it('rejects a foreign Origin', () => {
    expect(passesBrowserFence({ host: '127.0.0.1:8180', origin: 'http://evil.example' })).toBe(false)
    expect(passesBrowserFence({ host: '127.0.0.1:8180', origin: 'http://127.0.0.1:8181' })).toBe(false)
    expect(passesBrowserFence({ origin: 'http://127.0.0.1:8180' })).toBe(false)
  })
})
