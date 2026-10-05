import { defineDomain } from '@deepseek-ai/dsh-storage-domain'
import { z as zod } from 'zod'
import type { EpochState } from './epoch.ts'

/**
 * Durable epoch state (spec §F): {epoch, passwordFingerprint} under the
 * plugin's storage domain global slot. Survives restarts so a pure restart
 * (fingerprint match) never falsely revokes; a fingerprint mismatch (config
 * channel password change) resets the epoch to boot time.
 */
export const passwordLoginDomain = defineDomain({
  name: 'dsh_password_login',
  version: 1,
  global: {
    schema: zod.object({
      epoch: zod.number(),
      passwordFingerprint: zod.string()
    }),
    initial: { epoch: 0, passwordFingerprint: '' } satisfies EpochState
  },
  tables: {}
})
