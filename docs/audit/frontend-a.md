# 前端 A 部分只读审计（答题 / 题库练习 / 问卷管理 / 渲染器 / 设计器）

- 审计日期：2026-11-06
- 范围：`client/src/pages/answer`、`pages/exercise`、`pages/survey`、`renderer`、`designer`（共 46 个文件，约 9.2k 行）
- 方式：只读代码审计 + 静态检索 + 主题色对比度计算 + 构建产物测量；**未做动态渗透、未做真机/读屏器测试**
- 结论：没有发现「匿名即可直接打」的高危 XSS；主要风险集中在 **发布者可控富文本直出 HTML**、**本地存储的答题隐私**、**缺少 ErrorBoundary 的白屏风险**、**单包 2MB 的性能**，以及**主题色硬编码 + 小字对比度**。前端 guard 确实只是软保护（后端注解为准）。

## 分级标准

| 级别 | 含义 |
| --- | --- |
| 高 | 可导致数据泄露/越权/整站不可用，或已被线上问题验证过 |
| 中 | 真实可利用/可感知的缺陷，需要排期修复 |
| 低 | 体验/维护性问题，顺手修 |
| 信息 | 现状说明或正面样本，不需要修 |

## 结论摘要

| 级别 | 数量 |
| --- | --- |
| 高 | 4（A-DATA-1、A-STATE-1、A-ERR-1、A-PERF-1） |
| 中 | 11 |
| 低 | 12 |
| 信息 / 正面样本 | 3 + 1（A-A11Y-4 为正面样本） |

---

## 1. XSS 与 HTML 渲染

### A-XSS-1 [中] 答题提交页把发布者填写的 HTML 直出
- 位置：`client/src/pages/answer/PublicAnswer.tsx:1059`（取值）、`:1077`（`dangerouslySetInnerHTML`）
- 数据来源：`project.submittedHtml || setting.submittedSetting.contentHtml`；编辑入口是 `client/src/pages/survey/Overview.tsx:548` 的普通 `Input.TextArea`（`extra` 明说「支持 HTML」）
- 事实：前端没有 `DOMPurify` 等消毒库（`package.json` 无相关依赖）；后端全仓库检索 `Jsoup|HtmlUtils|sanitize|escapeHtml` 无命中，即存进去什么就原样输出。
- 影响：任何拥有 `project:update` 的老师/管理员（或导入的旧模板里携带的 HTML）可以在「已提交」页面对**该问卷的答题者**执行脚本：伪造页面、外链钓鱼、读取同源 localStorage（草稿答案/标记，见 A-DATA-1）。`sk-token` 是 HttpOnly，读不到，但足以做界面伪造与数据采集。
- 建议：白名单消毒（`a/strong/em/p/br/ul/ol/li/h1-h4`，属性只留 `href` 且限 http/https），优先放后端（一次修好所有出口），前端再加一层；同时补 CSP（`script-src 'self'`）。

### A-XSS-2 [中] 设计器 Remark 富文本直出
- 位置：`client/src/renderer/SchemaRenderer.tsx:84-91`（`node.attribute.content` → `dangerouslySetInnerHTML`）
- 影响：与 A-XSS-1 同一信任边界（问卷设计者），但覆盖面更大——Remark 会出现在**答题页、手机预览、成绩单**等所有渲染入口。
- 建议：同上，统一在渲染器入口做一次消毒（`SchemaRenderer` 单点修复收益最大）。

### A-XSS-3 [中] 新窗口外链缺 `rel`
- 位置：`client/src/pages/survey/Overview.tsx:512`（`href={shareUrl} target="_blank"`）
- 影响：`shareUrl` 是站内同源地址（`location.origin + /s/:id`），暂无可控跳转；但缺少 `rel="noopener noreferrer"` 时新窗口仍可经 `window.opener` 操作管理端页面，属低成本加固。
- 建议：`rel="noopener noreferrer"`；后续若允许自定义分享域名，必须做协议白名单。

### A-XSS-4 [低] 背景图走内联 CSS 拼接
- 位置：`client/src/pages/answer/PublicAnswer.tsx:1131-1132`（`backgroundImage: url(${project.survey.attribute.backgroundImage})`）
- 影响：值来自设计器，未校验、未加引号。浏览器不允许 CSS `url()` 执行 `javascript:`，因此不是 XSS；但可注入额外 CSS（加载第三方资源、遮挡/替换界面元素）。
- 建议：只接受 `https://` 且做 `encodeURI`/引号转义，或用 `<img>` + `object-fit` 替代内联背景。

