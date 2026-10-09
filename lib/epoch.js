/**
 * Epoch state machine for cookie revocation (spec §F). The epoch is a
 * millisecond timestamp; every cookie minted strictly before it is dead.
 * The password fingerprint lets a pure restart (password untouched) keep
 * the old epoch, while a password that changed through config/yml resets
 * the epoch to boot time — revoking everyone exactly once.
 */
/** Resolve the boot-time epoch from the persisted state and the live password. */
export function resolveEpoch(stored, currentFingerprint, now) {
    if (currentFingerprint === '') {
        // unset→unset pure restart keeps a prior unset-state revocation armed
        // (密码缺席时的 /revoke 不被重启洗掉)；set→unset 转换重置为 0（撤权语义
        // 归密码移除本身，见 README）。
        if (stored !== undefined && stored.passwordFingerprint === '' && Number.isSafeInteger(stored.epoch)) {
            return { epoch: stored.epoch, passwordFingerprint: '' };
        }
        return { epoch: 0, passwordFingerprint: '' };
    }
    if (stored !== undefined && stored.passwordFingerprint === currentFingerprint && Number.isSafeInteger(stored.epoch)) {
        return stored;
    }
    return { epoch: now, passwordFingerprint: currentFingerprint };
}
/** Whether revocation semantics apply (a password is configured). */
export function revocationActive(fingerprint) {
    return fingerprint !== '';
}
/**
 * 热改检测（#512 均匀不变量：密码经任何通道变化 = 全员下线）。
 * 输入 epoch 当前已反映的指纹与热读的活密码，当且仅当二者不一致时返回
 * 应推进到的新指纹（含 '' = 移除）；一致返回 null（无动作——/rotate 自身
 * 推进后 fingerprint.value 已更新，watch 重入时在此归零，不会双重推进）。
 */
export function hotPasswordTransition(currentFingerprint, livePassword, fingerprintOf) {
    const next = livePassword !== '' ? fingerprintOf(livePassword) : '';
    return next !== currentFingerprint ? next : null;
}
//# sourceMappingURL=epoch.js.map