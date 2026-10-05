import { describe, expect, it } from 'vitest'
import { isLoopbackPeer } from '../src/loopback.ts'

describe('isLoopbackPeer (kernel remoteAddress)', () => {
  it('accepts the loopback family', () => {
    expect(isLoopbackPeer('127.0.0.1')).toBe(true)
    expect(isLoopbackPeer('127.0.0.99')).toBe(true)
    expect(isLoopbackPeer('127.255.255.255')).toBe(true)
    expect(isLoopbackPeer('::1')).toBe(true)
    expect(isLoopbackPeer('::ffff:127.0.0.1')).toBe(true)
  })
  it('rejects everything else — including private and CGNAT ranges', () => {
    expect(isLoopbackPeer('192.168.1.5')).toBe(false)
    expect(isLoopbackPeer('10.0.0.2')).toBe(false)
    expect(isLoopbackPeer('100.64.0.1')).toBe(false) // tailscale-ish CGNAT
    expect(isLoopbackPeer('172.17.0.1')).toBe(false) // docker bridge
    expect(isLoopbackPeer('::ffff:192.168.1.5')).toBe(false)
    expect(isLoopbackPeer('fe80::1')).toBe(false)
    expect(isLoopbackPeer('localhost')).toBe(false) // never a kernel-reported address
    expect(isLoopbackPeer('')).toBe(false)
    expect(isLoopbackPeer(undefined)).toBe(false)
  })
})