---

## 2. 敏感数据与本地存储

### A-DATA-1 [高] 答题草稿/答案凭证/标记全部存 localStorage，登出不清理
- 位置：`client/src/pages/answer/PublicAnswer.tsx:50`（`sk-answer-*`）、`:56`（`sk-draft-*`）、`:62-86`（`sk-marks-*` 读写）、`:303/337/350/369/665`（读写）、`:239/604`（`sk-font-scale`）
- 登出路径：`client/src/layout/BasicLayout.tsx:275-277` 只调 `logout()` + `navigate('/user/login')`，**没有清理任何 `sk-*` 键**
- 影响：公用电脑（学校机房、老年大学）上，下一位用户打开同一问卷会被自动续答并看到上一位的**整份答案**（草稿里是 `values` 全量，含姓名/手机/地址等题），`sk-marks-*` 也会串。答题页没有账号也能读，属于跨用户隐私泄露。
- 建议：①登出/切换账号时清空所有 `sk-*`（含练习进度 `sk-practice-*`）；②草稿加过期时间（例如 7 天）与「清除本机记录」入口；③高敏题（User/Dept/Address/手机）不落本地，或整份草稿加密/只存答案 id；④在答题页提示「本页会在这台设备上保存草稿」。

### A-DATA-2 [低] 部分 `localStorage.setItem` 未做异常保护
- 位置：`PublicAnswer.tsx:303`（在 `load()` 的 try 内，抛错会整页变「加载失败」）、`:369`（setTimeout 回调内，未捕获）、`:604`（字号滑块事件）；`practice.tsx:400` 已有注释说明并做了保护
- 影响：Safari 私密模式、配额满、被策略禁用时抛 `QuotaExceededError`；`:303` 会把正常答题直接变成错误页。
- 建议：抽 `safeStorage`（get/set/remove 全部 try/catch），统一替换散落的直调。

### A-DATA-3 [信息] 其它存储现状（无风险项）
- 登录态在 HttpOnly cookie（`sk-token`），前端不落地 token；`sk-marks-*` 只存布尔；`sk-font-scale`/`sk-zoom` 是纯 UI 偏好。练习页 `sk-practice-<repoId>`（`pages/exercise/Practice.tsx:400`）存的是练习进度（题目 id + 作答），同属 A-DATA-1 的清理范围。

---

## 3. 越权与前端 guard（软保护）

### A-AUTH-1 [中] 前端路由/按钮权限只是 UI 软保护，安全边界在后端
- 位置：`client/src/components/RequirePerm.tsx:11-22`（加载 authorities → 有权限才渲染 children，否则 403 页）、`client/src/router.tsx:46-63`（`guard('project:list', …)` 等）、`client/src/auth/permissions.ts:27-36`（`can()`）
- 事实：`RequirePerm` 只决定「渲染不渲染」；接口是否可调完全由后端 `@PreAuthorize` 决定。抽查：`ProjectApi.java:50/61/73/85/95/106`、`AnswerApi.java:38/50/63/74/85` 均有对应权限注解；而 `/api/public/*`（`SurveyApi.java`）按设计匿名开放。
- 影响：**不要把它当安全边界**——「按钮隐藏了」≠「接口调不到」。一旦后端漏注解，前端不会兜住；反过来，任何「前端藏起来就算修好」的修法都是自欺欺人。
- 建议：维护「接口 ↔ 权限」清单并加接口级测试（MockMvc/集成测试断言 401/403）；前端 guard 保持现状（它改善的是体验，不是安全）。

### A-AUTH-2 [低] 学员任务状态可由本地存储伪造
- 位置：`client/src/pages/exercise/List.tsx:348-360`（`taskState` 读 `sk-answer-*`/`sk-draft-*`）
- 现状：上一轮已把「已完成」改成优先用服务端 `/api/public/attempts`（`List.tsx:389-399`），localStorage 仅作 fallback。
- 影响：清缓存/换浏览器后仍可能显示「未开始」，手改 localStorage 可让状态显示错误（仅展示层，不影响真实的答卷数据）。
- 建议：彻底以 attempts 为准；本机草稿单独提示「本机有草稿」，不要混进「已完成」。

