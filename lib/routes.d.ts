import type { IncomingMessage, ServerResponse } from 'node:http';
import { type RateLimiter } from './password.ts';
import { type PasswordLoginConfig } from './types.ts';
export type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;
export interface Admission {
    peer?: unknown;
    rejection?: number;
}
/** Everything the HTTP face needs, injected for purity (keepalive pattern). */
export interface RouteDeps {
    readConfig(): PasswordLoginConfig;
    now(): number;
    /** Live browser-session signing secret (from the host's BrowserAuth). */
    secret(): Buffer | undefined;
    /** Host cookieMaxAgeDays ceiling in milliseconds. */
    hostMaxAgeMs(): number;
    /** Canary verdict: our mint format still matches the live validator. */
    isStale(): boolean;
    limiter: RateLimiter;
    /** Official admission (fence + cookie auth) for panel endpoints. */
    admit(request: IncomingMessage): Admission;
    /** Persist a new password through the settings service (hot). */
    persistPassword(next: string): Promise<void>;
    /** Advance the revocation epoch after a successful rotation. */
    onRotated(fingerprint: string, at: number): Promise<void>;
}
export declare function createRoutes(deps: RouteDeps): {
    session: Handler;
    login: Handler;
    status: Handler;
    rotate: Handler;
};
//# sourceMappingURL=routes.d.ts.map