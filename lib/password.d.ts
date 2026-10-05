/** Spec §C: minimum 4 bytes, exact bytes (no trim). */
export declare const MIN_PASSWORD_BYTES = 4;
export declare function isPasswordSettable(password: string): boolean;
/** Existence-only fingerprint used for epoch persistence (never the password).
 * Empty password → empty sentinel (no revocation semantics). */
export declare function passwordFingerprint(password: string): string;
/**
 * Constant-time password comparison: SHA-256 both sides first so candidate
 * length never leaks through timingSafeEqual short-circuits.
 */
export declare function verifyPassword(candidate: string, actual: string): boolean;
export interface RateLimiter {
    /** Await before evaluating an attempt once the threshold is exceeded. */
    beforeAttempt(): Promise<void>;
    onFailure(): void;
    onSuccess(): void;
    failures(): number;
}
export interface RateLimiterOptions {
    threshold?: number;
    delayMs?: number;
    sleep?: (ms: number) => Promise<void>;
}
/** Spec §C: after 5 consecutive failures every attempt is forced through a
 * 1s delay; no permanent lockout. In-process counter, reset on success. */
export declare function createRateLimiter(options?: RateLimiterOptions): RateLimiter;
//# sourceMappingURL=password.d.ts.map