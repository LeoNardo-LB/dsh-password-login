# dsh-password-login

DSH（DeepSeek Harness 0.2.0 线）密码登录插件：**会话铸造端点**（回环免密[未设密码态]或密码验证后直接发合法 Cookie）、**Basic 弹窗书签入口**（浏览器原生单密码对话框，从此不再翻日志捞 token）、**密码生命周期管理**（设置面板首设/热改，轮换即全员下线含浏览器）。

设计权威：oc-beacon 仓库 `docs/specs/2026-10-05-512-dsh-password-login-design.md`（backlog #512）。

---

## 一、安装

### 前置条件

- DSH **0.2.0 线**（宿主 E2E 锚定 0.2.0-rc.2；0.1.x 不兼容，勿装）。
- 插件包内已带编译产物（`lib/` 与 `dsh.bundle.patch`），**目标机无需 Node/pnpm 构建链**。

### 方式 A：GitHub 安装（推荐）

```bash
dsh plugin --profile web add github:LeoNardo-LB/dsh-password-login
```

### 方式 B：本地路径安装（开发/内网）

```bash
dsh plugin --profile web add /path/to/dsh-password-login
```

### 方式 C：手动放置

把本仓库整目录拷到 profile 的插件目录（如 `~/.dsh/profiles/web/plugins/dsh-password-login`），确认 `lib/index.js` 存在即可。

### 生效

安装后**重启 `dsh web`**。验证：

```bash
curl -i http://127.0.0.1:3080/plugins/dsh-password-login/status
# 预期 401（未带凭据）——端点在即插件已挂载
```

## 二、首次设置密码

装好后处于**未设密码态**：仅回环对端（127.0.0.1）可免密铸票，局域网/远程一律 403。三选一设密：

1. **设置面板**（推荐）：浏览器打开 `http://<host>:<port>/plugins/dsh-password-login/login`（回环访问直接铸票进入）→ dsh 设置 → 内置插件 → 「登录密码」页签 → 首设密码；
2. **环境变量**（首启默认）：`DSH_PASSWORD_LOGIN_PASSWORD=你的密码`（schema default，改后需重启）；
3. **yml 直写**：profile 配置的 `dsh-password-login.password` 字段（见下方「yml 热改的边界」）。

密码规约：无用户名；最小长度 4；不 trim（精确字节）；比较走 SHA-256 + timingSafeEqual。

## 三、日常使用

- **浏览器**：收藏 `http://<host>:<port>/plugins/dsh-password-login/login`——未登录访问根路径会 303 自动跳到它，弹出浏览器原生密码框（用户名留空即可，只认密码），输入后自动回首页。
- **oc-beacon（Android 客户端）**：新建/编辑服务器时可直接填「访问密码」；忘记填的，连接后在「需要访问凭据」横幅里输入。客户端会自动回落：有效 Cookie → 免密铸票 → 密码铸票 → 旧版令牌。
- **面板**：dsh 设置 → 内置插件 → 「登录密码」。

## 四、密码生命周期：rotate 与 revoke

| 动作 | 效果 | 典型用途 |
|---|---|---|
| **rotate（轮换）** `POST /rotate` `{current, next}` | 改密 + **全员下线**；操作者凭新密码自动换新票在线 | 定期换密；怀疑泄露 |
| **revoke（回收）** `POST /revoke` | **不改密，只踢人**：所有已发会话作废（含点击者本人，不自动换票），密码不变——知道密码的人重新登录即回 | 临时清场；yml 改密后补踢旧会话 |

两者区别一句话：**rotate 换锁，revoke 清场**。

## 五、注意事项（重要）

1. **yml/环境变量热改的边界**（0.2.0-rc.2 实测）：运行中手改 yml 密码**即时生效**（新密立即可用、旧密立即失效），但**不撤销已发会话**——想踢已登录的人，用面板 rotate 或重启。重启时若密码指纹不匹配会自动全员下线一次。
2. **回环≠安全边界**：未设密码态的免密铸票只认回环对端；设密后回环同样要验密（密码是唯一用户面凭据）。
3. **限速**：密码试错与 rotate 失败共用限速器——连续 5 次失败后每次尝试强制 1 秒延迟（无永久锁死，等一会儿即可）。
4. **Cookie 有效期**：`cookieDays` 默认 7 天，且被宿主全局 `cookieMaxAgeDays` 上限钳制——配得再大也可能被压小。
5. **`enabled: false`**：全部端点 404（装了跟没装一样），客户端回落链无感知。此字段 boot 期生效，改后需重启。
6. **忘密恢复**：yml/环境变量改成新密码 + 重启（物理机文件权限即最高权威）。
7. **长连接边界**：撤销检查在 WS 升级时执行——rotate/revoke **不掐已建立的活跃长连接**（活到自然断开）；客户端重连频繁，实际无感。
8. **宿主格式漂移自检**：插件启动时自铸测试票验证 dsh 铸票格式；若漂移，端点响应带 `stale:true` 且撤销功能自禁用（消费者回落官方 token 流），绝不锁死操作者。
9. **安全加固**（全部端点统一）：带 `Origin` 头时必须等于 Host；`sec-fetch-site: cross-site` 一律拒绝——防跨站点探测与 CSRF。
10. **多设备**：密码是共享凭据——rotate 后所有设备（浏览器/app）都需用新密码重登；浏览器可交给密码管理器记住。

## 六、端点速查（v1）

| 端点 | 面 | 语义 |
|---|---|---|
| `GET /plugins/dsh-password-login/session` | 机器（app/curl） | 铸票。未设密码：仅回环免密；已设密码：`Authorization: Bearer <密码>`。成功 `200 {ok,v,stale?}` + Set-Cookie |
| `GET /plugins/dsh-password-login/login` | 浏览器书签 | 已设密码：401 Basic challenge → 原生弹窗（用户名忽略）→ 验密铸票 303 回 `/`；未设密码：回环铸票 / 非回环 403 |
| `GET /plugins/dsh-password-login/status` | 面板 | 已认证会话 → `{configured, stale, v}` |
| `POST /plugins/dsh-password-login/rotate` | 面板 | JSON `{current?, next}`。首设限回环；改密须 current。成功自动铸新票（改密者在线，其余全员下线） |
| `POST /plugins/dsh-password-login/revoke` | 面板 | 回收所有已发会话（不改密/不动指纹/不自动换票）——绝对全员下线含点击者，经书签重登；未设密码态同样生效且跨重启保持 |

配置项（profile 条目 `dsh-password-login`）：`enabled`（默认 true，boot 期）、`password`（secret）、`cookieDays`（默认 7）。

## 七、开发

```bash
pnpm install && pnpm approve-builds esbuild
pnpm typecheck     # tsc --noEmit（src + tests）
pnpm test          # vitest run（56 单测）
pnpm build         # 宿主 tsc + 客户端 esbuild bundle
bash e2e/run-e2e.sh        # 本地五阶段 E2E（真实 dsh，40 断言）
bash e2e/docker/run.sh     # docker 非回环对端矩阵（12 断言）
```

E2E 前置：本机 `dsh`（0.2.0-rc.2）与 docker daemon。隔离 `DSH_HOME`，不碰真实 profile。

## 八、兼容性

- 只保 dsh **0.2.0 线**；不做 0.1.x 兼容层。
- 铸票格式随官方 `dsh-client-connection` v1；JSON 响应只增不改（`v` 字段协商），破坏性变更走并行路由（如 `/v2/session`）。
