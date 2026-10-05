import { createHash, timingSafeEqual } from 'node:crypto'
import { encodeBase64Url } from './cookie.ts'

/** Spec §C: minimum 4 bytes, exact bytes (no trim). */
export const MIN_PASSWORD_BYTES = 4

/** Wire safety: passwords travel in raw Authorization headers (Bearer) and
 * cannot contain control bytes that break HTTP framing. This is a transport
 * constraint, not a strength policy. */
const UNSAFE_PASSWORD_BYTES = /[\r\n\0]/u

export function isPasswordSettable(password: string): boolean {
  return Buffer.byteLength(password, 'utf8') >= MIN_PASSWORD_BYTES && !UNSAFE_PASSWORD_BYTES.test(password)
}

/** Existence-only fingerprint used for epoch persistence (never the password).
 * Empty password → empty sentinel (no revocation semantics). */
export function passwordFingerprint(password: string): string {
  if (password === '') return ''
  return encodeBase64Url(createHash('sha256').update(password, 'utf8').digest())
}

/**
 * Constant-time password comparison: SHA-256 both sides first so candidate
 * length never leaks through timingSafeEqual short-circuits.
 */
export function verifyPassword(candidate: string, actual: string): boolean {
  if (actual.length === 0) return false
  const a = createHash('sha256').update(candidate, 'utf8').digest()
  const b = createHash('sha256').update(actual, 'utf8').digest()
  return timingSafeEqual(a, b)
}

export interface RateLimiter {
  /** Await before evaluating an attempt once the threshold is exceeded. */
  beforeAttempt(): Promise<void>
  onFailure(): void
  onSuccess(): void
  failures(): number
}

export interface RateLimiterOptions {
  threshold?: number
  delayMs?: number
  sleep?: (ms: number) => Promise<void>
}

/** Spec §C: after 5 consecutive failures every attempt is forced through a
 * 1s delay; no permanent lockout. In-process counter, reset on success. */
export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const threshold = options.threshold ?? 5
  const delayMs = options.delayMs ?? 1000
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  let consecutiveFailures = 0
  return {
    async beforeAttempt(): Promise<void> {
      if (consecutiveFailures >= threshold) await sleep(delayMs)
    },
    onFailure(): void {
      consecutiveFailures += 1
    },
    onSuccess(): void {
      consecutiveFailures = 0
    },
    failures(): number {
      return consecutiveFailures
    }
  }
}
