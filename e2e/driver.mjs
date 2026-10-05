#!/usr/bin/env node
/**
 * dsh-password-login E2E driver: HTTP-only scenario assertions against a
 * live `dsh web` host. Phases A–E (see run-e2e.sh for orchestration);
 * exit code non-zero on any failed step, evidence printed as JSONL.
 */
const [baseFlag] = process.argv.filter((a) => a.startsWith('--base='))
const [phaseFlag] = process.argv.filter((a) => a.startsWith('--phase='))
const base = baseFlag ? baseFlag.slice('--base='.length) : 'http://127.0.0.1:8180'
const phase = phaseFlag ? phaseFlag.slice('--phase='.length) : 'A'
const P = '/plugins/dsh-password-login'

const results = []
let failed = 0

async function call(path, { method = 'GET', headers = {}, cookie, body } = {}) {
  const init = { method, headers: { ...headers }, redirect: 'manual' }
  if (cookie !== undefined) init.headers.cookie = cookie
  if (body !== undefined) {
    init.headers['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const response = await fetch(base + path, init)
  const setCookies = response.headers.getSetCookie()
  const text = await response.text()
  let json
  try { json = JSON.parse(text) } catch { json = undefined }
  return { status: response.status, headers: response.headers, setCookies, text, json }
}

function cookieOf(setCookies) {
  const line = setCookies.find((c) => c.startsWith('dsh-auth-'))
  return line === undefined ? undefined : line.split(';')[0]
}

function step(name, fn) {
  return { name, fn }
}

const steps = {
  A: () => [
    step('A01 session loopback free-mint', async (s) => {
      const r = await call(P + '/session')
      s.cookieA = cookieOf(r.setCookies)
      return r.status === 200 && r.json?.ok === true && r.json?.stale === undefined && s.cookieA !== undefined
    }),
    step('A02 GOLDEN minted cookie accepted by real host', async (s) => {
      const r = await call('/', { cookie: s.cookieA })
      return r.status === 200
    }),
    step('A03 root without cookie is 401', async () => (await call('/')).status === 401),
    step('A04 /api admission passes with minted cookie', async (s) => {
      const r = await call('/api/remote.mux', { method: 'POST', cookie: s.cookieA, body: {} })
      return r.status !== 401
    }),
    step('A05 /api admission rejects without cookie', async () => (await call('/api/remote.mux', { method: 'POST', body: {} })).status === 401),
    step('A06 login unset+loopback mints 303', async (s) => {
      const r = await call(P + '/login')
      s.cookieB = cookieOf(r.setCookies)
      return r.status === 303 && r.headers.get('location') === '/' && s.cookieB !== undefined
    }),
    step('A07 login cookie accepted', async (s) => (await call('/', { cookie: s.cookieB })).status === 200),
    step('A08 status unauthorized without cookie', async () => (await call(P + '/status')).status === 401),
    step('A09 status reports unset state', async (s) => {
      const r = await call(P + '/status', { cookie: s.cookieA })
      return r.status === 200 && r.json?.configured === false && r.json?.stale === false && r.json?.v === 1
    }),
    step('A10 rotate first-set (loopback)', async (s) => {
      const r = await call(P + '/rotate', { method: 'POST', cookie: s.cookieA, body: { next: 'hunter2' } })
      s.cookieR = cookieOf(r.setCookies)
      return r.status === 200 && r.json?.ok === true && s.cookieR !== undefined
    }),
    step('A11 REVOCATION old cookie dead at /api (data plane)', async (s) =>
      (await call('/api/remote.mux', { method: 'POST', cookie: s.cookieA, body: {} })).status === 401),
    step('A12 REVOCATION second old cookie dead at /api', async (s) =>
      (await call('/api/remote.mux', { method: 'POST', cookie: s.cookieB, body: {} })).status === 401),
    step('A13 rotator stays online (auto-reissue)', async (s) => (await call('/', { cookie: s.cookieR })).status === 200),
    step('A14 session demands bearer once set', async () => (await call(P + '/session')).status === 401),
    step('A15 session rejects wrong bearer', async () =>
      (await call(P + '/session', { headers: { authorization: 'Bearer nope' } })).status === 401),
    step('A16 session accepts right bearer (remote face)', async (s) => {
      const r = await call(P + '/session', { headers: { authorization: 'Bearer hunter2' } })
      s.cookieM = cookieOf(r.setCookies)
      return r.status === 200 && s.cookieM !== undefined
    }),
    step('A17 bearer cookie accepted', async (s) => (await call('/', { cookie: s.cookieM })).status === 200),
    step('A18 login Basic challenge', async () => {
      const r = await call(P + '/login')
      return r.status === 401 && (r.headers.get('www-authenticate') ?? '').includes('Basic realm="dsh-password-login"')
    }),
    step('A19 login wrong Basic re-challenges', async () => {
      const r = await call(P + '/login', { headers: { authorization: 'Basic ' + Buffer.from(':bad').toString('base64') } })
      return r.status === 401 && (r.headers.get('www-authenticate') ?? '').includes('Basic')
    }),
    step('A20 login right Basic (username ignored) mints 303', async (s) => {
      const r = await call(P + '/login', { headers: { authorization: 'Basic ' + Buffer.from('whoever:hunter2').toString('base64') } })
      s.cookieL = cookieOf(r.setCookies)
      return r.status === 303 && s.cookieL !== undefined
    }),
    step('A21 Basic cookie accepted', async (s) => (await call('/', { cookie: s.cookieL })).status === 200),
    step('A22 rotate rejects wrong current', async () =>
      (await call(P + '/rotate', { method: 'POST', body: { current: 'bad', next: 'next-pass' } })).status === 401),
    step('A23 rotate right current (remote peer allowed)', async (s) => {
      const r = await call(P + '/rotate', { method: 'POST', body: { current: 'hunter2', next: 'next-pass' } })
      s.cookieR2 = cookieOf(r.setCookies)
      return r.status === 200 && s.cookieR2 !== undefined
    }),
    step('A24 all pre-rotation cookies dead at /api', async (s) =>
      (await call('/api/remote.mux', { method: 'POST', cookie: s.cookieL, body: {} })).status === 401
      && (await call('/api/remote.mux', { method: 'POST', cookie: s.cookieM, body: {} })).status === 401),
    step('A25 second rotator cookie alive', async (s) => (await call('/', { cookie: s.cookieR2 })).status === 200),
    step('A26 fence: foreign Origin on session', async () =>
      (await call(P + '/session', { headers: { origin: 'http://evil.example' } })).status === 403),
    step('A27 fence: sec-fetch-site cross-site on session', async () =>
      (await call(P + '/session', { headers: { 'sec-fetch-site': 'cross-site' } })).status === 403),
    step('A28 fence: cross-site login leaks no Basic challenge', async () => {
      const r = await call(P + '/login', { headers: { 'sec-fetch-site': 'cross-site' } })
      return r.status === 403 && r.headers.get('www-authenticate') === null
    }),
    step('A29 rate limiter forces delay after 5 failures', async () => {
      for (let i = 0; i < 5; i += 1) {
        await call(P + '/session', { headers: { authorization: 'Bearer wrong' } })
      }
      const started = performance.now()
      await call(P + '/session', { headers: { authorization: 'Bearer wrong' } })
      return performance.now() - started >= 950
    }),
    step('A30 WS upgrade path revoked for dead cookie', async (s) => {
      const status = await wsProbe(s.cookieA)
      const alive = await wsProbe(s.cookieR2)
      return status === 401 && alive !== 401
    })
  ],
  B: (s) => [
    step('B01 pure restart keeps valid cookie alive (no false revocation)', async () =>
      (await call('/', { cookie: s.cookieR2 })).status === 200),
    step('B02 status still configured after restart', async () => {
      const r = await call(P + '/status', { cookie: s.cookieR2 })
      return r.status === 200 && r.json?.configured === true
    })
  ],
  C: (s) => [
    step('C01 config-channel password change revokes pre-boot cookies', async () =>
      (await call('/api/remote.mux', { method: 'POST', cookie: s.cookieR2, body: {} })).status === 401),
    step('C02 new password works on session', async () =>
      (await call(P + '/session', { headers: { authorization: 'Bearer cfgpass' } })).status === 200)
  ],
  D: () => [
    step('D01 enabled=false → session 404', async () => (await call(P + '/session')).status === 404),
    step('D02 enabled=false → login 404', async () => (await call(P + '/login')).status === 404),
    step('D03 enabled=false → status 404', async () => (await call(P + '/status')).status === 404),
    step('D04 enabled=false → rotate indistinguishable from uninstalled', async () => {
      const r = await call(P + '/rotate', { method: 'POST', body: { next: 'zzzz' } })
      const absent = await call(P + '/definitely-not-registered', { method: 'POST', body: { next: 'zzzz' } })
      return r.status === absent.status && r.status >= 400
    })
  ],
  E: () => [
    step('E01 env-seeded password: unset free-mint refused (401 bearer demand)', async () =>
      (await call(P + '/session')).status === 401),
    step('E02 env-seeded password mints with bearer', async () => {
      const r = await call(P + '/session', { headers: { authorization: 'Bearer envseed' } })
      const cookie = cookieOf(r.setCookies)
      if (r.status !== 200 || cookie === undefined) return false
      return (await call('/', { cookie })).status === 200
    })
  ]
}

function wsProbe(cookie) {
  return new Promise((resolve, reject) => {
    const url = new URL(base)
    const request = globalThis.__nodeHttp.request({
      host: url.hostname,
      port: Number(url.port),
      path: '/api/remote.mux',
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version': '13',
        Host: url.host,
        Cookie: cookie
      }
    })
    request.on('response', (response) => { response.resume(); resolve(response.statusCode) })
    request.on('upgrade', () => resolve(101))
    request.on('error', reject)
    request.end()
  })
}

async function main() {
  globalThis.__nodeHttp = await import('node:http')
  const store = { cookieR2: process.env.E2E_COOKIE_R2 }
  const list = steps[phase](store)
  for (const { name, fn } of list) {
    let ok = false
    let error
    try { ok = await fn(store) } catch (e) { error = String(e) }
    if (!ok) failed += 1
    results.push({ phase, name, ok, error })
    console.log(JSON.stringify({ phase, name, ok: ok === true, error }))
  }
  console.log(JSON.stringify({ phase, verdict: failed === 0 ? 'PASS' : `FAIL(${failed})`, total: list.length }))
  if (process.env.E2E_STATE_FILE !== undefined && store.cookieR2 !== undefined && phase === 'A') {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(process.env.E2E_STATE_FILE, store.cookieR2, 'utf8')
  }
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((error) => { console.error(error); process.exit(1) })
