import { createHash, timingSafeEqual } from 'node:crypto';
import { encodeBase64Url } from "./cookie.js";
/** Spec §C: minimum 4 bytes, exact bytes (no trim). */
export const MIN_PASSWORD_BYTES = 4;
/** Wire safety: passwords travel in raw Authorization headers (Bearer) and
 * cannot contain control bytes that break HTTP framing. This is a transport
 * constraint, not a strength policy. */
const UNSAFE_PASSWORD_BYTES = /[\r\n\0]/u;
export function isPasswordSettable(password) {
    return Buffer.byteLength(password, 'utf8') >= MIN_PASSWORD_BYTES && !UNSAFE_PASSWORD_BYTES.test(password);
}
/** Existence-only fingerprint used for epoch persistence (never the password).
 * Empty password → empty sentinel (no revocation semantics). */
export function passwordFingerprint(password) {
    if (password === '')
        return '';
    return encodeBase64Url(createHash('sha256').update(password, 'utf8').digest());
}
/**
 * Constant-time password comparison: SHA-256 both sides first so candidate
 * length never leaks through timingSafeEqual short-circuits.
 */
export function verifyPassword(candidate, actual) {
    if (actual.length === 0)
        return false;
    const a = createHash('sha256').update(candidate, 'utf8').digest();
    const b = createHash('sha256').update(actual, 'utf8').digest();
    return timingSafeEqual(a, b);
}
/** Spec §C: after 5 consecutive failures every attempt is forced through a
 * 1s delay; no permanent lockout. In-process counter, reset on success. */
export function createRateLimiter(options = {}) {
    const threshold = options.threshold ?? 5;
    const delayMs = options.delayMs ?? 1000;
    const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    let consecutiveFailures = 0;
    return {
        async beforeAttempt() {
            if (consecutiveFailures >= threshold)
                await sleep(delayMs);
        },
        onFailure() {
            consecutiveFailures += 1;
        },
        onSuccess() {
            consecutiveFailures = 0;
        },
        failures() {
            return consecutiveFailures;
        }
    };
}
//# sourceMappingURL=password.js.map