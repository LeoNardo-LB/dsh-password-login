import { describe, expect, it } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createRoutes, type RouteDeps } from '../src/routes.ts'
import { createRateLimiter } from '../src/password.ts'
import { encodeCookie, cookieName, DAY_MS } from '../src/cookie.ts'
import type { PasswordLoginConfig } from '../src/types.ts'

const SECRET = Buffer.alloc(32, 7)
const NOW = 10_000_000

interface Box {
  res: ServerResponse
  get statusCode(): number
  get payload(): unknown
  headers: Record<string, string | string[] | undefined>
}

function fakeReq(options: { method?: string, url?: string, headers?: Record<string, string>, body?: unknown, remoteAddress?: string }): IncomingMessage {
  const chunks = options.body === undefined ? [] : [Buffer.from(typeof options.body === 'string' ? options.body : JSON.stringify(options.body))]
  const req = {
    method: options.method ?? 'GET',
    url: options.url ?? '/',
    headers: { host: '127.0.0.1:8180', ...options.headers },
    socket: { remoteAddress: options.remoteAddress ?? '127.0.0.1' },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    }
  }
  return req as unknown as IncomingMessage
}

function fakeRes(): Box {
  const headers: Record<string, string | string[]> = {}
  const state = { statusCode: 0, raw: '' }
  const res = {
    writeHead(status: number, extra?: Record<string, string | string[]>) {
      state.statusCode = status
      Object.assign(headers, extra ?? {})
    },
    end(body?: string) {
      if (body !== undefined) state.raw = body
    },
    setHeader() { /* unused */ }
  }
  return {
    res: res as unknown as ServerResponse,
    get statusCode() { return state.statusCode },
    get payload() {
      try { return JSON.parse(state.raw) } catch { return state.raw }
    },
    headers: headers as Record<string, string | string[] | undefined>
  }
}

interface DepsOverrides extends Partial<Omit<RouteDeps, 'isStale'>> {
  config?: Partial<PasswordLoginConfig>
  sleeps?: number[]
  isStale?: boolean
}

function makeDeps(overrides: DepsOverrides = {}): RouteDeps {
  const config: PasswordLoginConfig = { enabled: true, password: '', cookieDays: 7, ...overrides.config }
  return {
    readConfig: () => config,
    now: () => NOW,
    secret: () => (overrides.secret !== undefined ? overrides.secret() : SECRET),
    hostMaxAgeMs: () => 30 * DAY_MS,
    isStale: () => overrides.isStale ?? false,
    limiter: overrides.limiter ?? createRateLimiter({ sleep: async (ms) => { (overrides.sleeps ??= []).push(ms) } }),
    admit: overrides.admit ?? (() => ({ peer: {} })),
    persistPassword: overrides.persistPassword ?? (async () => {}),
    onRotated: overrides.onRotated ?? (async () => {}),
    onRevoked: overrides.onRevoked ?? (async () => {})
  }
}

function setCookieValue(box: Box): string {
  const value = box.headers['set-cookie']
  return Array.isArray(value) ? value[0]! : value!
}

