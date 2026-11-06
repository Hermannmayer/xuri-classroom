# 前端 B 部分只读审计（系统管理 / 项目列表 / API 层 / 路由 / 样式）

- 审计日期：2026-11-06
- 范围：`client/src/api`、`auth`、`components`（Watermark / CopyGuard / LoginCaptcha / RequirePerm / ZoomControl）、`layout`、`router.tsx`、`pages/system`、`pages/project`、`pages/user`、`pages/repo`、`styles`（共 33 个文件、约 10.4k 行；`pages/survey`、`pages/answer`、`renderer`、`designer` 属 A 部分，除必要交叉引用外不在本报告展开）
- 方式：只读代码审计 + 全仓静态检索（`grep`/`Select-String`）+ 依赖与 antd 源码核对；**未做动态渗透、未做真机/读屏器测试、未修改任何源码或服务**
- 结论：API 层主链路（`http()`）是统一的、类型也严格（`strict` + `noUnusedLocals`，全仓 `any` 用量为 0）；真正的风险集中在 **权限缓存不随账号切换失效**、**`download()` 会把错误 JSON 当文件保存**、**菜单/兜底入口与路由守卫权限不一致**，以及若干**表单重复提交与上传校验缺失**。前端 guard 仍是软保护，安全边界在后端注解。

## 分级标准

| 级别 | 含义 |
| --- | --- |
| 高 | 可导致数据泄露/越权/静默数据错误，建议优先修 |
| 中 | 真实可利用/可感知的缺陷，需要排期修复 |
| 低 | 体验/维护性问题，顺手修 |
| 信息 | 现状说明或正面样本，不需要修 |

## 结论摘要

| 级别 | 数量 |
| --- | --- |
| 高 | 2 |
| 中 | 13 |
| 低 | 12 |
| 信息 | 9 |

---

## 1. API 层错误处理

### B-API-1 [高] `download()` 不检查 `body.code`，把后端错误 JSON 存成文件
- 位置：`client/src/api/request.ts:128-138`
- 事实：`download()` 只判断 `res.ok` 就 `res.blob()` 保存。后端约定是「HTTP 状态恒为 200，真实结果在 `body.code`」，所以 `code=403/500` 的错误响应（如导出密码错误、无权限、服务端异常）会被当成文件保存，且调用方拿到的是「成功」。
- 佐证：导出密码功能后端用 `AccessDeniedException`/错误码返回 JSON（`server/rdbms/.../ExportGuardService.java:49`）；模板下载 `client/src/pages/system/User.tsx:243-249` 仍直接调用 `download()`，一旦 403 就会得到一个内容为 JSON 的 `.xlsx`。导出页（`pages/survey/Data.tsx:75`、`pages/repo/Questions.tsx:76`）已各自写 `downloadWithPassword` 绕开，属于同一个坑的两种实现。
- 影响：用户看到「下载成功」但文件损坏/打不开，且没有错误提示；反过来也无法区分「真失败」与「后端返回了 JSON 的另一类错误」，排障困难。
- 建议：把 `download()` 改成与 `http()` 同一套判定：读 `content-type`，`application/json` 时解析 `body.code/message` 抛 `ApiError`（403 走统一提示），只有真正的二进制才保存；随后删除两个页面里重复的 `downloadWithPassword`。

### B-API-2 [中] 403 会弹两次提示，且后端异常原文直接弹给用户
- 位置：`client/src/api/request.ts:81-83`（403 先 `message.error('未授权访问')` 再抛）+ 各页面 `catch` 里的 `message.error((e as Error).message)`（如 `pages/system/User.tsx:227`、`pages/repo/List.tsx:215/225`、`pages/project/List.tsx:148-182`）
- 事实：`http()` 抛出的 `ApiError` 带上后端 `json.message`，页面 catch 又会弹一次 —— 同一个 403 用户会看到「未授权访问」和「后端原文」两条；后端 `InternalServerError(ex.getMessage())` 的调用（如 `server/api/.../RepoApi.java:123`）会把内部异常文本原样返回，前端也原样显示。
- 影响：双重 toast 噪音；内部异常/SQL 片段类信息可能泄露给普通用户；错误文案风格不统一（英文 "Authentication failed" 也会直接出现）。
- 建议：只在 `http()` 一处提示（按 code 映射中文文案），页面只 `catch` 做状态回滚不再 `message.error`；对 `code>=500` 的 message 做兜底文案（如「服务器内部错误，请联系管理员」），原始信息只进控制台/日志。

