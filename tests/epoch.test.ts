import { describe, expect, it } from 'vitest'
import { resolveEpoch, revocationActive, hotPasswordTransition } from '../src/epoch.ts'

describe('resolveEpoch (boot-time)', () => {
  const now = 9_000_000

  it('no password → no epoch', () => {
    expect(resolveEpoch({ epoch: 5_000, passwordFingerprint: 'aa' }, '', now)).toEqual({ epoch: 0, passwordFingerprint: '' })
  })

  it('unset→unset pure restart keeps a prior revoke armed (epoch survives)', () => {
    // 密码缺席态下 /revoke 推进的 epoch 不被重启洗掉
    expect(resolveEpoch({ epoch: 7_000, passwordFingerprint: '' }, '', now)).toEqual({ epoch: 7_000, passwordFingerprint: '' })
    expect(resolveEpoch(undefined, '', now)).toEqual({ epoch: 0, passwordFingerprint: '' })
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

  it('hotPasswordTransition detects any-channel change (incl. removal)', () => {
    const fp = (p: string) => 'fp(' + p + ')'
    // 一致 → 无动作（/rotate 推进后 watch 重入归零，防双重推进）
    expect(hotPasswordTransition('fp(old)', 'old', fp)).toBeNull()
    expect(hotPasswordTransition('', '', fp)).toBeNull()
    // 变更 → 推进到新指纹；移除 → 推进到 ''
    expect(hotPasswordTransition('fp(old)', 'new', fp)).toBe('fp(new)')
    expect(hotPasswordTransition('fp(old)', '', fp)).toBe('')
    expect(hotPasswordTransition('', 'first', fp)).toBe('fp(first)')
  })
})
