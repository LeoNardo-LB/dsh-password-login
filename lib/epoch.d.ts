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
/**
 * 热改检测（#512 均匀不变量：密码经任何通道变化 = 全员下线）。
 * 输入 epoch 当前已反映的指纹与热读的活密码，当且仅当二者不一致时返回
 * 应推进到的新指纹（含 '' = 移除）；一致返回 null（无动作——/rotate 自身
 * 推进后 fingerprint.value 已更新，watch 重入时在此归零，不会双重推进）。
 */
export declare function hotPasswordTransition(currentFingerprint: string, livePassword: string, fingerprintOf: (password: string) => string): string | null;
//# sourceMappingURL=epoch.d.ts.map