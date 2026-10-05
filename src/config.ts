import z from '@deepseek-ai/schemastery'
import type { PasswordLoginConfig } from './types.ts'

/**
 * Plugin config schema. The root is volatile: password/cookieDays are
 * hot-editable through the settings service (the panel's /rotate writes via
 * settings.update). `enabled` is boot-time only — route (un)registration at
 * runtime is not worth it (spec §G); a runtime flip takes effect on restart.
 * DSH_PASSWORD_LOGIN_PASSWORD seeds the initial default (schema default;
 * hand-editing the yml applies at boot only).
 */
export const Config = z.object({
  enabled: z.boolean().default(true),
  password: z.string().role('secret').default(process.env.DSH_PASSWORD_LOGIN_PASSWORD ?? ''),
  cookieDays: z.number().min(1).max(30).default(7)
}).volatile() as unknown as z<PasswordLoginConfig>
