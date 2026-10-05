import { installRevocation } from "./admit.js";
import { Config } from "./config.js";
import { cookieName, cookieValue, DAY_MS, decodeCookie, encodeCookie, header, requestAuthority } from "./cookie.js";
import { passwordLoginDomain } from "./domain.js";
import { resolveEpoch } from "./epoch.js";
import { isLoopbackPeer } from "./loopback.js";
import { passwordFingerprint, createRateLimiter } from "./password.js";
import { createRoutes } from "./routes.js";
import { ROUTE_PREFIX } from "./types.js";
export const name = 'dsh-password-login';
/** Host services required before activation (fail-loud when missing). */
export const inject = ['connection', 'webServer', 'settings', 'storageDomain'];
export { Config };
/** Profile entry id (cordis.patch.yml) — settings writes address it. */
const ENTRY_ID = 'dsh-password-login';
/** Entry-model hosts hand apply() a cosmokit volatile ref (keepalive precedent). */
function isVolatileRef(value) {
    return typeof value === 'object' && value !== null && 'get' in value;
}
function readLiveConfig(config) {
    const raw = (isVolatileRef(config) ? config.get() : config);
    return {
        enabled: raw?.enabled ?? true,
        password: raw?.password ?? process.env.DSH_PASSWORD_LOGIN_PASSWORD ?? '',
        cookieDays: raw?.cookieDays ?? 7
    };
}
/**
 * Startup canary (spec §F): mint with OUR implementation and hand the cookie
 * to the live BrowserAuth.isAuthenticated. Accept = format still identical;
 * reject = host format drifted → endpoints answer `stale: true` and the
 * revocation wrapper stays unarmed.
 */
function runCanary(browserAuth) {
    try {
        if (browserAuth === undefined)
            return false;
        const secret = browserAuth.secret;
        if (!Buffer.isBuffer(secret) || secret.byteLength !== 32)
            return false;
        const maxAge = typeof browserAuth.maxAgeMilliseconds === 'number' ? browserAuth.maxAgeMilliseconds : 30 * DAY_MS;
        const authority = 'dsh-password-login.invalid:1';
        const issuedAt = Date.now();
        const value = encodeCookie({ version: 1, authority, issuedAt, expiresAt: issuedAt + Math.min(DAY_MS, maxAge) }, secret);
        const probe = { headers: { host: authority, cookie: `${cookieName(authority)}=${value}` } };
        return browserAuth.isAuthenticated(probe) === true;
    }
    catch {
        return false;
    }
}
export function apply(ctx, config = {}) {
    const init = async () => {
        if (!readLiveConfig(config).enabled) {
            ctx.logger.info('dsh-password-login: disabled by config; nothing registered');
            return;
        }
        const forms = ctx.settings;
        // The 'connection' service carries no Context type augmentation; reach it
        // through the vendored surface (canary-verified below).
        const connection = ctx.connection;
        const browserAuth = connection?.browserAuth;
        const stale = !runCanary(browserAuth);
        if (stale) {
            ctx.logger.error('dsh-password-login: mint-format canary FAILED — endpoints will report stale and revocation stays disabled; consumers should use the legacy token flow');
        }
        const secret = () => {
            const value = browserAuth?.secret;
            return Buffer.isBuffer(value) ? value : undefined;
        };
        const hostMaxAgeMs = () => {
            const value = browserAuth?.maxAgeMilliseconds;
            return typeof value === 'number' ? value : 30 * DAY_MS;
        };
        const domain = (await ctx.storageDomain.open(passwordLoginDomain));
        ctx.effect(() => () => void Promise.resolve(domain.close()).catch(() => undefined));
        // Boot epoch resolution: fingerprint match keeps the stored epoch (a pure
        // restart never revokes); mismatch (config-channel password change)
        // resets to boot time — everyone down exactly once.
        const bootConfig = readLiveConfig(config);
        const stored = domain.global.get();
        const resolved = resolveEpoch(stored, bootConfig.password !== '' ? passwordFingerprint(bootConfig.password) : '', Date.now());
        if (stored.epoch !== resolved.epoch || stored.passwordFingerprint !== resolved.passwordFingerprint) {
            await domain.global.set(resolved);
        }
        const epoch = { value: resolved.epoch };
        const fingerprint = { value: resolved.passwordFingerprint };
        const deps = {
            readConfig: () => readLiveConfig(config),
            now: () => Date.now(),
            secret,
            hostMaxAgeMs,
            isStale: () => stale,
            limiter: createRateLimiter(),
            admit: (request) => connection !== undefined ? connection.admit(request) : { rejection: 401 },
            persistPassword: async (next) => {
                await forms.update(ENTRY_ID, { password: next });
            },
            onRotated: async (fp, at) => {
                fingerprint.value = fp;
                epoch.value = at;
                await domain.global.set({ epoch: at, passwordFingerprint: fp });
            },
            onRevoked: async (at) => {
                // 密码不动，指纹不动——只推进 epoch（/revoke 通道）。
                epoch.value = at;
                await domain.global.set({ epoch: at, passwordFingerprint: fingerprint.value });
            }
        };
        const routes = createRoutes(deps);
        const table = [
            ['/session', routes.session],
            ['/login', routes.login],
            ['/status', routes.status],
            ['/rotate', routes.rotate],
            ['/revoke', routes.revoke]
        ];
        for (const [suffix, handler] of table) {
            ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: ROUTE_PREFIX + suffix, handler }), `dsh-password-login: ${suffix} route`);
        }
        if (!stale && connection !== undefined) {
            const peekIssuedAt = (request) => {
                const headers = request?.headers;
                const liveSecret = secret();
                if (headers === undefined || liveSecret === undefined)
                    return undefined;
                const authority = requestAuthority(headers);
                const rawCookie = header(headers, 'cookie');
                if (authority === undefined || rawCookie === undefined)
                    return undefined;
                const value = cookieValue(rawCookie, cookieName(authority));
                if (value === undefined)
                    return undefined;
                return decodeCookie(value, liveSecret)?.issuedAt;
            };
            const restore = installRevocation(connection, peekIssuedAt, () => epoch.value, 
            // 常武装：epoch=0 天然惰性（无撤销语义），未设密码态的 /revoke 同样生效。
            () => true);
            ctx.effect(() => restore, 'dsh-password-login: admit revocation');
        }
        ctx.logger.info(`dsh-password-login: active (password ${fingerprint.value !== '' ? 'configured' : 'unset — loopback free-mint'}, revocation ${stale ? 'DISABLED (canary drift)' : 'armed'})`);
    };
    void init().catch((error) => {
        ctx.logger.error('dsh-password-login: initialization failed: ' + String(error));
    });
}
//# sourceMappingURL=index.js.map