### B-API-3 [中] 401 处理无「已跳转」标记，并发 401 会重复整页跳转；`setUnauthorizedHandler` 是死 API
- 位置：`client/src/api/request.ts:19-27`、`client/src/api/index.ts:5`
- 事实：`onUnauthorized` 直接 `location.replace('/user/login')`；首屏多个并发请求同时 401 时会连续触发多次跳转（浏览器会中断/重放导航）；`setUnauthorizedHandler` 导出后全仓无调用（`grep setUnauthorizedHandler` 只命中定义与 re-export），实际永远是默认实现；`/user/*` 下不跳转（避免登录页死循环），但也无任何提示。
- 影响：会话过期时偶发「刷新好几次才落到登录页」；扩展点形同虚设，后续接入统一跳转无从下手。
- 建议：加 `redirecting` 标志位 + `router.navigate('/user/login', { replace: true })`（或让 `main.tsx` 用 `setUnauthorizedHandler` 注册一次），并清理未使用的导出。

### B-API-4 [低] 非 JSON 一律提示「后端未启动」，会掩盖网关/代理错误
- 位置：`client/src/api/request.ts:69-72`
- 事实：只要 `content-type` 不含 `application/json` 就抛「接口返回非 JSON…请检查后端是否已启动」；实际 502/504 的 HTML 错误页、网关维护页、反向代理默认页都会命中这条。
- 影响：运维排障时误导方向（实际网关挂了，提示后端没启动）。
- 建议：按 `res.status` 区分（5xx/网关类 →「服务暂时不可用」；HTML 且 200 →「接口返回了网页，可能被代理拦截」）。

### B-API-5 [低] `download()` 立即 `revokeObjectURL`，部分浏览器会中断下载
- 位置：`client/src/api/request.ts:133-137`
- 事实：`a.click()` 后立即 `URL.revokeObjectURL(a.href)`；Chrome 通常可用，但 Safari/Firefox 的大文件或慢磁盘场景可能还没读完就失效（页面里新写的 `downloadWithPassword` 已改为延迟 1s 释放）。
- 建议：统一延迟释放（`setTimeout(() => URL.revokeObjectURL(url), 1000)`），并复用同一套下载实现。

### B-API-6 [低] `http()` 无超时/取消/重试
- 位置：`client/src/api/request.ts:44-87`
- 事实：`fetch` 没有 `AbortController`/超时；组件卸载后请求继续，返回后 `setState` 到已卸载组件（React 18 不报错但浪费）；弱网下按钮 loading 可能长时间不结束。
- 建议：加统一超时（如 30s）与可选的 signal 透传；列表页 `load` 参考 `pages/repo/Book.tsx:273-298` 的 `requestSeq` 防竞态写法。

### B-API-7 [中] 下拉/配置数据加载失败被静默吞掉，界面显示空选项
- 位置：`pages/system/User.tsx:160-163`（部门、角色列表 `.catch(() => undefined)`）、`pages/system/Group.tsx:105`（角色列表失败直接 `setRoles([])`）、`pages/repo/GrantModal.tsx:87`（用户列表加载失败静默）、`pages/system/Setting.tsx:105`（AI 配置加载失败 → `{}`，表单显示空配置）
- 事实：这些请求失败时既不提示也不重试，`Select` 的 options 为空；设置页更危险——AI 配置读失败后表单是空值，管理员若直接点「保存」会把 `aiSetting` 以空值提交（后端按非 null 覆盖），有清空配置的风险。
- 影响：管理员无法完成配置却不知道原因（只能翻 Network 面板）；极端情况下误保存会覆盖已有配置。
- 建议：加载失败时 `message.error` + 在 Select 上加 `notFoundContent`（「加载失败，点击重试」）；设置页在配置未成功加载前禁用对应「保存」按钮。

