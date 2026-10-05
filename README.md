# dsh-password-login

DSH（DeepSeek Harness 0.2.0 线）密码登录插件：**会话铸造端点**（回环免密[未设密码态]或密码验证后直接发合法 Cookie）、**Basic 弹窗书签入口**（浏览器原生单密码对话框，从此不再翻 journal 捞 token）、**密码生命周期管理**（设置面板首设/热改，轮换即全员下线含浏览器）。

设计权威：oc-beacon 仓库 `docs/specs/2026-10-05-512-dsh-password-login-design.md`（backlog #512）。本 README 只做安装与使用速览。

## 安装

```bash
# GitHub（发布后）
dsh plugin --profile web add github:<owner>/dsh-password-login

# 本地开发
dsh plugin --profile web add /path/to/dsh-password-login
```

包内 `dsh.bundle.patch` 清单把插件自动 reconcile 进 profile 的 bundle 层；客户端产物（`lib/client.js`）已提交，目标机无需构建链。安装后重启 `dsh web`。

## 使用

| 端点 | 面 | 语义 |
|---|---|---|
| `GET /plugins/dsh-password-login/session` | 机器（app/curl） | 铸票。未设密码：仅回环对端免密；已设密码：任何对端须 `Authorization: Bearer <密码>`。成功 `200 {ok,v,stale?}` + Set-Cookie |
| `GET /plugins/dsh-password-login/login` | 浏览器书签 | 已设密码：401 Basic challenge → 浏览器原生弹窗（用户名忽略）→ 验密铸票 303 回 `/`；未设密码：回环铸票 / 非回环 403 |
| `GET /plugins/dsh-password-login/status` | 面板 | 已认证会话 → `{configured, stale, v}` |
| `POST /plugins/dsh-password-login/rotate` | 面板 | JSON `{current?, next}`。首设限回环；改密须 current。成功自动铸新票（改密者在线，其余全员下线） |
| `POST /plugins/dsh-password-login/revoke` | 面板 | 已认证会话 → **回收所有已发会话（不改密码、不动指纹、不自动换票）——绝对全员下线，含点击者本人**，之后经书签重登；未设密码态同样生效且撤销跨纯重启保持（用户裁决 2026-10-05 恢复按钮 + 同日二次裁决绝对语义） |

- **设置面板**：dsh 设置 → 内置插件 → 「登录密码」页签（UI 全部为宿主供给的 dsh 原语，无第三方组件）。
- **配置**（profile 条目 `dsh-password-login`）：
  - `enabled`（默认 true，boot 期生效——改后重启）
  - `password`（secret 角色；`DSH_PASSWORD_LOGIN_PASSWORD` 环境变量为初始默认）
  - `cookieDays`（默认 7，会被宿主 `cookieMaxAgeDays` 上限钳制）
- **忘密恢复**：yml/环境变量改配置 + 重启（指纹不匹配 → 以启动时间为 epoch，新密码生效 + 全员下线一次）。
- **yml 直改的实测语义**（0.2.0-rc.2 user-patch watcher 热重载，修正 spec §G「仅启动期生效」假设）：运行中手改 yml 的密码**即时生效**（新密码马上可登录、旧密码立即失效），但**不撤销已发会话**（epoch 只经 /rotate 与重启推进）——想热踢人走面板轮换；yml 改密想踢人须重启。

## 开发

```bash
pnpm install && pnpm approve-builds esbuild
pnpm typecheck     # tsc --noEmit（src + tests）
pnpm test          # vitest run（56 单测）
pnpm build         # 宿主 tsc + 客户端 esbuild bundle
bash e2e/run-e2e.sh        # 本地五阶段 E2E（真实 dsh，40 断言）
bash e2e/docker/run.sh     # docker 非回环对端矩阵（12 断言）
```

E2E 前置：本机 `dsh`（0.2.0-rc.2）与 docker daemon。隔离 `DSH_HOME`，不碰真实 profile。

## 兼容性

- 只保 dsh **0.2.0 线**（宿主 E2E 锚定 0.2.0-rc.2）；不做 0.1.x 兼容层。
- 铸票格式随官方 `dsh-client-connection` v1（payload 版本位）；启动金丝雀自检漂移——漂移时端点回 `stale:true` 且撤销自禁用，消费者回落官方 token 流，绝不锁死。
- JSON 响应只增不改（`v` 字段协商）；破坏性变更走并行路由。
