import { describe, expect, it } from 'vitest'
import { shouldRedirectToLogin } from '../src/rootredirect.ts'

describe('shouldRedirectToLogin (root bounce gate)', () => {
  it('bounces unauthenticated plain index requests', () => {
    expect(shouldRedirectToLogin('/', false, false)).toBe(true)
    expect(shouldRedirectToLogin(undefined, false, false)).toBe(true)
  })

  it('never touches the official token exchange flow', () => {
    expect(shouldRedirectToLogin('/?token=abc', false, false)).toBe(false)
    expect(shouldRedirectToLogin('/?x=1&token=abc', false, false)).toBe(false)
  })

  it('leaves authenticated requests to the official path', () => {
    expect(shouldRedirectToLogin('/', true, false)).toBe(false)
  })

  it('stays out of the way on canary drift (avoid 303 loops with dead mints)', () => {
    expect(shouldRedirectToLogin('/', false, true)).toBe(false)
  })
})