describe('GET /session', () => {
  it('mints freely for loopback peers when no password is configured', async () => {
    const routes = createRoutes(makeDeps())
    const box = fakeRes()
    await routes.session(fakeReq({ remoteAddress: '127.0.0.1' }), box.res)
    expect(box.statusCode).toBe(200)
    expect((box.payload as { ok: boolean }).ok).toBe(true)
    expect(setCookieValue(box)).toContain('dsh-auth-')
    expect(setCookieValue(box)).toContain('HttpOnly')
  })

  it('refuses non-loopback peers when no password is configured (fail-closed)', async () => {
    const routes = createRoutes(makeDeps())
    const box = fakeRes()
    await routes.session(fakeReq({ remoteAddress: '192.168.1.5' }), box.res)
    expect(box.statusCode).toBe(403)
  })

  it('requires the password as a Bearer once configured', async () => {
    const routes = createRoutes(makeDeps({ config: { password: 'hunter2' } }))
    const noAuth = fakeRes()
    await routes.session(fakeReq({ remoteAddress: '127.0.0.1' }), noAuth.res)
    expect(noAuth.statusCode).toBe(401)

    const wrong = fakeRes()
    await routes.session(fakeReq({ headers: { authorization: 'Bearer nope' } }), wrong.res)
    expect(wrong.statusCode).toBe(401)

    const right = fakeRes()
    await routes.session(fakeReq({ headers: { authorization: 'Bearer hunter2' }, remoteAddress: '192.168.1.5' }), right.res)
    expect(right.statusCode).toBe(200)
    expect(setCookieValue(right)).toContain('dsh-auth-')
  })

  it('reports stale when the canary failed and 503 when the secret is gone', async () => {
    const stale = createRoutes(makeDeps({ isStale: true }))
    const staleBox = fakeRes()
    await stale.session(fakeReq({}), staleBox.res)
    expect(staleBox.statusCode).toBe(200)
    expect((staleBox.payload as { stale?: boolean }).stale).toBe(true)

    const dead = createRoutes(makeDeps({ secret: () => undefined }))
    const deadBox = fakeRes()
    await dead.session(fakeReq({}), deadBox.res)
    expect(deadBox.statusCode).toBe(503)
    expect((deadBox.payload as { stale?: boolean }).stale).toBe(true)
  })

  it('rejects browser cross-site markers', async () => {
    const routes = createRoutes(makeDeps())
    const box = fakeRes()
    await routes.session(fakeReq({ headers: { 'sec-fetch-site': 'cross-site' } }), box.res)
    expect(box.statusCode).toBe(403)
    const box2 = fakeRes()
    await routes.session(fakeReq({ headers: { origin: 'http://evil.example' } }), box2.res)
    expect(box2.statusCode).toBe(403)
  })
})

describe('GET /login', () => {
  it('mints and redirects for loopback peers when unset', async () => {
    const routes = createRoutes(makeDeps())
    const box = fakeRes()
    await routes.login(fakeReq({ remoteAddress: '127.0.0.1' }), box.res)
    expect(box.statusCode).toBe(303)
    expect(box.headers.location).toBe('/')
    expect(setCookieValue(box)).toContain('dsh-auth-')
  })

  it('403 for non-loopback peers when unset', async () => {
    const routes = createRoutes(makeDeps())
    const box = fakeRes()
    await routes.login(fakeReq({ remoteAddress: '10.0.0.2' }), box.res)
    expect(box.statusCode).toBe(403)
  })

  it('issues a Basic challenge when a password is configured', async () => {
    const routes = createRoutes(makeDeps({ config: { password: 'hunter2' } }))
    const box = fakeRes()
    await routes.login(fakeReq({ remoteAddress: '127.0.0.1' }), box.res)
    expect(box.statusCode).toBe(401)
    expect(String(box.headers['www-authenticate'])).toContain('Basic realm="dsh-password-login"')
  })

  it('accepts correct Basic credentials (username ignored) and re-challenges wrong ones', async () => {
    const routes = createRoutes(makeDeps({ config: { password: 'hunter2' } }))
    const good = Buffer.from('anyuser:hunter2').toString('base64')
    const box = fakeRes()
    await routes.login(fakeReq({ headers: { authorization: `Basic ${good}` }, remoteAddress: '192.168.1.5' }), box.res)
    expect(box.statusCode).toBe(303)
    expect(setCookieValue(box)).toContain('dsh-auth-')

    const bad = Buffer.from('anyuser:wrong').toString('base64')
    const box2 = fakeRes()
    await routes.login(fakeReq({ headers: { authorization: `Basic ${bad}` } }), box2.res)
    expect(box2.statusCode).toBe(401)
    expect(String(box2.headers['www-authenticate'])).toContain('Basic')
  })
})

describe('GET /status', () => {
  it('mirrors the admission verdict, then reports existence-only state', async () => {
    const routes = createRoutes(makeDeps({ config: { password: 'hunter2' }, admit: () => ({ rejection: 401 }) }))
    const rejected = fakeRes()
    await routes.status(fakeReq({}), rejected.res)
    expect(rejected.statusCode).toBe(401)

    const admitted = createRoutes(makeDeps({ config: { password: 'hunter2' }, admit: () => ({ peer: {} }) }))
    const box = fakeRes()
    await admitted.status(fakeReq({}), box.res)
    expect(box.statusCode).toBe(200)
    expect(box.payload).toEqual({ configured: true, stale: false, v: 1 })
  })
})