---

## 2. 认证与前端权限

### B-AUTH-1 [高] 权限缓存不随登录/登出失效，同标签页切换账号会继承上一个人的权限 UI
- 位置：`client/src/auth/permissions.ts:12-25`（模块级 `cache`）、`clearAuthorities()` 在 `:23` 定义但全仓 **0 处调用**；`pages/user/Login.tsx:46-47` 登录成功后只 `getCurrentUser()`；`layout/BasicLayout.tsx:274-280` 登出只 `logout()` + `navigate`，都是 SPA 内跳转（不刷新页面）
- 事实：`loadAuthorities()` 第一次调用后把 Promise 缓存在模块变量里；登出/登录都不会清空（`clearAuthorities` 是死代码）。同一标签页中「管理员登出 → 学员登录」后，`RequirePerm` 与页面里的 `can()` 仍拿到上一个账号的 `authorityList`。
- 影响：学员会看到管理员菜单/导出按钮/管理路由（后端注解仍会 403，但 UI 露出功能结构，且页面可能白屏在 403 页）；公共机房场景容易复现。这是本轮审计里最值得先修的一条。
- 建议：①`Login.tsx` 登录成功后、`BasicLayout` 登出后、`clearAuthorities()` 调用；②更稳妥的做法是在 `loadAuthorities` 缓存里绑定 `userId`，`/api/currentUser` 返回不同用户时自动失效；③把 `clearAuthorities` 接入 `logout()` 封装。

### B-AUTH-2 [中] 会话过期刷新深层链接时，`RequirePerm` 显示 403 而不是去登录
- 位置：`client/src/components/RequirePerm.tsx:11-19` + `client/src/auth/permissions.ts:16-18`（`loadAuthorities` 对任何错误 `.catch(() => [])`）
- 事实：401 → `loadAuthorities` 吞掉错误返回 `[]` → `can([], perm)` 为 false → 渲染「没有访问权限」结果页；同时 `BasicLayout` 自己也会收到 401 并 `navigate('/user/login')`（`:62-71`），两个请求竞态，谁先返回就渲染谁。
- 影响：会话过期用户可能先看到 403 再被踢走（闪烁），或停在 403 页（若跳转失败）；体验不一致。
- 建议：`loadAuthorities` 区分 401（抛出/交给全局跳转）与其它错误；`RequirePerm` 增加 `error` 态：401 时不渲染 403，而是显示「登录已过期，正在跳转…」。

### B-AUTH-3 [信息] 前端 guard 是软保护，安全边界在后端
- 位置：`components/RequirePerm.tsx`、`router.tsx:47-72`、`auth/permissions.ts:31-37`
- 说明：前排已确认后端关键接口有 `@PreAuthorize`（如 `AnswerApi.java:123` 的 `answer:export`、`RepoApi.java:112/175` 的 `repo:import/repo:export`）。前端隐藏按钮只改善体验；任何「前端修好就算安全」的判断都不成立。建议把「接口 ↔ 权限」清单固化到后端集成测试。
- 注：`can()` 对 `ROLE_admin` 直接放行（`auth/permissions.ts:32`），而后端部分新注解（如 `hasAuthority('repo:export')`）并不认 `ROLE_admin`，两边语义不一致——上线新的权限点时记得给 admin 角色补授权，否则会出现「前端显示按钮、后端 403」的割裂（本轮开发中已实际遇到一次）。

### B-AUTH-4 [中] 菜单项与路由守卫的权限粒度不一致
- 位置：`layout/BasicLayout.tsx:104-117`（只要命中任意 `system:` 就渲染全部 5 个子菜单）、`router.tsx:67-72`（每条路由各自 `guard('system:user:list' | 'system:dept:list' | 'system:role:list' | 'system:log:list')`）；同样的兜底问题见 `layout/BasicLayout.tsx:120-122` 与 `layout/MobileTabBar.tsx:65-68`（无角色的账号被强行塞「我的练习」，但路由 `router.tsx:52` 要 `exercise:list`）
- 影响：只有某一个 `system:*` 权限的账号（例如只读操作日志）会看到「用户管理/用户组/系统设置/权限配置」入口，点进去全是 403 结果页；无角色账号点「我的练习」也 403。属于「看得见、点不开」的可用性缺陷，也会让人误判权限模型。
- 建议：菜单与路由共用一张「路由 → 所需权限」表（同一个 `can()` 调用），菜单只渲染 `router` 里该路由实际要求的权限；兜底入口在渲染前也走 `can()`。