### A-AUTH-3 [信息] 公开答题接口按设计无需登录
- `SurveyApi.java` 的 `/api/public/loadProject|projectOutline|question|saveAnswer|attempts|exam/switch-screen` 全匿名，`answerId`（UUID）事实上是「持有即可访问」的凭据；`/api/public/attempts` 只返回当前登录用户自己的记录（未登录返回空）。
- 提示：`shareUrl`/成绩单链接一旦被转发，等于把答卷读取权一起转出去——产品上要明确这一点（目前 `ExamResult` 按 answerId 直接可读）。

### A-AUTH-4 [低] 全局 401 会强制跳登录页，公开页必须避开
- 位置：`client/src/api/request.ts:20-23`（`location.replace('/user/login')`，除 `/user/*` 外一律跳转）；上一轮已把答题页的登录态探测改成裸 `fetch`（`PublicAnswer.tsx:412` 附近的 `fetchLoggedIn`）绕开这个坑。
- 影响：任何公开页（`/s/*`、分享页、公开查询页）只要误调一个需要登录的接口，就会把匿名答题者踢到登录页。
- 建议：在 `request.ts` 里对公开路由前缀（`/s/`、`/user/`）跳过强制跳转，或在 `setUnauthorizedHandler` 里统一判断；并把「不要在公开页调 loadAuthorities」写进开发约定。

---

## 4. 状态与生命周期

### A-STATE-1 [高] 三处 `exhaustive-deps` 关闭：计时器闭包捕获旧值（空白卷事故已修，模式仍在）
- 位置：`client/src/pages/answer/PublicAnswer.tsx:737`（最长交卷计时器）、`:789`（切屏计数 effect）、`:946`（闯关每题倒计时）
- 事实：这些 effect 的依赖数组只放设置项，回调里要用的 `values`、`project`、`doSubmit` 都是首次渲染时的闭包。上一轮「自动交卷交出空白卷」就是这个模式导致的，现在用 `doSubmitRef`（`PublicAnswer.tsx:696-698`）与 `valuesRef`（`PublicAnswer.tsx:264-266`）修掉了；但新增计时器/异步回调时仍会复发。
- 影响：任何新的「到点动作」都可能提交旧答案/旧项目；这类 bug 静默且只在特定时序出现。
- 建议：抽 `useLatestRef(value)` 工具并在三处显式使用；能补齐依赖就补齐（`doSubmit` 本身可 `useCallback` 稳定化），把 disable 收敛到一两个有注释的地方。

### A-STATE-2 [中] 数据页/报告页/概述页的异步加载没有卸载保护
- 位置：`client/src/pages/survey/Data.tsx:158-172`、`pages/survey/Overview.tsx:123-135`、`pages/survey/Report.tsx:33-47`
- 事实：`Promise.all` 之后直接 `setRows/setProject/setReport`，没有 `alive` 标志或 `AbortController`（对照：`ExamResult.tsx:468`、`Practice.tsx:271`、`Editor.tsx:207` 都做了 alive）。
- 影响：快速切页时在已卸载组件上 setState（React 18 不再告警，但会白白执行、偶发竞态覆盖新数据）；同时每个页面都会重复拉 `/api/project` + `/api/answer/list`，切回来就再拉一遍。
- 建议：统一封装 `useAsyncData`（带 alive/abort + 依赖缓存）；页面级请求做 30s 去重。

### A-STATE-3 [中] 交卷前逐题拉取 schema，N 题 = N 个请求，一个失败整单失败
- 位置：`client/src/pages/answer/PublicAnswer.tsx:629-635`（`mapWithConcurrency(flatQuestions, 6, loadQuestion)`），`:548`（首屏/预取并发 2/6）
- 影响：100 题的问卷交卷时最多 100 个请求；任一题失败直接抛「部分题目尚未加载成功，请检查网络后重试」，用户答案还在但交不上去（弱网/考场更明显）。
- 建议：交卷只提交答案 + 让后端用自己的 project schema 校验（后端本来就以 `project.getSurvey()` 为准）；或提供 `POST /api/public/questions`（批量）一次取回。前端这一层「先把整卷 schema 拉齐再交卷」可以去掉。

