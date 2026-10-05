/** Protocol and config shapes shared by the host half and tests. */
/** Response contract version (`v` field; responses only ever add fields). */
export declare const PROTOCOL_VERSION = 1;
/** All plugin routes live under this prefix on the host web server. */
export declare const ROUTE_PREFIX = "/plugins/dsh-password-login";
export interface PasswordLoginConfig {
    /** Boot-time switch: false registers nothing (restart to take effect). */
    enabled: boolean;
    /** Empty string = unset (loopback free-mint mode). Secret role in settings. */
    password: string;
    /** Cookie lifetime in days; clamped to the host's cookieMaxAgeDays at mint. */
    cookieDays: number;
}
//# sourceMappingURL=types.d.ts.map