---

## 3. 路由

### B-ROUTE-1 [低] `router.tsx` 注释与实现不一致
- 位置：`client/src/router.tsx:70-71`（注释写「按任务要求用 system:user:update 守卫」，代码是 `guard('system:role:list', <SystemPermissions />)`）
- 影响：后续维护者按注释改权限会改错；也说明权限点命名在演进中没同步文档。
- 建议：注释与代码保持一致，或直接删除过期注释。

### B-ROUTE-2 [信息] 未知路径与深层链接现状
- 位置：`router.tsx:81`（`*` → `Placeholder`，不在 `BasicLayout` 内，页面无侧栏/顶栏）、`router.tsx:63`（`survey/:id/setting` 有意不加 guard，只做 `<Navigate>` 到概述页）
- 说明：未知路径不会死循环，也不会暴露 404 之外的信息；旧链接重定向是有意为之。可考虑给 `*` 也套 `BasicLayout`，让 404 页保持一致导航（体验项，不影响安全）。

---

## 4. 表单与重复提交

### B-FORM-1 [中] 多处 Modal `onOk` 直接传 async 函数且无 `confirmLoading`，可重复提交
- 位置：`pages/project/List.tsx:603`（新建）、`:658`（重命名）；`pages/repo/List.tsx:611`（新建题库）、`:650`（编辑题库）；`pages/repo/Book.tsx:786`（保存笔记）
- 事实：antd 声明式 `<Modal>` 的 `onOk` 只是回调（`node_modules/antd/es/modal/Modal.js:88-90`：`onOk?.(e)`），**不会**像 `Modal.confirm` 那样根据 Promise 自动锁按钮；上述 handler 内部也没有 `saving` 标志（对照 `pages/system/User.tsx:519`、`pages/system/Group.tsx:275`、`pages/project/BatchSettingModal.tsx:630`、`pages/project/ComposeModal.tsx:231` 都正确用了 `confirmLoading`）。
- 影响：双击「创建」会发两次创建请求（生成两份同名项目/题库）；重命名/保存笔记重复提交；网络慢时更容易触发。
- 建议：统一给这些 Modal 加 `confirmLoading={saving}` 与 `saving` 状态（或把 handler 改成「进入即 `if (saving) return; setSaving(true)`」），失败在 `finally` 复位。

### B-FORM-2 [中] 批量设置串行 N×M 请求，无进度、无回滚、统计口径不准
- 位置：`pages/project/BatchSettingModal.tsx:407-452`（`for project` 里再 `for groupId`，每项 `await`）、`:454-461`（成功文案用 `authDeptIds.length`，实际创建数 `authDone` 未使用）
- 事实：每个项目还要先 `GET /api/project/setting` 再 `POST /api/project/update`（`:415/432`）；全部串行执行，项目数×班级数就是请求数。中途异常只 `message.error`，之前已成功的项目不会回滚，也没告诉用户哪些成功、哪些失败。
- 影响：几十个项目时会等待很久且无反馈；失败后状态半新半旧，用户只能靠列表状态自己猜；成功提示的「N 个班级授权」可能比实际成功数多。
- 建议：①并发限流（如 4 个一批）并显示进度条/「第 x/y 项」；②收集每个项目的成功/失败结果，结束时汇总「成功 a、失败 b」并列出失败项；③文案改用实际计数；④失败项提供重试入口。

### B-DATA-1 [中] 用户列表「未分组」筛选硬编码 1000 行上限
- 位置：`pages/system/User.tsx:113-121`
- 事实：筛选「未分组」时一次性拉 `pageSize: 1000` 再在前端过滤/分页；用户数超过 1000 时会**静默截断**（`total` 也只基于返回结果）。
- 影响：用户量大的机构，「未分组」列表不完整，管理员可能漏掉账号或误判「都分好组了」。
- 建议：后端支持「deptId 为空」的查询条件后改回服务端分页；短期至少把截断显式提示出来（如「仅显示前 1000 个账号」）。

