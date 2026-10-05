import type { Context } from '@deepseek-ai/cordis';
import { Config } from './config.ts';
import { type PasswordLoginConfig } from './types.ts';
export declare const name = "dsh-password-login";
/** Host services required before activation (fail-loud when missing). */
export declare const inject: string[];
export { Config };
export declare function apply(ctx: Context, config?: Partial<PasswordLoginConfig>): void;
//# sourceMappingURL=index.d.ts.map