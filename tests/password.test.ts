import { describe, expect, it } from 'vitest'
import { createRateLimiter, isPasswordSettable, passwordFingerprint, verifyPassword } from '../src/password.ts'

describe('isPasswordSettable', () => {
  it('requires at least 4 bytes (exact bytes, no trim)', () => {
    expect(isPasswordSettable('abcd')).toBe(true)
    expect(isPasswordSettable('abc')).toBe(false)
    expect(isPasswordSettable(' abc ')).toBe(true)
    expect(isPasswordSettable('啊a')).toBe(true) // 3 + 1 bytes
    expect(isPasswordSettable('啊')).toBe(false) // 3 bytes
  })
  it('rejects control bytes that break HTTP framing', () => {
    expect(isPasswordSettable('ab\r\nc')).toBe(false)
    expect(isPasswordSettable('ab\0c')).toBe(false)
  })
})

describe('verifyPassword', () => {
  it('matches only the exact password', () => {
    expect(verifyPassword('hunter2', 'hunter2')).toBe(true)
    expect(verifyPassword('hunter3', 'hunter2')).toBe(false)
    expect(verifyPassword('Hunter2', 'hunter2')).toBe(false)
    expect(verifyPassword(' hunter2', 'hunter2')).toBe(false)
  })
  it('never accepts against an unset password', () => {
    expect(verifyPassword('', '')).toBe(false)
    expect(verifyPassword('x', '')).toBe(false)
  })
})

describe('passwordFingerprint', () => {
  it('is deterministic and not the password', () => {
    expect(passwordFingerprint('hunter2')).toBe(passwordFingerprint('hunter2'))
    expect(passwordFingerprint('hunter2')).not.toBe(passwordFingerprint('hunter3'))
    expect(passwordFingerprint('hunter2')).not.toContain('hunter2')
    expect(passwordFingerprint('')).toBe('')
  })
})

describe('createRateLimiter', () => {
  it('imposes the delay only after the threshold of consecutive failures', async () => {
    const sleeps: number[] = []
    const limiter = createRateLimiter({ threshold: 5, delayMs: 1000, sleep: async (ms) => { sleeps.push(ms) } })
    for (let i = 0; i < 5; i += 1) {
      await limiter.beforeAttempt()
      expect(sleeps).toHaveLength(0)
      limiter.onFailure()
    }
    await limiter.beforeAttempt()
    expect(sleeps).toEqual([1000])
    await limiter.beforeAttempt()
    expect(sleeps).toEqual([1000, 1000])
  })

  it('resets on success', async () => {
    const sleeps: number[] = []
    const limiter = createRateLimiter({ threshold: 2, delayMs: 50, sleep: async (ms) => { sleeps.push(ms) } })
    limiter.onFailure()
    limiter.onFailure()
    limiter.onSuccess()
    await limiter.beforeAttempt()
    expect(sleeps).toHaveLength(0)
    expect(limiter.failures()).toBe(0)
  })
})
