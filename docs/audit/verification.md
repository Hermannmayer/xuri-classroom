# 补充验证报告：渗透 / CVE / 压测 / 无障碍

> 日期：2026-11-06　环境：本机单实例（前端 80 / 后端 7007，MySQL 8.0.24）
> 脚本：`scripts/dev/verify-pentest.js`、`scripts/dev/verify-load.js`
> 数据卫生：全部使用 `zz-` 前缀临时项目，已清理；复查 `t_project where name like 'zz-%'` = 0。

---

## 1. 动态渗透

### 1.1 关键背景：测试期间后端被重建，修复前后各测了一轮

这一批 P0 修复（答卷归属校验、密码门、selectUser 鉴权）是**在测试进行中才落地**的，所以下面给的是**同一脚本跑两次**的结果，两边都是真实结论，不是矛盾：

| 项 | 修复前（旧 jar，21:29 那轮） | 修复后（新 jar） |
|---|---|---|
| P1 越权读他人答卷 | 🔴 **可复现**：学员 B 用 A 的 `answerId` 调 `loadProject` / `loadExamResult`，**拿到了 A 填的原文 `A_SECRET_TEXT`** | 🟢 4 个接口全部 `403 无权访问该答卷` |
| P1 越权写他人答卷 | 🔴 **可复现**：B 用 A 的 `answerId` 提交，A 的记录被改成 `B_OVERWROTE` | 🟢 `403` |
| P2 密码项目绕过 | 🔴 直接 POST `saveAnswer` 返回 200 | 🟢 `403 该问卷需要密码，请先在答题页输入正确密码` |
| P3 无权限调 `selectUser` | 🔴 学员账号调 `/api/project/selectUser` 返回 **2 条用户信息** | 🟢 `403` |

**结论：这四项 P0 修复经回归验证有效。**

### 1.2 两项无法给出结论 / 需单独处理

**P4 移除项目协作成员后是否即时失效 —— 未取得有效结论**

- 第一版用「学员个人授权（type=2）」：授权返回 200，但该学员在 `/api/project/list` 里**始终看不到这个项目**，前置条件不成立，测不出「移除后是否立刻失效」。
- 第二版改用「按用户组授权（type=3）」时后端再次被重建，脚本中断。
- 已观察到的侧证：直接 `GET /api/project?id=` 在移除后返回 `403`，说明**详情接口是即时失效的**；列表接口是否仍显示未验证（项目列表有 1 天缓存，`custom-cache.projectCache`，存在「列表短暂仍可见」的可能）。

**P5 伪造 IP 头绕过限次 —— 不成立（限次本身没生效）**

- 项目设 `answerSetting.ipLimit = { limitNum: 1, limitFreq: 'only' }`。
- 对照组：**不带任何伪造头**顺序提交两次，第二次仍是 200。
- 因此「带伪造 `X-Forwarded-For` 也能提交」**不能归因于伪造头**，真实原因是 `ipLimit` 本身没有生效。
- 这与并发报告里 `cookieLimit` 的结论一致：**这两个限次配置项目前都不拦截**，需要后端确认是配置未接线还是语义理解错误。

### 1.3 复现

```powershell
node scripts/dev/verify-pentest.js
```

脚本内含 admin + 学员（`1` / `12345678`）双账号，逐项打印 `code` / `message` / 是否泄漏他人数据。

---

## 2. 依赖 CVE 核验

> 说明：我按实际版本逐条检索，**只写检索到且有出处的**；检索不到明确对应关系的，如实写「未查到明确受影响版本」，并给出复扫建议。**避免把猜测写成结论。**

