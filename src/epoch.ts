/**
 * Epoch state machine for cookie revocation (spec §F). The epoch is a
 * millisecond timestamp; every cookie minted strictly before it is dead.
 * The password fingerprint lets a pure restart (password untouched) keep
 * the old epoch, while a password that changed through config/yml resets
 * the epoch to boot time — revoking everyone exactly once.
 */

export interface EpochState {
  epoch: number
  passwordFingerprint: string
}

/** Resolve the boot-time epoch from the persisted state and the live password. */
export function resolveEpoch(stored: EpochState | undefined, currentFingerprint: string, now: number): EpochState {
  if (currentFingerprint === '') {
    // unset→unset pure restart keeps a prior unset-state revocation armed
    // (密码缺席时的 /revoke 不被重启洗掉)；set→unset 转换重置为 0（撤权语义
    // 归密码移除本身，见 README）。
    if (stored !== undefined && stored.passwordFingerprint === '' && Number.isSafeInteger(stored.epoch)) {
      return { epoch: stored.epoch, passwordFingerprint: '' }
    }
    return { epoch: 0, passwordFingerprint: '' }
  }
  if (stored !== undefined && stored.passwordFingerprint === currentFingerprint && Number.isSafeInteger(stored.epoch)) {
    return stored
  }
  return { epoch: now, passwordFingerprint: currentFingerprint }
}

/** Whether revocation semantics apply (a password is configured). */
export function revocationActive(fingerprint: string): boolean {
  return fingerprint !== ''
}