describe('POST /rotate', () => {
  it('first set is loopback-only', async () => {
    const routes = createRoutes(makeDeps())
    const box = fakeRes()
    await routes.rotate(fakeReq({ method: 'POST', body: { next: 'hunter2' }, remoteAddress: '192.168.1.5' }), box.res)
    expect(box.statusCode).toBe(403)
  })

  it('validates next (min 4 bytes, no CR/LF/NUL) and JSON shape', async () => {
    const routes = createRoutes(makeDeps())
    for (const [label, body] of [['short', { next: 'abc' }], ['control bytes', { next: 'ab\rc' }], ['missing', {}]] as const) {
      const box = fakeRes()
      await routes.rotate(fakeReq({ method: 'POST', body, remoteAddress: '127.0.0.1' }), box.res)
      expect(box.statusCode, label).toBe(400)
    }
    const broken = fakeRes()
    await routes.rotate(fakeReq({ method: 'POST', body: 'not json', url: '/' }), broken.res)
    expect([400, 500]).toContain(broken.statusCode)
  })

  it('sets the password, advances the epoch, and auto-mints a surviving cookie', async () => {
    const persisted: string[] = []
    const rotations: Array<{ fingerprint: string, at: number }> = []
    const routes = createRoutes(makeDeps({
      persistPassword: async (next) => { persisted.push(next) },
      onRotated: async (fingerprint, at) => { rotations.push({ fingerprint, at }) }
    }))
    const box = fakeRes()
    await routes.rotate(fakeReq({ method: 'POST', body: { next: 'hunter2' }, remoteAddress: '127.0.0.1' }), box.res)
    expect(box.statusCode).toBe(200)
    expect(persisted).toEqual(['hunter2'])
    expect(rotations).toHaveLength(1)
    expect(rotations[0]!.at).toBe(NOW)
    // The auto-minted cookie is issued AT the epoch → survives its own rotation.
    const cookie = setCookieValue(box).split(';')[0]!
    const value = cookie.slice(cookie.indexOf('=') + 1)
    const payload = JSON.parse(Buffer.from(value.split('.')[1]!, 'base64url').toString('utf8')) as { issuedAt: number }
    expect(payload.issuedAt).toBeGreaterThanOrEqual(rotations[0]!.at)
  })

  it('demands the current password from any peer once configured', async () => {
    const routes = createRoutes(makeDeps({ config: { password: 'hunter2' } }))
    const missing = fakeRes()
    await routes.rotate(fakeReq({ method: 'POST', body: { next: 'next-pass' }, remoteAddress: '127.0.0.1' }), missing.res)
    expect(missing.statusCode).toBe(401)

    const wrong = fakeRes()
    await routes.rotate(fakeReq({ method: 'POST', body: { current: 'nope', next: 'next-pass' }, remoteAddress: '192.168.1.5' }), wrong.res)
    expect(wrong.statusCode).toBe(401)

    const box = fakeRes()
    await routes.rotate(fakeReq({ method: 'POST', body: { current: 'hunter2', next: 'next-pass' }, remoteAddress: '192.168.1.5' }), box.res)
    expect(box.statusCode).toBe(200)
  })

  it('surfaces persistence failures as 500 without advancing the epoch', async () => {
    let rotated = 0
    const routes = createRoutes(makeDeps({
      config: { password: 'hunter2' },
      persistPassword: async () => { throw new Error('overlay refuses writes') },
      onRotated: async () => { rotated += 1 }
    }))
    const box = fakeRes()
    await routes.rotate(fakeReq({ method: 'POST', body: { current: 'hunter2', next: 'next-pass' } }), box.res)
    expect(box.statusCode).toBe(500)
    expect(rotated).toBe(0)
  })
})

describe('shared rate limiter (Basic and rotate failures count together)', () => {
  it('forces the delay once the threshold is crossed', async () => {
    const sleeps: number[] = []
    const routes = createRoutes(makeDeps({ config: { password: 'hunter2' }, sleeps }))
    for (let i = 0; i < 5; i += 1) {
      const box = fakeRes()
      await routes.login(fakeReq({ headers: { authorization: 'Basic ' + Buffer.from('u:bad').toString('base64') } }), box.res)
      expect(box.statusCode).toBe(401)
    }
    expect(sleeps).toHaveLength(0)
    const box = fakeRes()
    await routes.session(fakeReq({ headers: { authorization: 'Bearer bad' } }), box.res)
    expect(sleeps.length).toBeGreaterThanOrEqual(1)
  })
})

