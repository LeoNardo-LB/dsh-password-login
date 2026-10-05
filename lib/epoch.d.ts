/**
 * Epoch state machine for cookie revocation (spec §F). The epoch is a
 * millisecond timestamp; every cookie minted strictly before it is dead.
 * The password fingerprint lets a pure restart (password untouched) keep
 * the old epoch, while a password that changed through config/yml resets
 * the epoch to boot time — revoking everyone exactly once.
 */
export interface EpochState {
    epoch: number;
    passwordFingerprint: string;
}
/** Resolve the boot-time epoch from the persisted state and the live password. */
export declare function resolveEpoch(stored: EpochState | undefined, currentFingerprint: string, now: number): EpochState;
/** Whether revocation semantics apply (a password is configured). */
export declare function revocationActive(fingerprint: string): boolean;
//# sourceMappingURL=epoch.d.ts.map