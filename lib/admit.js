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
export function installRevocation(holder, peekIssuedAt, getEpoch, active) {
    const original = holder.admit;
    const wrapped = (request) => {
        const result = original.call(holder, request);
        try {
            if (result.rejection !== undefined || !active())
                return result;
            const issuedAt = peekIssuedAt(request);
            if (issuedAt !== undefined && issuedAt < getEpoch())
                return { rejection: 401 };
        }
        catch {
            // Fail-open: never lock the operator out of a wrapper-layer bug.
        }
        return result;
    };
    holder.admit = wrapped;
    return () => {
        if (holder.admit === wrapped)
            holder.admit = original;
    };
}
//# sourceMappingURL=admit.js.map