describe('method misuse (contract guard)', () => {
  it('rejects wrong verbs with 405 before any auth logic', async () => {
    const routes = createRoutes(makeDeps())
    const post = fakeRes()
    await routes.session(fakeReq({ method: 'POST', body: {} }), post.res)
    expect(post.statusCode).toBe(405)
    const put = fakeRes()
    await routes.login(fakeReq({ method: 'PUT' }), put.res)
    expect(put.statusCode).toBe(405)
    const get = fakeRes()
    await routes.rotate(fakeReq({ method: 'GET' }), get.res)
    expect(get.statusCode).toBe(405)
    const del = fakeRes()
    await routes.status(fakeReq({ method: 'DELETE' }), del.res)
    expect(del.statusCode).toBe(405)
  })

  it('does not mint or mutate on rejected verbs', async () => {
    const persisted: string[] = []
    const routes = createRoutes(makeDeps({ persistPassword: async (v) => { persisted.push(v) } }))
    const box = fakeRes()
    await routes.rotate(fakeReq({ method: 'GET', body: { next: 'whatever-long' } }), box.res)
    expect(box.statusCode).toBe(405)
    expect(persisted).toEqual([])
  })
})

describe('POST /revoke (回收所有会话，不改密)', () => {
  it('mirrors the admission verdict first', async () => {
    const routes = createRoutes(makeDeps({ admit: () => ({ rejection: 401 }) }))
    const box = fakeRes()
    await routes.revoke(fakeReq({ method: 'POST' }), box.res)
    expect(box.statusCode).toBe(401)
  })

  it('rejects wrong verbs with 405', async () => {
    const routes = createRoutes(makeDeps())
    const box = fakeRes()
    await routes.revoke(fakeReq({ method: 'GET' }), box.res)
    expect(box.statusCode).toBe(405)
  })

  it('advances the epoch without touching the password and auto-reissues', async () => {
    let revokedAt: number | undefined
    const persisted: string[] = []
    const routes = createRoutes(makeDeps({
      config: { password: 'hunter2' },
      persistPassword: async (v) => { persisted.push(v) },
      onRevoked: async (at) => { revokedAt = at }
    }))
    const box = fakeRes()
    await routes.revoke(fakeReq({ method: 'POST' }), box.res)
    expect(box.statusCode).toBe(200)
    expect(revokedAt).toBe(NOW)
    expect(persisted).toEqual([]) // 密码不动
    expect(setCookieValue(box)).toContain('dsh-auth-') // 调用者换票存活
    const cookie = setCookieValue(box).split(';')[0]!
    const payload = JSON.parse(Buffer.from(cookie.slice(cookie.indexOf('=') + 1).split('.')[1]!, 'base64url').toString('utf8')) as { issuedAt: number }
    expect(payload.issuedAt).toBeGreaterThanOrEqual(NOW) // 新票不死于自己发起的撤销
  })

  it('surfaces epoch persistence failures as 500', async () => {
    const routes = createRoutes(makeDeps({ onRevoked: async () => { throw new Error('domain write failed') } }))
    const box = fakeRes()
    await routes.revoke(fakeReq({ method: 'POST' }), box.res)
    expect(box.statusCode).toBe(500)
  })
})

describe('minted cookie validity window', () => {
  it('is accepted by decodeCookie under the same secret and authority', async () => {
    const routes = createRoutes(makeDeps())
    const box = fakeRes()
    await routes.session(fakeReq({}), box.res)
    const cookie = setCookieValue(box).split(';')[0]!
    const name = cookie.slice(0, cookie.indexOf('='))
    expect(name).toBe(cookieName('127.0.0.1:8180'))
    const payload = JSON.parse(Buffer.from(cookie.slice(name.length + 1).split('.')[1]!, 'base64url').toString('utf8'))
    expect(payload.authority).toBe('127.0.0.1:8180')
    expect(encodeCookie(payload, SECRET).split('.')[0]).toBe('v1')
  })
})