### B-FORM-3 [中] 用户新建/编辑的密码与联系方式缺少前端校验
- 位置：`pages/system/User.tsx:528-541`（密码仅 `required`，无最短长度/复杂度；对比 `pages/user/Register.tsx:102-112` 有 `/^.{8,32}$/`）、`:576-581`（手机、邮箱无格式校验；注册页 `Register.tsx:88-97` 有 `/^1\d{10}$/`）
- 影响：管理员可创建 1 位密码的账号（若后端 `strongPasswordEnabled` 未开）；手机号/邮箱脏数据进入用户表，后续按手机号登录/通知会异常。
- 建议：抽出共用校验规则（手机号、邮箱、密码长度），并与后端 `registerInfo.strongPasswordEnabled` 联动提示；`username` 也建议限制长度/字符集（当前无 `maxLength`）。

### B-UPLOAD-1 [中] 三处上传都没有文件大小/类型校验（仅 `accept` 属性）
- 位置：`pages/system/User.tsx:310-321`（批量导入用户）、`pages/repo/Questions.tsx:542`（导入题目 Excel）、`pages/system/Setting.tsx:328`（上传 Logo）
- 事实：`beforeUpload` 只 `void doXxx(file); return false;`，没有 `file.size` 判断（全仓检索 `file.size` 为 0），`accept` 只是选择器提示，用户可以强行选任意文件；大文件会直接进入上传流程。
- 影响：误传 100MB 文件时页面卡住或后端超时；Logo 传非图片会在预览处裂图；错误提示只能等后端返回。
- 建议：`beforeUpload` 里先判断大小（如 Logo ≤2MB、Excel ≤10MB）与扩展名，超限 `message.warning` 并 `return Upload.LIST_IGNORE`；Logo 再加 `file.type.startsWith('image/')`。

---

## 5. 导出与内容保护

### B-EXPORT-1 [信息] 导出密码功能现状（前端）
- 位置：`pages/survey/Data.tsx:300-340`（答卷导出弹窗 + `downloadWithPassword`）、`pages/repo/Questions.tsx:300-340`（题目导出同理）、`pages/system/Setting.tsx:204-228`（设置导出密码，仅写不回显）
- 说明：导出密码随 GET 下载以 query 参数 `exportPassword` 传递（因为两个导出本来就是 GET 下载）；设置项改为读后端 `exportPasswordEnabled` 布尔值（`client/src/api/types.ts:28-30`），服务端不回显明文，这一点已按上次反馈修正。`repo/List.tsx` 目前没有导出/导入入口，因此没有密码弹窗。
- 风险提示：密码出现在 URL 里会进入浏览器历史/网关访问日志；若后续再把导出改成 POST，请优先换成 header 或一次性 token。

### B-SEC-1 [中] 水印与防复制可被绕过（应明确威胁模型，不要当安全边界）
- 位置：`components/Watermark.tsx`（纯 DOM 覆盖层 + canvas 背景）、`components/CopyGuard.tsx:114-124`（document 级 `contextmenu/copy/cut/dragstart/keydown` 拦截）
- 事实：关闭 JS、删除水印节点、浏览器打印/另存、开发者工具里移除监听、截图裁剪都能绕过；F12 拦截只是心理威慑（浏览器菜单/插件可打开）。水印本身可追溯，但「防复制」无法阻止有动机的人。
- 影响：如果对外宣传「防复制」会被当成安全承诺；实际只能提高随手复制的成本。
- 建议：产品文案改成「内容保护（水印溯源 + 复制提醒）」，真正的管控放在服务端：导出密码 + 权限 + 审计日志（已具备）。若需要更强保护，考虑 PDF 水印导出、下载水印服务端合成。

