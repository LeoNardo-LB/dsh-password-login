/**
 * The single trust anchor (spec §D): `req.socket.remoteAddress` as reported
 * by the kernel. Host headers are application-layer strings and are never
 * used for trust decisions.
 */
export declare function isLoopbackPeer(remoteAddress: string | undefined): boolean;
//# sourceMappingURL=loopback.d.ts.map