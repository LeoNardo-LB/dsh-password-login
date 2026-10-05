import { header } from "./cookie.js";
/**
 * Browser hardening fence, applied uniformly to every plugin endpoint
 * (spec §B): a request that carries browser cross-site markers is rejected
 * before any password logic runs. Native app requests carry none of these
 * headers and pass; the settings panel is same-origin by construction.
 * This is NOT a trust decision — trust is remoteAddress/password (§D).
 */
export function passesBrowserFence(headers) {
    if (header(headers, 'sec-fetch-site') === 'cross-site')
        return false;
    const origin = header(headers, 'origin');
    if (origin === undefined)
        return true;
    const host = header(headers, 'host');
    if (host === undefined)
        return false;
    try {
        return new URL(origin).host === new URL(`http://${host}`).host;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=hardening.js.map