### B-SEC-2 [低] Watermark 直接改写 `window.history`
- 位置：`components/Watermark.tsx:106-130`（`pushState/replaceState` 包一层，卸载时还原）
- 影响：组件在 Router 之外，只能靠 monkey-patch 感知路由；与其它同样 patch history 的埋点/监控/第三方库会互相覆盖（后挂载者生效，卸载时还原成挂载前的函数）；将来加埋点容易踩坑。
- 建议：改用 `popstate` + `Navigation API`（可用时），或由 `main.tsx` 统一提供「路由变更」广播；至少加注释说明「只允许这一处 patch」。

---

## 6. 主题与样式

### B-STYLE-1 [中] 暗色静态弹层靠 46 处 `!important` 覆盖，升级 antd 有回归风险
- 位置：`styles/global.css:563-617`（Modal / message / notification / popover 静态方法）、`styles/global.css` 共 46 处 `!important`；`styles/answer.css` 11 处、`styles/exam-result.css` 4 处
- 事实：因为 antd 静态方法渲染在 `ConfigProvider` 之外，拿不到主题 token，只能用 CSS 变量 + `!important` 兜底；目前 `--bp-modal-bg` 等变量均有定义（全量比对：CSS 中使用的 42 个 `--bp-*` 变量全部有定义，无未定义变量），暗色下确认不会再出现白底。
- 影响：antd 运行时样式注入顺序变化或类名调整时，这些 `!important` 会失效或反噬（覆盖范围包含按钮、弹层、输入框）；亮色主题下也有 `:root[data-theme='light'] .ant-card { background: ... !important }`（`global.css:199-201`）在兜底页面里硬编码的深色卡片。
- 建议：把静态弹层改为 `App.useApp()` 的 `modal/message`（可消费 ConfigProvider token），从根上减少 `!important`；保留的覆盖按组件分组注释（现在已有部分注释，可再收敛）。

### B-STYLE-2 [低] 页面里硬编码 `rgba(30,58,95,0.55)` 与主题变量混用
- 位置：`pages/project/Trash.tsx:78`、`pages/system/Setting.tsx:301`；范围外的 `pages/Home.tsx:13`、`pages/account/Settings.tsx:98/130`、`pages/survey/data/AnswerCards.tsx:24` 等也用了同一字面量
- 影响：亮色主题只能靠全局 `.ant-card !important` 兜底；非 Card 的内联块（如设置页的统计块）在亮色下可能出现深色底 + 深色字。
- 建议：统一替换为 `var(--bp-panel)`（或已有的 `bp-card` class），并在 lint 里禁用内联颜色字面量。

### B-STYLE-3 [信息] 静态弹层主题现状（正面）
- `styles/global.css:571-617` 已覆盖 `.ant-modal-*`、`.ant-message-notice-content`、`.ant-notification-notice`、`.ant-popover-inner`，并全部走 `var(--bp-*)`；本部分范围内 2 处 `Modal.confirm`（`pages/system/Setting.tsx:208`、`pages/repo/BookPractice.tsx:480`）在暗色下已是深色，不再是白底（A 部分的 `pages/survey/Data.tsx:352`、`data/TrashDrawer.tsx:63`、`Editor.tsx:329`、`answer/PublicAnswer.tsx:840` 同理）。属于已修复项，保留说明防止回退。

---

## 7. 代码质量与依赖

### B-CODE-1 [中] antd 5.29 已弃用 `destroyOnClose`，全仓 17 处
- 位置：`node_modules/antd/es/modal/interface.d.ts:42-43`（`@deprecated Please use destroyOnHidden instead`）；使用点如 `pages/project/BatchSettingModal.tsx:634`、`pages/project/ComposeModal.tsx:234`、`pages/project/List.tsx:606/661`、`pages/repo/Book.tsx:789`、`pages/repo/GrantModal.tsx:175`、`pages/repo/List.tsx:586/614`、`pages/system/*` 等共 17 处
- 影响：控制台弃用告警；antd 6 移除后属性静默失效（弹窗内容不再销毁，表单状态可能串场）。
- 建议：批量替换为 `destroyOnHidden` 并回归一次弹窗表单；顺手确认 antd 版本声明（`package.json:21` `^5.22.5`，当前实装 5.29.3，语义化范围内但行为有差异，建议升到当前 minor 并锁 lockfile）。

