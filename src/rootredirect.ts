/**
 * Root-index bounce (#512 用户裁决 2026-10-05)：无 token 且无有效会话的 index
 * 请求劫持为 303 → 书签登录页，取代官方 401 白页——回收/过期后重访主页的
 * 「缓存空壳」与「白页」两种困惑一并消除。token 交换流与已认证请求原样交还
 * 官方 authorizeIndex；金丝雀漂移（stale）时铸票不可信，重定向会造成
 * 303 死循环，此时退回官方 401。
 */

export const LOGIN_PATH = '/plugins/dsh-password-login/login'

export function shouldRedirectToLogin(url: string | undefined, isAuthenticated: boolean, stale: boolean): boolean {
  if (stale) return false
  try {
    const parsed = new URL(url ?? '/', 'http://dsh.invalid')
    if (parsed.searchParams.has('token')) return false
  } catch {
    return false
  }
  return !isAuthenticated
}
