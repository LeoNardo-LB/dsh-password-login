# CONTEXT.md — 术语表

- **铸票（mint）**：插件签发一枚宿主认可的 browser-session cookie（格式与官方 v1 逐字节一致：`dsh-auth-<b64url(sha256(authority))>=v1.<payload>.<hmac>`）。
- **回环对端（loopback peer）**：内核报告的 `remoteAddress ∈ 127/8 ∪ {::1}`——唯一信任锚；Host 头永不参与信任判定。
- **免密铸票（free-mint）**：未设密码态下仅回环对端可铸（adb reverse / tailscale serve / 本机进程都以回环呈现）。
- **epoch**：毫秒时间戳；一切 `issuedAt < epoch` 的 Cookie 在 admit 时被拒。轮换/配置通道改密推进 epoch。
- **指纹（fingerprint）**：sha256(password) 的 base64url——持久化于 storage domain，用于区分「纯重启」（沿用 epoch，不误撤）与「改密」（epoch 重置，全员下线一次）。
- **金丝雀（canary）**：启动时用本插件实现铸一枚测试票交官方 `BrowserAuth.isAuthenticated` 判定；拒绝 = 宿主格式漂移 → 端点回 `stale:true`、撤销自禁用。
- **admit 包装**：替换 `ctx.connection.admit` 实例属性（/api HTTP 路由与 WS 升级共用），叠加 epoch 撤销判定；fail-open + 链式还原。
- **Basic 弹窗入口**：`/login` 的 401 + `WWW-Authenticate: Basic`——浏览器原生单密码对话框（用户名忽略），无自绘表单；「记住我」归浏览器密码管理器。
- **双语义密码**：oc-beacon `ServerConfig.password`——服务器有插件 = 配对密码（Bearer）；无插件 = launch token（legacy `/?token=`）。
- **宿主半（host half）/ 客户端半（client half）**：`src/`（Cordis 插件 + 路由 + 撤销）与 `src/client/`（设置面板，经 `dsh.client.inject` 注入、slots 注册）。
- **轮换（rotate）**：改密码动作；成功即全员下线（含浏览器），改密者凭新票在线（响应自动 Set-Cookie）。