### B-CODE-2 [低] `useIsMobile` 在 6 个文件里重复实现
- 位置：`layout/BasicLayout.tsx:30`、`pages/exercise/List.tsx:38`、`pages/project/List.tsx:53`、`pages/repo/List.tsx:57`、`pages/survey/Data.tsx:54`、`pages/system/User.tsx:69`
- 影响：同一段 matchMedia 逻辑复制 6 份，改断点/加设备判断要改 6 处。
- 建议：抽 `hooks/useIsMobile.ts`（本项目已有 `components/ZoomControl.tsx` 这类共享组件，成本很低）。

### B-CODE-3 [低] 超长组件（>500 行）
- 位置：`pages/repo/Questions.tsx` 835 行、`pages/repo/BookPractice.tsx` 765 行、`pages/repo/Book.tsx` 762 行、`pages/project/BatchSettingModal.tsx` 596 行、`pages/system/User.tsx` 562 行、`pages/system/Setting.tsx` 542 行
- 影响：单文件同时承担数据加载、表单、表格、弹窗、权限，审查和回归成本高（例如本次权限缓存问题就横跨 `auth` 与页面）。
- 建议：按「列表 + 弹窗 + 表单」拆子组件；数据逻辑抽 hooks（`usePagedList`、`useAuth`）。

### B-I18N-1 [低] 文案硬编码与 `t()` 混用、词条表大量闲置
- 位置：全仓只有 33 处 `t(`，集中在 `layout/BasicLayout.tsx`（15 处）与 `pages/Home.tsx`（10 处）；`pages/system`、`pages/project`、`pages/repo` 全为硬编码中文；`client/src/i18n/locales/zh-CN.json` 存有约 1.5k 条词条却没有被这些页面引用
- 影响：两种风格并存；将来做多语言时这些页面要重扫一遍；`t('key', '中文')` 的 fallback 会让「词条缺失」难以发现。
- 建议：明确策略（若只做中文，删掉/冻结词条表并在文档写明；若要 i18n，则新页面必须走 `t()` 并加 key 检查）。

### B-PERF-1 [低] 首屏重复请求：`/api/system` 最多 4 次、`/api/currentUser` 2-3 次
- 位置：`main.tsx:18`（favicon/标题）、`layout/BasicLayout.tsx:63`、`components/Watermark.tsx:156`、`components/CopyGuard.tsx:59` 各请求一次 `/api/system`；`pages/user/Login.tsx:25` 也算一个；`/api/currentUser` 由 `BasicLayout:63`、`RequirePerm`（`auth/permissions.ts:16`）与 `Watermark` 分别触发
- 影响：登录后首屏多出 5-7 个重复请求；弱网/慢后端下首屏变慢，也给后端日志带来噪音。
- 建议：在 `main.tsx` 用一次性 Promise 缓存 system/currentUser（或 Context 下发），`Watermark`/`CopyGuard` 复用；`RequirePerm` 直接复用 `BasicLayout` 的 user。

### B-TEXT-1 [低] 文案/注释与实际不一致（四处小问题）
- `pages/system/Audit.tsx:92`：空态写「还没有导出记录」，但页面同时记录导入（标题 `:65` 已是「导出与导入记录」）。
- `pages/project/Trash.tsx:103`：`mode === 'exam' ? 考试 : 问卷`，回收站若含 `folder` 会被误标成问卷。
- `client/src/api/types.ts:28-30`：旧注释（「导出密码…服务端不回显明文」）没有对应字段，紧跟新字段 `exportPasswordEnabled` 的注释，读起来像两个字段，建议合并。
- `pages/system/Permissions.tsx:154`：`message.error((e as Error).message || '加载权限目录失败')` 的兜底永远走不到（`ApiError.message` 恒非空）。
- 建议：逐条修正，成本极低。

### B-DEP-1 [低] `@types/crypto-js` 放在 `dependencies`
- 位置：`client/package.json:20`（`dependencies` 内），同类 `@types/node`、`@types/qrcode` 都在 `devDependencies`（`:30-37`）
- 影响：生产安装会多装纯类型包（体积/合规扫描噪音），与项目既有约定不一致。
- 建议：移到 `devDependencies`。

