import { createHash, createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  cookieName, cookieValue, decodeBase64Url, decodeCookie, encodeCookie, mintCookie,
  requestAuthority, sessionCookie, DAY_MS
} from '../src/cookie.ts'

const SECRET = Buffer.from('0123456789abcdef0123456789abcdef', 'utf8').subarray(0, 32)

function independentBase64Url(value: Uint8Array): string {
  return Buffer.from(value).toString('base64url')
}

describe('base64url', () => {
  it('round-trips arbitrary bytes', () => {
    for (const length of [0, 1, 2, 3, 31, 32, 33]) {
      const bytes = createHash('sha256').update(String(length)).digest().subarray(0, length)
      expect(decodeBase64Url(independentBase64Url(bytes))).toEqual(Buffer.from(bytes))
    }
  })
  it('rejects malformed input', () => {
    expect(decodeBase64Url('a')).toBeUndefined()
    expect(decodeBase64Url('a*b')).toBeUndefined()
    expect(decodeBase64Url('YWI')).toEqual(Buffer.from('ab'))
    // 'YWJ' decodes to bytes under lenient base64 but is NOT the canonical
    // encoding of anything (leftover bits set) — the canonicality check
    // rejects it, matching the host implementation.
    expect(decodeBase64Url('YWJ')).toBeUndefined()
  })
})

describe('requestAuthority', () => {
  it('normalizes through WHATWG URL', () => {
    expect(requestAuthority({ host: '127.0.0.1:8180' })).toBe('127.0.0.1:8180')
    expect(requestAuthority({ host: 'localhost' })).toBe('localhost')
    expect(requestAuthority({ host: '[::1]:3000' })).toBe('[::1]:3000')
  })
  it('is undefined without a host', () => {
    expect(requestAuthority({})).toBeUndefined()
  })
})

describe('cookie name/value (official v1 format)', () => {
  it('name is the dsh-auth- prefix over base64url(sha256(authority))', () => {
    const authority = '127.0.0.1:8180'
    const expected = 'dsh-auth-' + independentBase64Url(createHash('sha256').update(authority).digest())
    expect(cookieName(authority)).toBe(expected)
  })

  it('value is v1.<body>.<hmac> with exact payload key order', () => {
    const payload = { version: 1, authority: 'localhost:3000', issuedAt: 1000, expiresAt: 2000 }
    const value = encodeCookie(payload, SECRET)
    const parts = value.split('.')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe('v1')
    // Key order is load-bearing: the official encoder JSON.stringifies the
    // payload object built as {version, authority, issuedAt, expiresAt}.
    expect(Buffer.from(parts[1], 'base64url').toString('utf8'))
      .toBe('{"version":1,"authority":"localhost:3000","issuedAt":1000,"expiresAt":2000}')
    const expectedSignature = independentBase64Url(createHmac('sha256', SECRET).update(parts[1]).digest())
    expect(parts[2]).toBe(expectedSignature)
  })

  it('decodeCookie round-trips and rejects tampering', () => {
    const payload = { version: 1, authority: 'localhost:3000', issuedAt: 1, expiresAt: 2 }
    const value = encodeCookie(payload, SECRET)
    expect(decodeCookie(value, SECRET)).toEqual(payload)
    expect(decodeCookie(value, Buffer.from('x'.repeat(32)))).toBeUndefined()
    expect(decodeCookie(value.replace(/.$/, 'A'), SECRET)).toBeUndefined()
    expect(decodeCookie('v2.' + value.split('.')[1] + '.x', SECRET)).toBeUndefined()
  })

  it('cookieValue reads the exact segment without general cookie parsing', () => {
    const name = cookieName('localhost:3000')
    const raw = `other=1; ${name}=v1.abc.def; more=2`
    expect(cookieValue(raw, name)).toBe('v1.abc.def')
    expect(cookieValue(raw, 'missing')).toBeUndefined()
  })
})

describe('sessionCookie attributes (byte-identical to host)', () => {
  it('serializes Max-Age/Path/Expires/HttpOnly/SameSite=Strict in order', () => {
    const expiresAt = Date.UTC(2026, 0, 1, 0, 0, 0)
    const line = sessionCookie('dsh-auth-x', 'v1.a.b', expiresAt, 3600)
    expect(line).toBe(`dsh-auth-x=v1.a.b; Max-Age=3600; Path=/; Expires=${new Date(expiresAt).toUTCString()}; HttpOnly; SameSite=Strict`)
  })
})

describe('mintCookie', () => {
  const headers = { host: '127.0.0.1:8180' }

  it('mints a cookie the official payload shape accepts', () => {
    const now = 1_000_000
    const minted = mintCookie(headers, SECRET, 7, 30 * DAY_MS, now)
    expect(minted).toBeDefined()
    const payload = decodeCookie(minted!.setCookie.split(';')[0]!.slice((minted!.cookieName + '=').length), SECRET)
    expect(payload).toEqual({ version: 1, authority: '127.0.0.1:8180', issuedAt: now, expiresAt: now + 7 * DAY_MS })
  })

  it('clamps the lifetime to the host cookieMaxAgeDays ceiling', () => {
    const now = 5_000_000
    const minted = mintCookie(headers, SECRET, 90, 30 * DAY_MS, now)
    expect(minted!.expiresAt).toBe(now + 30 * DAY_MS)
  })

  it('returns undefined without secret or authority', () => {
    expect(mintCookie(headers, undefined, 7, 30 * DAY_MS, 0)).toBeUndefined()
    expect(mintCookie({}, SECRET, 7, 30 * DAY_MS, 0)).toBeUndefined()
  })
})
