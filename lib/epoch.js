/**
 * Epoch state machine for cookie revocation (spec §F). The epoch is a
 * millisecond timestamp; every cookie minted strictly before it is dead.
 * The password fingerprint lets a pure restart (password untouched) keep
 * the old epoch, while a password that changed through config/yml resets
 * the epoch to boot time — revoking everyone exactly once.
 */
/** Resolve the boot-time epoch from the persisted state and the live password. */
export function resolveEpoch(stored, currentFingerprint, now) {
    if (currentFingerprint === '')
        return { epoch: 0, passwordFingerprint: '' };
    if (stored !== undefined && stored.passwordFingerprint === currentFingerprint && Number.isSafeInteger(stored.epoch)) {
        return stored;
    }
    return { epoch: now, passwordFingerprint: currentFingerprint };
}
/** Whether revocation semantics apply (a password is configured). */
export function revocationActive(fingerprint) {
    return fingerprint !== '';
}
//# sourceMappingURL=epoch.js.map