### A-STATE-4 [低] 学员任务列表按任务逐个请求
- 位置：`client/src/pages/exercise/List.tsx:389-399`（`Promise.all(list.map(task => post('/api/public/attempts')))`）
- 影响：任务多时并发请求数不可控（无上限），首屏变慢；任一失败该任务静默显示 0 次。
- 建议：后端出批量接口（`projectIds[]`）；前端 `Promise.allSettled` + 并发上限。

### A-STATE-5 [信息] 正面：预取与清理做得对
- `PublicAnswer.tsx:548` 一页一题只预取当前+下一题、瀑布流 6 并发；`setInterval` 都有 clear（`:737/789/946`）；`fetchLoggedIn` 有 `alive` 保护。

---

## 5. 错误处理与白屏风险

### A-ERR-1 [高] 全站没有 ErrorBoundary
- 事实：`client/src` 全目录检索 `ErrorBoundary|componentDidCatch|getDerivedStateFromError` **0 命中**；入口 `main.tsx` 直接 `ReactDOM.createRoot(...).render(<RouterProvider .../>)`。
- 影响：任何一个渲染期异常（后端返回结构变化、空数据解构、`undefined.map`）都会让 React 卸载整棵树 → **整页白屏**，且没有「重试/返回」入口；老年用户只会认为「网站坏了」。
- 建议：`main.tsx` 外包一层 ErrorBoundary（展示「页面出错了 + 刷新/回首页」），再给路由级加一层细粒度边界（至少答题页、成绩单页）。

### A-ERR-2 [中] 多处静默吞错，页面显示空数据而不是「加载失败」
- 位置：`Overview.tsx:127-129` 与 `:157-159`（`/api/project/setting`、`/api/report`、`/api/answer/list` 全部 `.catch(() => undefined/空表)`）；`Report.tsx:38-39`；`PartnerPanel.tsx:70`
- 影响：接口 500/网络断时页面看起来「正常但没数据」，用户以为项目是空的；排障也没有提示。
- 建议：至少 `message.error` + 空态区分「没有数据 / 加载失败，点击重试」。

### A-ERR-3 [低] 下载/导出的错误处理是正确的样本
- `client/src/pages/survey/Data.tsx:71-90`：识别后端「HTTP 200 + body.code=403（导出密码错误）」的约定并给出中文提示，可作为其它页面的参考实现。

### A-ERR-4 [低] 局部页面已有错误兜底
- `ExamResult.tsx:467-477`：`alive` + `message.error` + `finally` 收尾；`PublicAnswer.tsx:1012` 的 `fatal` 用 `Alert` 展示加载失败，不会白屏。

---

## 6. 性能

### A-PERF-1 [高] 单包 2MB、无路由级拆包
- 事实（2026-11-06 `npx vite build` 输出）：`dist/assets/index-*.js 2,002.44 kB │ gzip: 634.03 kB`，Vite 警告超过 1200 kB；`router.tsx:3-26` 全部页面静态 import，没有 `React.lazy`。
- 影响：首屏要下载/解析 2MB；老年用户设备、学校机房、手机弱网下尤其慢（答题页跑在同一个包体里）。
- 建议：路由级 `React.lazy` + `manualChunks`（antd、qrcode、dayjs 独立 chunk）；设计器/数据页按需加载；评估 antd 全量引入的按需方案。

### A-PERF-2 [中] 数据页与报告页一次性拉全量答卷
- 位置：`client/src/pages/survey/Data.tsx:166`、`pages/survey/Report.tsx:39`（均 `pageSize: -1`，注释也写明了）
- 影响：答卷上千时首屏要传输并解析全部答案 JSON，再在前端过滤/分页；内存与卡顿随数据线性增长。
- 建议：服务端分页 + 服务端筛选（后端 `PageQuery` 已支持）；统计类数据用 `/api/report`/`statProject` 的聚合结果，不要拉全量自己算。

### A-PERF-3 [低] 答题页 15 个 useEffect + 多路秒级定时器
- 位置：`PublicAnswer.tsx` 共 15 个 `useEffect`；闯关倒计时 250ms、限时/最早交卷/当前题 1s 各一路
- 影响：当前规模可接受；但在低端设备上，250ms 的状态更新会在答题时持续触发重渲染。
- 建议：倒计时改单一时钟源（一个 1s/250ms tick 派发剩余时间），避免多个 interval 竞争。

