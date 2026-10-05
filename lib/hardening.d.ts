import { type HeadersLike } from './cookie.ts';
/**
 * Browser hardening fence, applied uniformly to every plugin endpoint
 * (spec §B): a request that carries browser cross-site markers is rejected
 * before any password logic runs. Native app requests carry none of these
 * headers and pass; the settings panel is same-origin by construction.
 * This is NOT a trust decision — trust is remoteAddress/password (§D).
 */
export declare function passesBrowserFence(headers: HeadersLike): boolean;
//# sourceMappingURL=hardening.d.ts.map