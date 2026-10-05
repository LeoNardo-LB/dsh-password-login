import { z as zod } from 'zod';
/**
 * Durable epoch state (spec §F): {epoch, passwordFingerprint} under the
 * plugin's storage domain global slot. Survives restarts so a pure restart
 * (fingerprint match) never falsely revokes; a fingerprint mismatch (config
 * channel password change) resets the epoch to boot time.
 */
export declare const passwordLoginDomain: {
    name: string;
    version: number;
    global: {
        schema: zod.ZodObject<{
            epoch: zod.ZodNumber;
            passwordFingerprint: zod.ZodString;
        }, zod.core.$strip>;
        initial: {
            epoch: number;
            passwordFingerprint: string;
        };
    };
    tables: {};
};
//# sourceMappingURL=domain.d.ts.map