### A-PERF-4 [低] 背景图无尺寸/来源限制
- `PublicAnswer.tsx:1131`：设计器填的任意 URL 会作为全屏背景加载，大图会拖慢答题首屏；建议限制尺寸/格式或做 CDN 缩放。

---

## 7. 可访问性与可用性（老年用户）

### A-A11Y-1 [中] 小字对比度不达 WCAG AA（4.5:1）
按当前主题 token 计算（WCAG 2.1 相对亮度公式）：

| 组合 | 对比度 | 用途 |
| --- | --- | --- |
| 暗色 `--bp-text-soft #cfe2f6` | 8.69:1 | 正文辅助 ✓ |
| 暗色 `--bp-hint`（rgba(207,226,246,.8)） | 6.18:1 | 10–11px 小字 ✓（上一轮已改善） |
| 亮色 `--bp-hint`（rgba(63,76,92,.82)） | 5.04:1 | ✓ |
| 暗色 `--bp-orange #ff6b35` | **4.06:1** | 10–12px「必填未答 / 切屏 N / 已标记 N 题 / 本题超时」✗ |
| 亮色 `--bp-orange #e8590c` | **3.29:1** | 同上 ✗ |
| 暗色 `--bp-blue #4a90d9` | **3.44:1** | 13px「✓ 回答正确」✗ |
| `rgba(160,196,232,0.45)`（硬编码） | **2.52:1（暗）/ 1.25:1（亮）** | `renderer/questions/shared.tsx:45`「未命名题目」——亮色下几乎看不见 |

- 位置：`client/src/styles/global.css:17/78`（orange）、`:16/77`（blue）、`client/src/renderer/questions/shared.tsx:45`（硬编码色）
- 建议：为「小字」单独定义更深/更浅的强调色（如 `--bp-orange-text`），蓝色成功态单独给一个 ≥4.5:1 的绿/蓝；`shared.tsx:45` 改用 `var(--bp-text-soft)`；把对比度检查加进 UI 走查清单。

### A-A11Y-2 [中] `<a onClick>` 不可键盘操作
- 位置：`pages/exercise/List.tsx:264,299,566,600`；`pages/survey/Data.tsx:311`；`pages/survey/data/TrashDrawer.tsx:123-124`
- 影响：没有 `href` 的 `<a>` 不在 Tab 序列里、没有 `role`、不能回车触发——键盘/读屏用户完全用不了「详情/恢复/开始答题」等入口；老年用户外接键盘时也会卡住。
- 建议：统一换成 `<button type="button" className="bp-link">`（或补 `role="link" tabIndex={0} onKeyDown`）；样式沿用链接外观。

### A-A11Y-3 [低] 图标按钮缺可访问名
- 位置：`pages/survey/Data.tsx:453`（返回）、`:477`（刷新）等 `<Button icon={<XxxOutlined />} />` 无 `aria-label`/文字
- 影响：读屏只念「按钮」。范围里共有 8 处 `aria-*`，远少于交互元素数量。
- 建议：所有纯图标按钮补 `aria-label`（或 `title` + `aria-label`）；给 antd `Button` 统一封装 `IconButton`。

### A-A11Y-4 [正] 老年用户友好点是做到位的
- 字号调节（A-/A+/滑块 0.9–2.0×，`localStorage` 记忆）、整行可点的选项卡片（`.sk-option`）、判断题大按钮、答题卡大格子、`pointer-events` 与键盘可达的判题/标记按钮（带 `aria-pressed`）。

### A-A11Y-5 [低] 全站防复制会误伤老年用户
- 位置：`main.tsx` 全局挂载 `CopyGuard`/`Watermark`（`components/CopyGuard.tsx` 拦截右键/copy/cut/F12 等，默认开启）
- 影响：老年用户想复制题干去问家人会被拦；读屏/翻译插件也可能受影响。
- 建议：默认关闭，只在「考试进行中」开启；或至少给输入区之外提供「复制题目」按钮。

---

## 8. i18n 与主题硬编码

