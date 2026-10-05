/**
 * Runtime stylesheet injection following the host theme pattern: one
 * <style data-plugin-css="dsh-password-login"> tag, idempotent across
 * plugin reloads. All values ride --dsw-alias-* tokens.
 */
import cssText from './password-tab.css'

const STYLE_TAG = 'dsh-password-login'

export function injectStyles(): void {
  if (typeof document === 'undefined') return
  const selector = 'style[data-plugin-css=' + JSON.stringify(STYLE_TAG) + ']'
  if (document.querySelector(selector) !== null) return
  const style = document.createElement('style')
  style.setAttribute('data-plugin-css', STYLE_TAG)
  style.textContent = cssText
  document.head.append(style)
}
