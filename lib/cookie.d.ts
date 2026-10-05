/**
 * Browser-session cookie minting, reimplemented from the official
 * @deepseek-ai/dsh-client-connection v1 format (0.2.0-rc.2, lib/index.js
 * encodeCookie/cookieName/sessionCookie/requestAuthority — quoted in the
 * #512 spec §E/§J anchors). Format drift is detected at boot by the
 * startup canary (our mint vs the live BrowserAuth.isAuthenticated), so a
 * future host change degrades to `stale: true` instead of minting
 * dead cookies silently.
 */
export declare const DAY_MS: number;
export declare const COOKIE_PREFIX = "dsh-auth-";
export declare const COOKIE_PAYLOAD_VERSION = 1;
/** Minimal header map both node requests and canary probes satisfy. */
export type HeadersLike = {
    [name: string]: string | undefined;
};
export declare function header(headers: HeadersLike, name: string): string | undefined;
export declare function encodeBase64Url(value: Uint8Array | string): string;
export declare function decodeBase64Url(value: string): Buffer | undefined;
/** Canonical request authority used as the cookie name and signed audience. */
export declare function requestAuthority(headers: HeadersLike): string | undefined;
export declare function cookieName(authority: string): string;
/** Read the exact generated cookie without implementing general Cookie decoding. */
export declare function cookieValue(headerValue: string, name: string): string | undefined;
export interface CookiePayload {
    version: number;
    authority: string;
    issuedAt: number;
    expiresAt: number;
}
export declare function encodeCookie(payload: CookiePayload, secret: Buffer): string;
export declare function decodeCookie(value: string, secret: Buffer): CookiePayload | undefined;
/** Serialize the fixed browser-session attributes, byte-identical to the host's. */
export declare function sessionCookie(name: string, value: string, expiresAt: number, maxAgeSeconds: number): string;
export interface MintResult {
    authority: string;
    cookieName: string;
    setCookie: string;
    issuedAt: number;
    expiresAt: number;
}
/**
 * Mint one browser-session cookie for the request's authority. The payload
 * lifetime is clamped to the host's cookieMaxAgeDays (the host's
 * isAuthenticated rejects anything longer); undefined when the authority
 * cannot be derived or the secret is absent.
 */
export declare function mintCookie(headers: HeadersLike, secret: Buffer | undefined, days: number, hostMaxAgeMs: number, now: number): MintResult | undefined;
//# sourceMappingURL=cookie.d.ts.map