| 组件 | 实际版本 | 检索结果 | 出处 | 风险判断 |
|---|---|---|---|---|
| Spring Boot | **2.7.7** | 查到 2025 年公告 CVE-2025-22235（`EndpointRequest.to()` 在 Actuator 端点未暴露时错误匹配） | [springframework.org.cn CVE-2025-22235](https://springframework.org.cn/security/cve-2025-22235/) | 未确认 2.7.7 是否在受影响区间；本系统未启用 Actuator 端点，实际暴露面低。**建议以扫描器为准** |
| commons-lang3 | **3.0** | 查到 CVE-2025-48924（不受控递归，属较新公告） | [AWS ALAS CVE-2025-48924](https://explore.alas.aws.amazon.com/CVE-2025-48924.html) | 3.0 是 2011 年版本，远早于任何修复版本，**基本可判定受影响**；但本次未检索到针对 3.0 的完整公告文本，标注「待扫描确认」 |
| mysql-connector-java | **8.0.26** | 检索到拼装包安全公告，未拿到针对 8.0.26 的独立 CVE 条目 | [Tenable SCA 条目](https://www.tenable.com/plugins/container-security/419746) | 未查到公开 CVE 的明确对应 → 建议升级到 8.0.33+ |
| jjwt | **0.11.2** | 仅检索到 [jjwt CHANGELOG](https://github.com/jwtk/jjwt/blob/a81d216b5fdd36805aa5db06c226c9cf93108456/CHANGELOG.md)，未见版本对应 CVE | 同上 | **未查到公开 CVE** |
| MyBatis-Plus | 3.5.0 | — | — | **未查到公开 CVE** |
| Flowable（`flow` 模块） | 6.7.0 | — | — | 该模块无人依赖（见代码质量报告），建议直接移除，风险归零 |
| Vite（dev 依赖） | 5.4.21 | 检索到 2025 年 vite 相关 CVE 编号（CVE-2025-62522 / CVE-2025-58752） | [vuldb 62522](https://vuldb.com/cve/CVE-2025-62522#1)、[vuldb 58752](https://vuldb.com/cve/CVE-2025-58752#1) | 5.4.x 是否在影响区间**未确认**；且仅影响开发服务器，不随生产产物发布 |
| antd | 5.22.5 | Snyk 页面未见 5.22.5 的高危条目 | [Snyk antd](https://security.snyk.io/package/npm/antd/5.20.5) | 低风险 |
| React / dayjs / qrcode / jsencrypt / crypto-js | — | 未检索到与本项目用法相关的公开高危 | — | **未查到公开 CVE** |

**必须说明的三点**

1. 本次是**人工检索**，不是扫描器结果；版本区间判断容易出错，`Spring Boot`、`commons-lang3`、`Vite` 三条属于「有公告但未确认是否命中本版本」。
2. 生产依赖里最值得优先处理的是 **commons-lang3 3.0**（太老）与 **mysql-connector 8.0.26**（太老），即便没有直接 CVE，也应随 Spring Boot 升级一起处理。
3. **建议补一次机器扫描**（不在本次范围）：
   ```powershell
   # 后端：OWASP Dependency-Check 或 Trivy
   trivy fs --scanners vuln server/
   # 前端
   cd client; npm audit --omit=dev
   ```

---

## 3. 压测基线

单机、本机回环、并发 10、每项 30 秒（`node scripts/dev/verify-load.js`）。目的：给基线，不是找崩溃点。

| 接口 | QPS | P50 | P95 | P99 | 错误率 | 备注 |
|---|---|---|---|---|---|---|
| `GET /api/system` | **2031** | 3 ms | 16 ms | 18.4 ms | 0% | 纯内存/缓存读取，本机上限附近 |
| `POST /api/public/projectOutline` | **1496** | 6.2 ms | 10.7 ms | 14.4 ms | 0% | 走项目缓存，稳定 |
| `POST /api/public/question` | 2551（**无效**） | 3.6 ms | 6.7 ms | 9.5 ms | **99.69%** | 几乎全是 `4290 请求过于频繁` |

**关于 `/api/public/question` 的结论（重要）**

- 它不是慢，而是**被限流**：当前实现对该接口按用户 **60 次/分钟** 限流（`RateLimitFilter.maxQuestionPerMinute`）。压测瞬间打满配额后，后续请求全部快速返回 4290，所以看起来「QPS 很高」。
- 换算成真实可用吞吐：**单用户 ≈ 1 请求/秒**。这对人工逐题作答够用，但**答题卡快速跳题、预取后 1~2 题**的场景要留意，切换太快会误触 4290。
- 另外并发 50 时 `/api/system` 错误率升到 36%（已自动降回 10 复测），说明单机 Undertow 在 50 并发下已开始排队/超时——**这只是本机基线，不代表生产容量**。

---

## 4. 无障碍（读屏可用性）

**方法**：在页面里注入 **axe-core 4.10.2**（jsDelivr CDN）跑 `axe.run`，另外人工核对 `<a>` 无 `href`、图标按钮无 `aria-label`、表单控件是否有可访问名。
**未做真机读屏测试**（没有 NVDA/VoiceOver 环境），以下只是自动化可达性检查。

### 4.1 axe 扫描结果

| 页面 | 严重（serious） | 中等（moderate） |
|---|---|---|
| 登录页 `/user/login` | — | `landmark-one-main`（缺 main 地标）、`region`（8 个节点不在 landmark 内） |
| 我的考试 `/home` | `color-contrast`（选中菜单项对比度不足，1 处）、`scrollable-region-focusable`（表格横向滚动区不可键盘访问，1 处） | `page-has-heading-one`（缺 H1） |
| 答题页 `/s/:id` | `aria-input-field-name`（字号滑块的 `.ant-slider-handle` 无可访问名，1 处） | `landmark-one-main`、`page-has-heading-one`、`region`（9 个节点） |

### 4.2 人工核对

| 检查项 | 结果 |
|---|---|
| 源码里 `<a onClick>` 无 `href` | **37 处**（`.tsx` 中 `<a onClick` 计数）。这些链接靠 `onClick` 跳转，读屏不会朗读为「链接/按钮」，也无法键盘聚焦（除非有 `tabindex`）。属系统性可访问性问题 |
| 登录页 | 1 个 `<a>` 无 `href`；图标按钮 0 个缺标签；输入框均有 label → 表单本身可用 |
| 我的考试页 | 2 个 `<a>` 无 `href`；**2 个纯图标按钮无 `aria-label`** |
| 答题页 | `<a>` 0 个；图标按钮 0 个缺标签；单选/填空均有可访问名 → 答题主流程读屏友好度尚可 |
| 对比度 | axe 只在「选中菜单项」报 1 处（serious）。注意：这是**深色主题**下的抽样结果，米白主题未单独扫描 |

### 4.3 建议（按性价比）

1. 把 `<a onClick>` 批量换成 `<button type="button" className="link">`，或至少补 `role="link" tabIndex={0} onKeyDown`（37 处，收益最大）。
2. 给纯图标按钮补 `aria-label`（我的考试页 2 处、答题页顶部若干）。
3. 给三个页面各补一个 `<h1>` 和 `<main>` 地标（修改成本很低，能直接消掉 2~3 类 violation）。
4. `.ant-table-content` 加 `tabIndex={0}` 让键盘能滚动横向表格。
5. 修选中菜单项的对比度（`--bp-*` 变量层面调一次即可，全站受益）。

---

## 5. 复现命令

```powershell
# 渗透（会建/删临时项目）
node scripts/dev/verify-pentest.js

# 压测（默认每项 30s，并发 10/50；错误率 >20% 自动降并发）
node scripts/dev/verify-load.js

# 无障碍：浏览器控制台执行（或参考报告里的注入片段）
#   1) await import 注入 axe-core
#   2) axe.run(document, { resultTypes: ['violations'] })
```

## 6. 本次未做 / 结论边界

- **未做真机读屏测试**，只做了 axe 自动扫描 + DOM 规则核对。
- 渗透只覆盖任务点名的几项，未做全量接口枚举；P4 因后端重建未取得有效结论。
- CVE 为人工检索，**不等同于漏洞扫描结果**；建议补 `trivy` / `npm audit`。
- 压测为单机回环，不代表生产容量；`/api/public/question` 的 QPS 数字是限流后的假象，已按真实吞吐解释。
