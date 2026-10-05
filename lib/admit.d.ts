import type { Admission } from './routes.ts';
export type AdmitFn = (request: unknown) => Admission;
export interface AdmitHolder {
    admit: AdmitFn;
}
/**
 * Wrap the public ctx.connection.admit — the single entry the /api HTTP
 * route and the gateway's WS upgrade both pass through — so every admitted
 * request additionally proves its cookie was issued at/after the current
 * revocation epoch. Three guarantees (spec §F):
 * - fail-open: any wrapper-layer exception returns the original verdict;
 * - chain-safe: the original function reference is captured at install and
 *   restored on dispose, so later wrappers (ours or others') chain cleanly;
 * - lazy: when `active()` is false (canary drift / no password) the wrapper
 *   is a pass-through.
 */
export declare function installRevocation(holder: AdmitHolder, peekIssuedAt: (request: unknown) => number | undefined, getEpoch: () => number, active: () => boolean): () => void;
//# sourceMappingURL=admit.d.ts.map