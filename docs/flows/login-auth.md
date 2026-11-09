---
id: flow-login-auth
title: RSA 登录、sk-token 会话、注册与会话失效
status: current
keywords:
  - 登录
  - RSA
  - sk-token
  - JWT
  - 注册
  - 会话失效
  - 401
  - 验证码
source_globs:
  - client/src/pages/user/**
  - client/src/api/index.ts
  - client/src/api/request.ts
  - client/src/auth/permissions.ts
  - client/src/layout/BasicLayout.tsx
  - client/src/components/LoginCaptcha.tsx
  - client/src/utils/crypto.ts
  - server/api/src/main/java/cn/surveyking/server/api/UserApi.java
  - server/api/src/main/java/cn/surveyking/server/api/SystemApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/SystemServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/core/security/JwtTokenFilter.java
  - server/shared/src/main/java/cn/surveyking/server/core/security/JwtTokenUtil.java
  - server/shared/src/main/java/cn/surveyking/server/core/security/AuthenticationCookieService.java
  - server/shared/src/main/java/cn/surveyking/server/core/security/LoginAttemptLimiter.java
  - server/shared/src/main/java/cn/surveyking/server/core/config/WebSecurityConfig.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/RSAUtils.java
entrypoints:
  - client/src/pages/user/Login.tsx
  - client/src/pages/user/Register.tsx
  - client/src/api/request.ts
  - client/src/layout/BasicLayout.tsx
  - server/api/src/main/java/cn/surveyking/server/api/UserApi.java
  - server/shared/src/main/java/cn/surveyking/server/core/security/JwtTokenFilter.java
  - server/shared/src/main/java/cn/surveyking/server/core/config/WebSecurityConfig.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java
apis:
  - GET /api/system
  - POST /api/public/login
  - POST /api/public/logout
  - POST /api/public/register
  - GET /api/currentUser
  - GET /api/public/listRegisterRole
  - POST /captcha/get
  - POST /captcha/check
tables:
  - t_user
  - t_account
  - t_user_role
  - t_role
  - t_dept_role
tests:
  - 'client:npm run check'
  - 'client:npm run test:login'
  - 'nas:python scripts/nas/smoke-test.py'
last_verified: '2026-11-09'
verified_against: '765fc89'
---

# RSA 登录、sk-token 会话、注册与会话失效

## 目标

说明浏览器从打开登录页到拿到 `sk-token`、之后每个请求如何被识别、什么时候会 401、注册为什么是"待审核"、以及哪些操作会让已有会话失效。主登录入口是 `/user/login`，后端是 `UserApi#login` + `JwtTokenFilter`；答题页内嵌的登录表单是另一条路径，见文末"坑"。

## 角色与前置条件

- 用户已在 `t_user` / `t_account` 中存在，账号 `status=1`，所属用户组在有效期内。
- 浏览器能访问 `GET /api/system`（公开），拿到 `publicKey` 与 `setting.captchaEnabled`。
- 生产环境建议配置 `JWT_SECRET`（容器里映射为 `SK_JWT_SECRET`）；不配则每次重启随机生成密钥。
- 注册还要求系统设置里 `registerInfo.registerEnabled=true`。

## 端到端步骤

1. **打开登录页**：`client/src/pages/user/Login.tsx` 挂载时调 `GET /api/system`。`SystemServiceImpl.getSystemInfo` 返回 `publicKey`（`RSAUtils.DEFAULT_PUBLIC_KEY`）、`setting.captchaEnabled`、`registerInfo.registerEnabled`；导出密码等敏感字段会被清空。该结果通过 `SystemService#getSystemInfo` 的 `@Cacheable(commonCache, key='systemInfo')` 缓存（默认 30 天），`SystemApi#update` 等写操作会 evict。
2. **可选滑块验证码**：`captchaEnabled=true` 时渲染 `LoginCaptcha`。它先 `POST /captcha/get { captchaType:'blockPuzzle', clientUid }` 拿 token/secretKey/底图，拖动后 `POST /captcha/check`；登录时把 `AES(secretKey, token + '---' + JSON.stringify({x, y:5}))` 作为 `captchaVerification` 提交。`/captcha/get`、`/captcha/check` 在 `WebSecurityConfig` 里是 `permitAll`。
3. **RSA 加密密码**：`client/src/utils/crypto.ts` 用 `jsencrypt` 以 `publicKey` 加密明文，输出 Base64。算法是 RSA/PKCS#1 v1.5（后端 `Cipher.getInstance("RSA")`）；密钥长度 1024 位，由后端启动时 `RSAUtils.init` 生成。
4. **提交登录**：`POST /api/public/login { username, password, captchaVerification }`。`UserApi#login` 的处理顺序：
   1. `userService.validateCaptcha(request)`：开启验证码时调 aj-captcha 校验，失败抛 `ValidationException`。
   2. `LoginAttemptLimiter.isAllowed(username, remoteAddr)`：同一"用户名小写 + 客户端 IP"10 分钟内失败 10 次后直接拒绝（仍返回 1024），成功登录会清零。
   3. `RSAUtils.decrypt(password)` 得到明文，交给 `AuthenticationManager`。
   4. `UserServiceImpl.loadUserByUsername`：按 `auth_type='PWD'` + `auth_account=username` 查 `t_account`，检查 `status==1`，再校验主组 + 附加组 + 各自祖先链的 `valid_from/valid_to`；返回的 `UserInfo.password` 是 BCrypt 哈希，由 Spring Security 比对。
   5. 成功：`AuthenticationCookieService.createToken(userId)` 生成 JWT，`createCookie` 写 `Set-Cookie: sk-token=...`，同时把 token 放进 `Authorization` 响应头。
5. **Cookie 属性**：`sk-token` 的 `Path=/`、`HttpOnly`、`SameSite=Lax`；`Secure` 取决于 `request.isSecure()` 或反向代理传入的 `X-Forwarded-Proto: https`。JWT 用 HS512 签名，claim 只有 `user.userId`，有效期由 `sk.security.jwt.expiration-seconds` 控制（默认 28800 秒 = 8 小时）。
6. **登录成功后的前端动作**：`Login.tsx` 再调 `GET /api/currentUser` 确认会话可用，`notifyAuthChanged()` 清本页权限缓存并广播到其它标签页，然后 `navigate('/home')`。`BasicLayout` 挂载时 `Promise.all([getCurrentUser(), getSystem()])`；任一失败跳 `/user/login`。权限判定由 `client/src/auth/permissions.ts` 的 `loadAuthorities()` 拉 `/api/currentUser` 的 `authorityList`。
7. **后续请求**：浏览器自动带 `sk-token`。`JwtTokenFilter` 从 Cookie（或开启 URL token 时的 `sk-token` 参数）取 token，`jwtTokenUtil.validate` 校验签名/过期，再用 `userService.loadUserById(userId)` 加载用户；检查 `enabled/isAccountNonLocked/isAccountNonExpired/isCredentialsNonExpired`，通过后写入 `SecurityContext`。如果 token 来自 URL 参数且没有 Cookie，过滤器会补一个 HttpOnly Cookie。
8. **退出登录**：`POST /api/public/logout` 返回 `Set-Cookie: sk-token=; Max-Age=0`，浏览器删除 Cookie；后端是 STATELESS，没有服务端 session 可销毁。
9. **注册**：`/user/register` 先读 `GET /api/system` 的 `registerInfo.registerEnabled`；开启时 `POST /api/public/register { username, phone, name, password }`。`UserServiceImpl.register` 校验开关、强密码、账号唯一，创建 `status=0` 的用户（"待审核"），`userType=student`，角色取 `registerInfo.roles`；管理员在班级/用户管理里启用后才能登录。注册页的密码是**明文提交**（依赖 HTTPS），不是 RSA。
10. **会话失效**：见下一节。前端 `request.ts` 收到 `body.code=401` 时调用 `onUnauthorized`，当前不在 `/user/` 下就 `location.replace('/user/login')`；403 只提示"没有权限"，不跳登录。

## 会话失效判定

| 场景 | 结果 | 依据 |
|---|---|---|
| JWT 过期（默认 8 小时） | 401，跳登录 | `JwtTokenUtil.validate` `ExpiredJwtException` |
| 后端重启且未配 `JWT_SECRET` | 全部旧 token 失效 | `JwtTokenUtil.initJwtSecret` 随机生成，启动打 WARN |
| 账号被禁用（`t_account.status=0`） | 401 | `JwtTokenFilter` 检查 `userDetails.isEnabled()` |
| 用户组有效期过了 | 登录时拒绝；**已签发的 token 仍可用**到过期 | `assertDeptValid` 只在 `loadUserByUsername` 调用 |
| 改密码 | 旧 token 不失效 | JWT 无密码版本/黑名单 |
| 退出登录 | 只清浏览器 Cookie；被复制的 token 仍可用到过期 | STATELESS + 无服务端吊销 |
| 角色/权限变更 | 下一次 `/api/currentUser` 重新计算；旧 token 本身不变 | `loadUserById` 的 `userCache` 与角色状态过滤 |
| 直接改库改状态/角色 | 最长等 `userCache` TTL（dev 1h / pro 1d） | `custom-cache.entries.userCache`；正常入口会主动 evict |

## 数据与权限

| 接口 | 权限 | 说明 |
|---|---|---|
| `GET /api/system` | 公开 | 返回 `publicKey`、验证码开关、注册开关；不返回导出密码 |
| `POST /api/public/login` | 公开 | 验证码 + RSA + 账号状态 + 组有效期 |
| `POST /api/public/logout` | 公开 | 清 Cookie |
| `POST /api/public/register` | 公开（受系统开关限制） | 只能建学员，`status=0` |
| `GET /api/currentUser` | `isAuthenticated()` | 返回资料与 `authorityList` |
| `GET /api/public/listRegisterRole` | 公开 | 注册可选角色（当前注册逻辑只认 `registerInfo.roles`） |
| `/captcha/get`、`/captcha/check` | 公开 | 滑块验证码 |
| 其它 `/api/**` | 登录 | `WebSecurityConfig` 要求 `authenticated()`，再按 `@PreAuthorize` 细判 |

## 坑与已知限制

- **公钥每次启动都会变**：`RSAUtils.init` 在 `@PostConstruct` 重新生成 1024 位密钥对；登录页如果缓存了旧 `publicKey`，加密结果后端解不开，表现就是"账号或密码错误"（1024）。刷新登录页/重新取 `/api/system` 即可。
- **登录失败统一 1024**：密码错、账号禁用、组过期、鉴权链异常都转成 `UsernameOrPasswordError`；真实原因只在后端日志里（`UserApi#login` 的 WARN）。排查不要只看前端提示。
- **连续失败会锁 10 分钟**：`LoginAttemptLimiter` 按"用户名 + IP"计 10 次失败/10 分钟；触发后即使密码正确也返回 1024，等窗口过期或重启（内存缓存）才恢复。
- **验证码失败会被消费**：后端校验失败后前端要换 `captchaKey` 重新拉一张；旧 token 不能复用。
- **`sk-token` 是 HttpOnly**：JS 读不到 `document.cookie`，调试看 Network 的 `Set-Cookie` 或后端日志；Vite 开发必须用同源代理，跨域 CORS 下 Cookie 不会带。
- **HTTPS 反代要传 `X-Forwarded-Proto`**：`AuthenticationCookieService.isSecure` 依赖它决定 `Secure` 属性；代理没传时 HTTPS 站点可能下发非 Secure Cookie（或反过来在 HTTP 上下发 Secure 导致浏览器不保存）。
- **未配 `JWT_SECRET` 会全员掉线**：`application.yml` 默认 `secret: ${SK_JWT_SECRET:}`，为空就随机；docker-compose 把 `.env` 的 `JWT_SECRET` 注入为 `SK_JWT_SECRET`。生产必须配。
- **改密码不踢下线**：JWT 无状态、没有黑名单；如果要求"改密即失效"，需要加 token 版本号/黑名单或缩短 TTL。
- **组有效期不是每请求校验**：过期后已登录用户还能用到 token 过期；需要更强控制时在 `JwtTokenFilter` 里补 `assertDeptValid` 或加缓存。
- **答题页内嵌登录不是 RSA**：`LoginFormValidator#validateUsernameAndPassword` 直接拿表单里的明文 `password` 交给 `AuthenticationManager`；这是"问卷要求登录"的另一条路径，和 `/api/public/login` 的 RSA 加密不同。两条路径都依赖 HTTPS。
- **注册密码也是明文提交**：`Register.tsx` 直接把 `password` POST 给 `/api/public/register`，后端 BCrypt 入库；不要误以为全站密码都走 RSA。
- **URL token 默认关闭**：`sk.security.url-token-authentication.enabled=false`；打开后 token 会出现在 URL/日志/Referer，非必要不要开。
- **前端权限缓存要主动清**：登录成功/退出必须调 `notifyAuthChanged()`，否则同标签页换账号会继续用上一个人的 `authorityList`；其它标签页靠 `storage` 事件同步。

## 验证

```bash
cd client && npm run check
npm run test:login -- http://127.0.0.1:80 admin 123456
python scripts/nas/smoke-test.py
```

手工回归：

1. 错误密码登录：提示"账号或者密码错误"，连续 10 次后正确密码也被拒；等 10 分钟或重启后端恢复。
2. 正确登录：Network 里 `Set-Cookie: sk-token=...; HttpOnly; SameSite=Lax`；刷新页面不掉登录；退出后 `/api/currentUser` 返回 401 并跳登录。
3. 开启验证码：不完成滑块时登录按钮禁用；失败后滑块自动换图。
4. 注册开关关闭时 `/user/register` 显示"当前系统未开放注册"；开启后注册成功提示"等待管理员审核"，未启用前登录失败。
5. 改 `JWT_SECRET` 重启后端，旧页面下一次请求 401；不配 secret 重启同样全员掉线（日志有 WARN）。

## 相关文档

- [登录与账号](../modules/auth.md)
- [权限、角色与用户组](../modules/permissions.md)
- [从建卷/组卷到发布、答题、判分与报表](./exam-publish-answer.md)
- [架构总览](../architecture/overview.md)
- [本地开发环境](../start/dev-setup.md)
