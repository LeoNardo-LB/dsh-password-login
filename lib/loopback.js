/**
 * The single trust anchor (spec §D): `req.socket.remoteAddress` as reported
 * by the kernel. Host headers are application-layer strings and are never
 * used for trust decisions.
 */
function isLoopbackV4(address) {
    const parts = address.split('.');
    return parts.length === 4 && parts[0] === '127' && parts.every((part) => /^\d{1,3}$/u.test(part));
}
export function isLoopbackPeer(remoteAddress) {
    if (remoteAddress === undefined)
        return false;
    if (remoteAddress === '::1')
        return true;
    if (isLoopbackV4(remoteAddress))
        return true;
    // IPv4-mapped loopback peers (::ffff:127.0.0.1) on dual-stack sockets.
    const mapped = remoteAddress.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/u);
    if (mapped !== null && mapped[1] !== undefined)
        return isLoopbackV4(mapped[1]);
    return false;
}
//# sourceMappingURL=loopback.js.map