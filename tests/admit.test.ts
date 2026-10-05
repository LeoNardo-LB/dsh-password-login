import { describe, expect, it } from 'vitest'
import { installRevocation, type AdmitFn, type AdmitHolder } from '../src/admit.ts'

const PEER = { rejection: undefined }
const ADMIT: { peer: unknown } = { peer: PEER }

function makeHolder(): AdmitHolder & { calls: unknown[] } {
  const calls: unknown[] = []
  const holder = {
    calls,
    admit: ((request: unknown) => {
      calls.push(request)
      return ADMIT
    }) as AdmitFn
  }
  return holder as AdmitHolder & { calls: unknown[] }
}

describe('installRevocation', () => {
  it('keeps the original verdict on rejection', () => {
    const holder = { admit: (() => ({ rejection: 401 })) as AdmitFn }
    installRevocation(holder, () => 1, () => 100, () => true)
    expect(holder.admit({})).toEqual({ rejection: 401 })
  })

  it('revokes cookies issued strictly before the epoch', () => {
    const holder = makeHolder()
    installRevocation(holder, () => 50, () => 100, () => true)
    expect(holder.admit({})).toEqual({ rejection: 401 })
  })

  it('admits cookies issued at/after the epoch', () => {
    const holder = makeHolder()
    installRevocation(holder, () => 100, () => 100, () => true)
    expect(holder.admit({})).toEqual({ peer: PEER })
    expect(holder.calls).toHaveLength(1) // original ran exactly once, first
  })

  it('is a pass-through when inactive, without a cookie, or on peek errors', () => {
    const holder = makeHolder()
    installRevocation(holder, () => 50, () => 100, () => false)
    expect(holder.admit({})).toEqual({ peer: PEER })

    const holder2 = makeHolder()
    installRevocation(holder2, () => undefined, () => 100, () => true)
    expect(holder2.admit({})).toEqual({ peer: PEER })

    const holder3 = makeHolder()
    installRevocation(holder3, () => { throw new Error('peek') }, () => 100, () => true)
    expect(holder3.admit({})).toEqual({ peer: PEER })
  })

  it('restores the original on dispose and chains with later wrappers', () => {
    const holder = makeHolder()
    const original = holder.admit
    const restore = installRevocation(holder, () => 50, () => 100, () => true)
    const outerBefore = holder.admit
    const restoreOuter = installRevocation(holder, () => undefined, () => 0, () => true)
    expect(outerBefore).not.toBe(holder.admit)
    restoreOuter()
    restore()
    expect(holder.admit).toBe(original)
  })
})
