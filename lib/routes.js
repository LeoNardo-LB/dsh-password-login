import { header, mintCookie } from "./cookie.js";
import { passesBrowserFence } from "./hardening.js";
import { isLoopbackPeer } from "./loopback.js";
import { isPasswordSettable, passwordFingerprint, verifyPassword } from "./password.js";
import { PROTOCOL_VERSION } from "./types.js";
function sendJson(res, status, body, extraHeaders) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders });
    res.end(JSON.stringify(body));
}
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw.length === 0)
        return {};
    return JSON.parse(raw);
}
function bearerPassword(headers) {
    const authorization = header(headers, 'authorization');
    if (authorization === undefined)
        return undefined;
    const match = authorization.match(/^Bearer[ ](.+)$/u);
    return match !== null && match[1] !== undefined ? match[1] : undefined;
}
function basicPassword(headers) {
    const authorization = header(headers, 'authorization');
    if (authorization === undefined)
        return undefined;
    const match = authorization.match(/^Basic[ ]([A-Za-z0-9+/=]+)$/u);
    if (match === null || match[1] === undefined)
        return undefined;
    try {
        const decoded = Buffer.from(match[1], 'base64').toString('utf8');
        const at = decoded.indexOf(':');
        if (at === -1)
            return undefined;
        return decoded.slice(at + 1);
    }
    catch {
        return undefined;
    }
}
function isLoopbackRequest(req) {
    const address = req.socket?.remoteAddress;
    return isLoopbackPeer(address);
}
function mintFor(deps, req) {
    const config = deps.readConfig();
    return mintCookie(req.headers, deps.secret(), config.cookieDays, deps.hostMaxAgeMs(), deps.now());
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function createRoutes(deps) {
    /** Contract guard: reject method misuse with 405 before any auth logic. */
    const requireMethod = (req, res, method) => {
        if (req.method !== method) {
            sendJson(res, 405, { ok: false, error: `method ${String(req.method)} not allowed` });
            return false;
        }
        return true;
    };
    /** Machine face: mint a session cookie (loopback free-mint or password). */
    const session = async (req, res) => {
        if (!requireMethod(req, res, 'GET'))
            return;
        if (!passesBrowserFence(req.headers)) {
            sendJson(res, 403, { ok: false, error: 'forbidden' });
            return;
        }
        const config = deps.readConfig();
        if (config.password !== '') {
            const candidate = bearerPassword(req.headers);
            if (candidate === undefined) {
                sendJson(res, 401, { ok: false, error: 'password required', v: PROTOCOL_VERSION });
                return;
            }
            await deps.limiter.beforeAttempt();
            if (!verifyPassword(candidate, config.password)) {
                deps.limiter.onFailure();
                sendJson(res, 401, { ok: false, error: 'invalid password', v: PROTOCOL_VERSION });
                return;
            }
            deps.limiter.onSuccess();
        }
        else if (!isLoopbackRequest(req)) {
            sendJson(res, 403, { ok: false, error: 'password not configured; loopback peers only', v: PROTOCOL_VERSION });
            return;
        }
        const minted = mintFor(deps, req);
        if (minted === undefined) {
            sendJson(res, 503, { ok: false, error: 'mint unavailable', stale: true, v: PROTOCOL_VERSION });
            return;
        }
        sendJson(res, 200, { ok: true, v: PROTOCOL_VERSION, ...(deps.isStale() ? { stale: true } : {}) }, { 'set-cookie': minted.setCookie });
    };
    /** Browser face: bookmark target. Basic challenge → verify → mint → 303. */
    const login = async (req, res) => {
        if (!requireMethod(req, res, 'GET'))
            return;
        if (!passesBrowserFence(req.headers)) {
            res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
            res.end('forbidden\n');
            return;
        }
        const config = deps.readConfig();
        if (config.password === '') {
            if (!isLoopbackRequest(req)) {
                res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
                res.end('no password configured; loopback peers only\n');
                return;
            }
            const minted = mintFor(deps, req);
            if (minted === undefined) {
                res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
                res.end('mint unavailable\n');
                return;
            }
            res.writeHead(303, { 'cache-control': 'no-store', location: '/', 'set-cookie': minted.setCookie });
            res.end();
            return;
        }
        const challenge = { 'www-authenticate': 'Basic realm="dsh-password-login", charset="UTF-8"' };
        const candidate = basicPassword(req.headers);
        if (candidate === undefined) {
            res.writeHead(401, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...challenge });
            res.end('authentication required\n');
            return;
        }
        await deps.limiter.beforeAttempt();
        if (!verifyPassword(candidate, config.password)) {
            deps.limiter.onFailure();
            res.writeHead(401, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...challenge });
            res.end('invalid password\n');
            return;
        }
        deps.limiter.onSuccess();
        const minted = mintFor(deps, req);
        if (minted === undefined) {
            res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
            res.end('mint unavailable\n');
            return;
        }
        res.writeHead(303, { 'cache-control': 'no-store', location: '/', 'set-cookie': minted.setCookie });
        res.end();
    };
    /** Panel face: existence-only status behind official admission. */
    const status = async (req, res) => {
        if (!requireMethod(req, res, 'GET'))
            return;
        const admission = deps.admit(req);
        if (admission.rejection !== undefined) {
            res.writeHead(admission.rejection, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
            res.end(admission.rejection === 401 ? 'unauthorized' : 'forbidden');
            return;
        }
        sendJson(res, 200, { configured: deps.readConfig().password !== '', stale: deps.isStale(), v: PROTOCOL_VERSION });
    };
    /** Panel face: first-set (loopback only) / rotation (current everywhere). */
    const rotate = async (req, res) => {
        if (!requireMethod(req, res, 'POST'))
            return;
        if (!passesBrowserFence(req.headers)) {
            sendJson(res, 403, { ok: false, error: 'forbidden' });
            return;
        }
        let body;
        try {
            body = await readJsonBody(req);
        }
        catch {
            sendJson(res, 400, { ok: false, error: 'body is not JSON' });
            return;
        }
        if (!isRecord(body) || typeof body.next !== 'string') {
            sendJson(res, 400, { ok: false, error: 'next (string) required' });
            return;
        }
        const next = body.next;
        if (!isPasswordSettable(next)) {
            sendJson(res, 400, { ok: false, error: `next must be at least 4 bytes, no CR/LF/NUL` });
            return;
        }
        const config = deps.readConfig();
        if (config.password !== '') {
            const current = isRecord(body) && typeof body.current === 'string' ? body.current : undefined;
            if (current === undefined) {
                sendJson(res, 401, { ok: false, error: 'current password required' });
                return;
            }
            await deps.limiter.beforeAttempt();
            if (!verifyPassword(current, config.password)) {
                deps.limiter.onFailure();
                sendJson(res, 401, { ok: false, error: 'invalid current password' });
                return;
            }
            deps.limiter.onSuccess();
        }
        else if (!isLoopbackRequest(req)) {
            sendJson(res, 403, { ok: false, error: 'first set is loopback only' });
            return;
        }
        const at = deps.now();
        try {
            await deps.persistPassword(next);
            await deps.onRotated(passwordFingerprint(next), at);
        }
        catch (error) {
            sendJson(res, 500, { ok: false, error: 'rotation failed: ' + String(error) });
            return;
        }
        const minted = mintCookie(req.headers, deps.secret(), deps.readConfig().cookieDays, deps.hostMaxAgeMs(), at);
        if (minted !== undefined) {
            sendJson(res, 200, { ok: true, v: PROTOCOL_VERSION }, { 'set-cookie': minted.setCookie });
            return;
        }
        sendJson(res, 200, { ok: true, v: PROTOCOL_VERSION });
    };
    /** Panel face: revoke every issued session without touching the password
     * (#512 用户裁决 2026-10-05，恢复被 #21 砍掉的按钮——yml 热改不撤票的补位)。
     * admit 门（需已认证会话）；成功即全员下线，调用者经自动换票保持在线。 */
    const revoke = async (req, res) => {
        if (!requireMethod(req, res, 'POST'))
            return;
        const admission = deps.admit(req);
        if (admission.rejection !== undefined) {
            res.writeHead(admission.rejection, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
            res.end(admission.rejection === 401 ? 'unauthorized' : 'forbidden');
            return;
        }
        const at = deps.now();
        try {
            await deps.onRevoked(at);
        }
        catch (error) {
            sendJson(res, 500, { ok: false, error: 'revocation failed: ' + String(error) });
            return;
        }
        const minted = mintCookie(req.headers, deps.secret(), deps.readConfig().cookieDays, deps.hostMaxAgeMs(), at);
        if (minted !== undefined) {
            sendJson(res, 200, { ok: true, v: PROTOCOL_VERSION }, { 'set-cookie': minted.setCookie });
            return;
        }
        sendJson(res, 200, { ok: true, v: PROTOCOL_VERSION });
    };
    return { session, login, status, rotate, revoke };
}
//# sourceMappingURL=routes.js.map