/**
 * Browser-session cookie minting, reimplemented from the official
 * @deepseek-ai/dsh-client-connection v1 format (0.2.0-rc.2, lib/index.js
 * encodeCookie/cookieName/sessionCookie/requestAuthority — quoted in the
 * #512 spec §E/§J anchors). Format drift is detected at boot by the
 * startup canary (our mint vs the live BrowserAuth.isAuthenticated), so a
 * future host change degrades to `stale: true` instead of minting
 * dead cookies silently.
 */
export const DAY_MS = 24 * 60 * 60 * 1000;
export const COOKIE_PREFIX = 'dsh-auth-';
export const COOKIE_PAYLOAD_VERSION = 1;
export function header(headers, name) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return typeof value === 'string' ? value : undefined;
}
export function encodeBase64Url(value) {
    return Buffer.from(value).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;
export function decodeBase64Url(value) {
    if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1)
        return undefined;
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const decoded = Buffer.from(value.replaceAll('-', '+').replaceAll('_', '/') + padding, 'base64');
    return encodeBase64Url(decoded) === value ? decoded : undefined;
}
/** Canonical request authority used as the cookie name and signed audience. */
export function requestAuthority(headers) {
    const host = header(headers, 'host');
    if (host === undefined)
        return undefined;
    try {
        return new URL(`http://${host}`).host;
    }
    catch {
        return undefined;
    }
}
export function cookieName(authority) {
    return COOKIE_PREFIX + encodeBase64Url(createHash('sha256').update(authority).digest());
}
/** Read the exact generated cookie without implementing general Cookie decoding. */
export function cookieValue(headerValue, name) {
    for (const segment of headerValue.split(';')) {
        const at = segment.indexOf('=');
        if (at === -1 || segment.slice(0, at).trim() !== name)
            continue;
        return segment.slice(at + 1).trim();
    }
    return undefined;
}
function signature(secret, body) {
    return createHmac('sha256', secret).update(body).digest();
}
export function encodeCookie(payload, secret) {
    const body = encodeBase64Url(Buffer.from(JSON.stringify(payload), 'utf8'));
    return `v1.${body}.${encodeBase64Url(signature(secret, body))}`;
}
export function decodeCookie(value, secret) {
    const parts = value.split('.');
    const [version, body, encodedSignature] = parts;
    if (parts.length !== 3 || version !== 'v1' || body === undefined || encodedSignature === undefined)
        return undefined;
    const actualSignature = decodeBase64Url(encodedSignature);
    if (actualSignature === undefined)
        return undefined;
    const expectedSignature = signature(secret, body);
    if (actualSignature.byteLength !== expectedSignature.byteLength || !timingSafeEqual(actualSignature, expectedSignature))
        return undefined;
    let decoded;
    try {
        const bodyBytes = decodeBase64Url(body);
        if (bodyBytes === undefined)
            return undefined;
        decoded = JSON.parse(bodyBytes.toString('utf8'));
    }
    catch {
        return undefined;
    }
    if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)
        || decoded.version !== COOKIE_PAYLOAD_VERSION
        || typeof decoded.authority !== 'string'
        || !Number.isSafeInteger(decoded.issuedAt)
        || !Number.isSafeInteger(decoded.expiresAt))
        return undefined;
    return decoded;
}
/** Serialize the fixed browser-session attributes, byte-identical to the host's. */
export function sessionCookie(name, value, expiresAt, maxAgeSeconds) {
    return `${name}=${value}; Max-Age=${String(maxAgeSeconds)}; Path=/; Expires=${new Date(expiresAt).toUTCString()}; HttpOnly; SameSite=Strict`;
}
/**
 * Mint one browser-session cookie for the request's authority. The payload
 * lifetime is clamped to the host's cookieMaxAgeDays (the host's
 * isAuthenticated rejects anything longer); undefined when the authority
 * cannot be derived or the secret is absent.
 */
export function mintCookie(headers, secret, days, hostMaxAgeMs, now) {
    if (secret === undefined || secret.byteLength === 0)
        return undefined;
    const authority = requestAuthority(headers);
    if (authority === undefined)
        return undefined;
    const lifetimeMs = Math.max(1000, Math.min(days * DAY_MS, hostMaxAgeMs));
    const issuedAt = now;
    const expiresAt = issuedAt + lifetimeMs;
    const value = encodeCookie({ version: COOKIE_PAYLOAD_VERSION, authority, issuedAt, expiresAt }, secret);
    const name = cookieName(authority);
    return { authority, cookieName: name, setCookie: sessionCookie(name, value, expiresAt, Math.floor(lifetimeMs / 1000)), issuedAt, expiresAt };
}
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
//# sourceMappingURL=cookie.js.map