---

## 8. 正面样本（信息）

### B-INFO-1 [信息] API 主链路与类型
- `api/request.ts:44-87` 统一封装：GET/DELETE 拼 query、FormData 自动识别、`content-type` 非 JSON 显式拦截、`code` 分支处理；`api/index.ts` 只暴露类型化方法。全仓 `: any`/`as any` 为 **0** 处，`tsconfig` 开了 `strict` + `noUnusedLocals` + `noUnusedParameters`；`api/types.ts` 与 `schema/project.ts` 注释齐全（含「Jackson non_null 不返回空值」等后端约定）。`getWithPagination` 统一 `{total,list}` → `{total,data}`，`pages/project/Trash.tsx:9-15` 还记录了「后端返回数组导致空列表」的踩坑，说明此类问题已被识别。

### B-INFO-2 [信息] 表单与竞态的正面写法
- `pages/repo/Book.tsx:273-298` 用 `requestSeq` 丢弃过期响应，避免快速搜索/翻页时旧数据覆盖新数据；`pages/project/BatchSettingModal.tsx:411-430` 在批量修改前先读取远端 setting 再合并，避免把未勾选字段清空；`pages/system/Setting.tsx:175-198` 的水印/防复制是「乐观更新 + 失败回滚」；`pages/system/User.tsx:519`、`pages/system/Group.tsx:275`、`pages/project/ComposeModal.tsx:231` 等正确使用 `confirmLoading`。这些可作为其它页面的参照实现。

### B-INFO-3 [信息] 本地存储与敏感数据
- 全仓 `localStorage` 只存 UI/答题草稿：`sk-theme`、`sk-zoom`、`sk-font-scale`、`slider`（验证码 clientUid）、`sk-answer-*`/`sk-draft-*`/`sk-marks-*`（答题页，属 A 部分）、`practice:*`；**没有发现密码、token、权限串、导出密码等凭据落地**。登录态是 HttpOnly cookie（由后端设置），前端读不到。导出密码只写不读（`pages/system/Setting.tsx:97-100`）。

### B-INFO-4 [信息] 依赖与体积
- 依赖均被实际引用：`antd`（全站）、`@ant-design/icons`、`dayjs`（36 处）、`qrcode`（`pages/survey/Overview.tsx` 等 2 处）、`jsencrypt`（`utils/crypto.ts` 登录密码 RSA）、`crypto-js`（`components/LoginCaptcha.tsx` 滑块 AES）、`@dnd-kit/core|sortable|utilities`（设计器，A 部分）。没有发现「装了但没人用」的第三方库；体积大头是 antd + icons（按需 tree-shaking 依赖 Vite/ESM），建议后续用 `vite build` 的 `rollup-plugin-visualizer` 做一次基线（本次审计未跑构建，不做体积断言）。

### B-INFO-5 [信息] 样式变量与静态弹层
- 全量比对三份 CSS：使用的 42 个 `--bp-*` 变量全部有定义（无未定义引用）；`global.css:563-617` 已用变量兜住 antd 静态弹层；`styles/answer.css`/`exam-result.css` 没有重复定义 `:root` 变量，作用域限定在 `.sk-answer`/成绩单容器内（各 11/4 处 `!important` 属作用域内覆盖，风险低于全局）。

---

## 9. 修复优先级建议

1. **B-AUTH-1 权限缓存**（登录/登出清理 + 绑定 userId）——最容易误伤真实用户。
2. **B-API-1 `download()` 判 JSON**——导出/模板下载的静默错误，一次修公共层即可覆盖。
3. **B-AUTH-4 菜单与路由共用权限表** + B-AUTH-2 RequirePerm 401 态——直接改善「点进去 403」的体验。
4. **B-FORM-1 重复提交** + B-UPLOAD-1 上传校验——低成本、可感知。
5. **B-API-2/3 错误提示与 401 处理**——统一文案、消除双 toast 与重复跳转。
6. 其余为维护性/体验项，可随迭代清理（B-CODE-1 `destroyOnClose` 建议在升级 antd 前一次性替换）。
