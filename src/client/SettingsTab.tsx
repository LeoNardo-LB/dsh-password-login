/**
 * dsh-password-login settings tab: password lifecycle over dsh UI
 * primitives only (vendored types, no third-party UI — user ruling
 * 2026-10-05). One availability gate: when the host does not serve the
 * primitives module the whole tab renders one error state.
 */
import * as React from 'react'
import { P, U } from './primitives.ts'
import { injectStyles } from './styles.ts'
import type { PasswordStore, PasswordUiState } from './store.ts'

export interface SettingsTabProps {
  state: PasswordUiState
  store: PasswordStore
}

export function SettingsTab(props: SettingsTabProps): React.ReactNode {
  injectStyles()
  const { state, store } = props
  const [current, setCurrent] = React.useState('')
  const [next, setNext] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const configured = state.status?.configured === true
  const stale = state.status?.stale === true

  if (P === null) {
    return (
      <div className="pl-root">
        <div className="pl-banner pl-banner-error">宿主未供给 dsh UI 原语模块，面板不可用；密码仍可经 /plugins/dsh-password-login/login 与 /rotate 端点管理。</div>
      </div>
    )
  }

  const submit = (): void => {
    if (next !== confirm) {
      return
    }
    const input = configured ? { current, next } : { next }
    void store.rotate(input).then((ok) => {
      if (ok) {
        setCurrent('')
        setNext('')
        setConfirm('')
      }
    })
  }

  return (
    <div className="pl-root" data-pl="root">
      <div className="pl-header">
        <P.StateDot state={configured ? 'done' : 'warning'} size={10} />
        <span className="pl-title">登录密码</span>
        <span className="pl-caption">{configured ? '已配置：任何对端（含本机）凭密码进入' : '未配置：仅回环对端免密铸造'}</span>
      </div>

      {stale && (
        <div className="pl-banner pl-banner-warn">
          铸票格式金丝雀漂移（stale）：本插件铸的 Cookie 可能不被当前宿主接受，撤销功能已自禁用。请升级插件或使用官方 token 流。
        </div>
      )}
      {state.unauthorized && <div className="pl-banner pl-banner-warn">当前会话未认证，请先经登录入口认证后刷新。</div>}
      {state.message !== undefined && <div className={'pl-banner ' + (state.message.kind === 'ok' ? 'pl-banner-ok' : 'pl-banner-error')}>{state.message.text}</div>}

      {!state.unauthorized && (
        <div className="pl-form">
          {configured && (
            <label className="pl-row">
              <span className="pl-label">当前密码</span>
              <U.Input data-pl="current" type="password" autoComplete="current-password" value={current} onChange={(e) => { setCurrent(e.target.value) }} />
            </label>
          )}
          <label className="pl-row">
            <span className="pl-label">新密码</span>
            <U.Input data-pl="next" type="password" autoComplete="new-password" value={next} onChange={(e) => { setNext(e.target.value) }} />
          </label>
          <label className="pl-row">
            <span className="pl-label">确认新密码</span>
            <U.Input data-pl="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value) }} />
          </label>
          <div className="pl-actions">
            <P.Button data-pl="submit" variant="primary" size="sm" disabled={state.busy || next.length === 0 || next !== confirm} onClick={submit}>
              {configured ? '轮换密码（全员下线）' : '设置密码'}
            </P.Button>
            <U.Button data-pl="revoke" variant="outline" size="sm" disabled={state.busy} onClick={() => { void store.revoke() }}>
              回收所有会话
            </U.Button>
          </div>
          <div className="pl-hint">
            浏览器登录入口 <code>/plugins/dsh-password-login/login</code> 可加入书签：会话失效后重访即凭浏览器记住的密码无感重铸。
            轮换会立即撤销所有已发会话（含本面板，提交后会自动换发新票）；「回收所有会话」不改密码、绝对全员下线（含本面板），点击后需经登录书签重新进入。
          </div>
        </div>
      )}
    </div>
  )
}