### A-I18N-1 [低] 两套文案机制并存：范围内 0 处 t()，全硬编码中文
- 事实：`client/src/i18n/index.ts:23` 提供 `t(id, fallback)`，`i18n/locales/zh-CN.json` 约 1200 条；`layout/BasicLayout.tsx` 在用 `t('menu.logout', '退出登录')`，但**本次审计的 5 个目录里 `t('` 命中数为 0**，所有按钮/提示/表头都是中文字面量。
- 影响：`zh-CN.json` 里 `pages.*` 大部分是死键；要支持英文只能重写页面；文案改动必须改代码。
- 建议：二选一并写进规范——(a) 统一走 `t()`（含 antd `ConfigProvider` 已用 zhCN）；(b) 明确「暂不支持多语言」，删掉死键并加注释，避免后来者误以为已有 i18n。

### A-THEME-1 [中] 多处硬编码颜色绕开 `--bp-*`，亮色主题下错色/不可见
- 位置与证据：
  - `pages/survey/Data.tsx:442,446`：固定列背景 `#263f62/#23446e`（深色主题值写死，亮色主题下固定列是深块）
  - `pages/survey/report/QuestionBlock.tsx:33`（图表 9 色调色板写死）、`:90`（`rgba(255,255,255,0.08)` 轨道，亮色主题下不可见）
  - `pages/survey/data/AnswerCards.tsx:24`（`rgba(30,58,95,0.55)` 面板）
  - `pages/survey/Editor.tsx:510`、`designer/RuleEditor.tsx:115`
  - `pages/exercise/List.tsx:121,533`、`pages/answer/PublicQuery.tsx:227`（`rgba(160,196,232,0.7/0.75)` 直接当文字色）
- 影响：`docs/ui-style.md:23`（「新增组件不写死颜色：用 `var(--bp-*)` 变量或 antd token」）的约定被这些点破坏；亮色主题（学校配色）下会出现深色块、隐形文字。
- 建议：全部替换为 `--bp-*`（图表调色板可新增一组 `--bp-chart-1..9` 变量，两套主题各给一份）。

---

## 9. 范围外的关联观察（仅记录，不在本次修复范围）

- 水印/防复制挂在路由之外（`main.tsx`），所以它对**公开答题页**也生效——答题者的复制行为被全站策略约束，建议按页面开关。
- `api/request.ts` 的全局 401 跳转（A-AUTH-4）影响所有公开页，建议统一修在 request 层。
- 后端 `submittedHtml/contentHtml` 无消毒（A-XSS-1），修在后端收益最大。

---

## 附录 A：验证方法

- 静态检索：`dangerouslySetInnerHTML|innerHTML|document.write`、`localStorage|sessionStorage`、`target=|window.open`、`@PreAuthorize`、`ErrorBoundary|componentDidCatch`、`t('`、`rgba(#hex)`、`Let alive` 等（ripgrep/Select-String，命中行号已写入各条目）。
- 对比度：按 WCAG 2.1 相对亮度公式对 `global.css` 当前 token 计算（计算结果见 A-A11Y-1 表）。
- 构建产物：`cd client && npx vite build` → `index-*.js 2,002.44 kB (gzip 634.03 kB)`，Vite 给出超 1200 kB 警告。
- 前端 guard 与后端注解对照：抽查 `ProjectApi.java`、`AnswerApi.java`、`SurveyApi.java`。

## 附录 B：做得好的地方（避免误伤）

- 权限守卫 `RequirePerm` 有 loading/403 状态，不会闪；
- `mapWithConcurrency`、首屏预取、`doSubmitRef/valuesRef`（修掉空白卷事故）都在；
- `Data.tsx` 的下载错误约定处理、`ExamResult/Practice/Editor` 的 `alive` 保护；
- 字号调节、整行可点选项、答题卡大格子对老年用户友好；
- 只有一个 chunk 但 gzip 634 kB 说明压缩已开，剩下的是拆包问题而非压缩问题。

## 未覆盖 / 限制

1. 未做动态渗透（未尝试在真实环境构造存储型 XSS 载荷）；
2. 未做读屏器/键盘真机测试，A11Y 结论来自代码与对比度计算；
3. 后端权限注解只抽查了 project/answer 两个 Api，未逐接口核对；
4. `pages/survey` 下部分文件（Overview/Data/Report）体量大，本次按风险点抽查，未逐行通读；
5. 性能数据来自一次本地构建，未做 Lighthouse/真机弱网测量。
