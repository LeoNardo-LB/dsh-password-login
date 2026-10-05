import { describe, expect, it } from 'vitest'
import { resolveEpoch, revocationActive } from '../src/epoch.ts'

describe('resolveEpoch (boot-time)', () => {
  const now = 9_000_000

  it('no password → no epoch', () => {
    expect(resolveEpoch({ epoch: 5_000, passwordFingerprint: 'aa' }, '', now)).toEqual({ epoch: 0, passwordFingerprint: '' })
  })

  it('fingerprint match → keep stored epoch (pure restart never revokes)', () => {
    const stored = { epoch: 5_000, passwordFingerprint: 'aa' }
    expect(resolveEpoch(stored, 'aa', now)).toEqual(stored)
  })

  it('fingerprint mismatch → epoch resets to boot time (config-channel change revokes once)', () => {
    expect(resolveEpoch({ epoch: 5_000, passwordFingerprint: 'aa' }, 'bb', now)).toEqual({ epoch: now, passwordFingerprint: 'bb' })
    expect(resolveEpoch(undefined, 'bb', now)).toEqual({ epoch: now, passwordFingerprint: 'bb' })
  })

  it('revocationActive follows the fingerprint', () => {
    expect(revocationActive('')).toBe(false)
    expect(revocationActive('aa')).toBe(true)
  })
})
