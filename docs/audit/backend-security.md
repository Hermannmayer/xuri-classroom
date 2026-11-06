# 后端安全审计（SurveyKing `server/**`）

> 审计时间：2026-11-06 20:2x–20:5x ｜ **只读审计**：未改任何源码、未重启服务、未执行 git 操作。
> 范围：`server/api`（控制器）、`server/rdbms`（服务/MyBatis）、`server/shared`（安全配置/DTO/工具）。
> 基线：当前工作区（未提交状态）。`SurveyServiceImpl.java` 1655 行、`WebSecurityConfig.java` 151 行、`FileServiceImpl.java` 630 行。
> 方法：逐控制器核对 `@PreAuthorize` / `@EnableDataPerm`；沿服务层追权限判断；对字符串拼 SQL 的位置逐个看参数来源；静态分析为主，**唯一实测项**是 §1.1 的 IDOR（用两个账号的答卷 id 交叉调用公开接口，只读）。
> 分级：严重 / 高 / 中 / 低。每条给 **文件:行号**、复现思路、最小修复。拿不准的明确标「待确认」，不臆测。

## 0. 结论速览

| 等级 | 数量 | 代表问题 |
|---|---|---|
| 严重 | 1 | 公开接口按 `answerId` 可读**任意人**的答卷/成绩/（开启解析时的）正确答案 |
| 高 | 4 | 公开接口按 `answerId` 可**覆盖**他人答卷；提交绕过密码/登录/白名单；登出后 token 8 小时有效；公开统计接口无发布校验 |
| 中 | 8 | 切屏计数可被他人伪造；IP 限次与匿名限流可被 `X-Forwarded-For`/`X-Real-IP` 伪造；`ProjectApi.select*` 仅登录即可枚举用户手机号/邮箱；`frameOptions` 关闭；`@Async` 身份继承；`Dashboard` 未按用户过滤（且疑似 NPE，待确认）；CSRF 关闭（SameSite=Lax 缓解，中/低边界） |
| 低 | 8 | 登录名枚举、注册角色枚举、JWT 类型未区分致 500、`downloadTemplate` 入参未校验（待确认）、`@EnableDataPerm` 返回 500、按组授权在 `@EnableDataPerm` 处被漏判、RSA 1024 + 源码内置默认私钥、`commons-lang3:3.0` 等旧依赖（待确认） |

**Top 5 最该先修**：§1.1 公开接口 IDOR（读） → §2.1 公开接口 IDOR（写） → §2.2 提交绕过访问控制 → §2.3 登出/改密不失效 → §3.4 `ProjectApi.select*` 无授权。

---

## 1. 严重

### 1.1 公开接口按 `answerId` 可读任意人的答卷（IDOR）

**证据**
- 根因：`server/rdbms/src/main/java/cn/surveyking/server/impl/SurveyServiceImpl.java:1131-1146` —— `getAnswerForProject(projectId, answerId)` 只校验「这份答卷属于这个项目」，**从不校验答卷人是不是当前用户**：
  ```java
  AnswerView answerView = answerService.getAnswer(answerQuery);          // :1137
  if (answerView == null || !Objects.equals(projectId, answerView.getProjectId())) {  // :1138
      throw new AccessDeniedException("无权限访问该答案");
  }
  ```
- 调用点（都在 `/api/public/**`，`WebSecurityConfig.java:76` 对 `/api/public/**` 全部 `permitAll`）：
  - `SurveyServiceImpl.java:185-202`（`loadProject` 带 answerId 分支，`:193` 调用）→ `POST /api/public/projectOutline`、`POST /api/public/loadProject`（`server/api/.../SurveyApi.java:37-46`）
  - `SurveyServiceImpl.java:616-638`（`loadExamResult`，`:618` 调用）→ `POST /api/public/loadExamResult`（`SurveyApi.java:161-164`）
- **实测（2026-11-06，只读）**：用 admin 会话带**另一位用户**（`createBy=2118380136249200642`）的 `answerId` 调 `POST /api/public/projectOutline {id: "<projectId>", answerId: "<uuid>"}`，响应里出现 `answer` 字段（4 个答案 key）；不带 answerId 时无 `answer` 字段。

**复现**
```bash
# 1) 读他人答卷内容（题目答案）
curl -s -H 'Content-Type: application/json' \
  -d '{"id":"<projectId>","answerId":"<别人的answerId>"}' \
  https://host/api/public/projectOutline
# 2) 读他人成绩 + 逐题答案；若发布方开了「显示答案解析」且考试已结束，还带正确答案与解析
curl -s -H 'Content-Type: application/json' \
  -d '{"id":"<projectId>","answerId":"<别人的answerId>"}' \
  https://host/api/public/loadExamResult
```

**危害**：考试成绩、答卷内容、正确答案（开启解析时）全部可被未登录者读取。`answerId` 是 UUID，前置条件是「知道 answerId」；但 answerId 出现在成绩单 URL（`/s/:id/exam-result/:answerId`，`client/src/router.tsx`）里，会随链接、截图、Referer、日志外流。对以「考试成绩」为核心价值的系统属**严重**。

**最小修复**：`getAnswerForProject` 增加归属判断——
- 已登录：`answer.createBy == 当前 userId` 才放行；
- 匿名：要求 request 里带答题时下发的一次性签名（例如把 `answerId` 与 `createBy`/cookie 绑定后签名），或改用「答题时下发的随机 cookie + answerId」双因子；
- 教师/管理端读他人答卷走 `AnswerApi` 的 `@EnableDataPerm` 链路，不要复用这个公开方法。

---

## 2. 高

### 2.1 公开接口按 `answerId` 可**覆盖**他人答卷（写 IDOR）

**证据**
- `SurveyServiceImpl.java:373-383`：客户端只要传了 `id`，就先 `getAnswerForProject(projectId, request.getId())`（`:376`，同样不校验归属），随后仅判断「是否允许修改答案」：
  ```java
  boolean enableUpdate = Boolean.TRUE.equals(project.getSetting().getSubmittedSetting().getEnableUpdate()); // :377
  boolean tempSaving = Integer.valueOf(0).equals(request.getTempSave());                                   // :379
  if (!enableUpdate && !tempSaving) { throw new ErrorCodeException(ErrorCode.AnswerChangeDisabled); }      // :380
  ```
- 之后 `answerService.saveAnswer(request)`（`:402`）→ `AnswerServiceImpl.saveAnswer` 有 id 就转 `updateAnswer`（`AnswerServiceImpl.java:225-227`）→ `updateById`（`:286-290`）。
- 端点：`POST /api/public/saveAnswer`（`SurveyApi.java:85-89`），公开可访问。

**复现**：目标问卷开了「允许修改答案」时：
```bash
curl -s -H 'Content-Type: application/json' -d '{
  "projectId":"<projectId>", "id":"<别人的answerId>",
  "answer":{"<qid>":{"<optId>":true}}, "survey":{...}
}' https://host/api/public/saveAnswer
```
→ 返回 200，原答卷被改写（分数由 `computeExamScore` 重算覆盖）。

**危害**：未登录者篡改他人考试成绩/答案（破坏完整性），可被用于「改高/改低某人的分」。

**最小修复**：同 §1.1 的归属校验（在 `getAnswerForProject` 里统一做）；另外 `saveAnswer` 应在更新前再确认 `answerView.getCreateBy()` 与当前身份一致。

### 2.2 提交答卷绕过密码 / 登录 / 白名单校验

**证据**
- 打开问卷时校验完整：`SurveyServiceImpl.java:187`（`convertAndValidateLoginFormIfNeeded(project, null)`）+ `:330`（`validateProject` 校验链）。密码比对在 `:1253-1259`（`answerSetting.password`），登录/白名单表单在 `:1424-1470`（`loginRequired`、系统用户/导入用户白名单）。
- 但**提交**入口只做「可交卷」检查：`SurveyServiceImpl.java:353-360`
  ```java
  ProjectView project = projectService.getProject(projectId);                 // :356
  validateSubmittable(project, !isNotBlank(request.getId()));                 // :358
  SurveyWechatIdentity wechatIdentity = requireWechatAccess(project);         // :359
  ```
  `validateSubmittable`（`:857-882`）只校验：项目存在、`setting.status != 0`、`answerSetting.endTime` 未过、新建答卷时 `maxAnswers` 未满——**没有**密码/登录/白名单/开始时间校验。

**复现**：对设置了答题密码（或「需要登录」「白名单」）的问卷，绕过页面直接：
```bash
curl -s -H 'Content-Type: application/json' \
  -d '{"projectId":"<projectId>","answer":{"<qid>":{"<optId>":true}}}' \
  https://host/api/public/saveAnswer
```
→ 只要项目已发布、未过期、未满额，就能写入一份答卷（匿名，`createBy=null`）。

**危害**：密码/白名单/登录限制形同虚设——可批量灌水、污染统计、对「仅限白名单」的考试塞入无效答卷。

**最小修复**：`saveAnswer` 开头复用打开问卷的校验链（把 `convertAndValidateLoginFormIfNeeded` + 密码校验抽成 `assertSubmissionAccess(project, request)`，在 `:358` 之后调用）。

### 2.3 登出（及改密）后 JWT 仍然有效

**证据**
- `server/api/.../UserApi.java:78-82`：`logout` 只清 cookie（`authenticationCookieService.clearCookie(httpRequest)`），没有服务端失效逻辑。
- `AuthenticationCookieService.java:26-29` 也只是 `maxAge(0)` 的响应 cookie。
- `JwtTokenUtil.java:33` 密钥在内存随机生成、`:38-43` 签发 8 小时 token；全仓无 token 黑名单/版本号（grep `blacklist|revoke|tokenVersion` 无命中）。
- 有效期：`server/api/src/main/resources/application.yml:41` `expiration-seconds: 28800`。

**复现**：登录拿到 `Authorization`/cookie → 调 `/api/public/logout` → 用同一个 token 继续请求 `/api/currentUser`，仍返回 200。改密码后同理（`UserServiceImpl` 改密不触碰已签发 token）。

**危害**：token 一旦外流（日志、截图、共享电脑、XSS），在剩余有效期内（最长 8 小时）可被重放；「退出登录」给用户错误的安全感。

**最小修复**：加 `jti` 黑名单（Caffeine、TTL=剩余有效期）或给用户表加 `token_version`，登出/改密时自增；`JwtTokenFilter` 校验版本。

### 2.4 `POST /api/public/statistics` 无发布状态与权限校验（信息泄露）

**证据**
- `server/api/.../SurveyApi.java:75-78` → `SurveyServiceImpl.statProject`（`:342-349`）：
  ```java
  answerQuery.setProjectId(query.getId());                 // :344
  List<AnswerView> answers = answerService.listAnswer(answerQuery).getList();  // :346
  ProjectView project = projectService.getProject(query.getId());              // :347
  return new ProjectStatHelper(project.getSurvey(), answers).stat();
  ```
  没有任何发布状态/密码/权限判断，也不校验项目是否存在可见性（对任意 id 直接查答卷并统计）。

**复现**：`POST /api/public/statistics {"id":"<任意projectId>"}` → 返回该问卷的答卷数/各选项分布（即使问卷是草稿、未发布、或被密码保护）。

**危害**：跨租户读取任意项目聚合数据（数量、选项分布），可用于探测未发布问卷内容结构。

**最小修复**：复用 `validateProject(project)`（状态 + 时间 + 可见性），或要求登录并校验项目权限后再统计。

---

## 3. 中

### 3.1 切屏计数可被任意人伪造（可逼他人自动交卷）

**证据**：`SurveyServiceImpl.java:436-467`。带 `answerId` 时只校验项目归属：
```java
answer = answerService.getById(request.getAnswerId());                                // :446
if (answer == null || !Objects.equals(request.getProjectId(), answer.getProjectId())) {  // :447
    throw new AccessDeniedException("无权限访问该答案");
}
...
metaInfo.setSwitchScreenTimes(times + 1);  answerService.updateById(answer);          // :461-465
```
端点 `POST /api/public/exam/switch-screen`（`SurveyApi.java:181-184`）公开。

**复现**：`curl -d '{"projectId":"<P>","answerId":"<他人answerId>"}' /api/public/exam/switch-screen` 反复调用 → 对方 `switchScreenTimes` 递增（前端据此触发「切屏超限自动交卷」）。

**危害**：强制他人交卷（破坏考试公平），或伪造自己的切屏记录。

**最小修复**：与 §1.1 同源——校验 `answer.createBy`（匿名则用 cookie 绑定）。

### 3.2 每 IP 限次可被 `X-Forwarded-For` 伪造绕过

**证据**
- `server/shared/.../core/uitls/IPUtils.java:11-20`：按 `X-Forwarded-For, Proxy-Client-IP, ...` 顺序取第一个非空值，**不校验来源是否可信代理**。
- 使用方：`SurveyServiceImpl.java:1182-1186`（`validateIpLimit`）——`answerSetting.ipLimit` 的计数键就是它。
- 端点相关：`POST /api/public/saveAnswer`。

**复现**：每次提交带不同的 `X-Forwarded-For: 1.2.3.N`，同一 IP 的限次不会累计。

**危害**：每 IP 限次（`ipLimit`）失效；审计日志里的 IP 也可伪造。

**最小修复**：配置可信代理白名单（只有来自反代的请求才读 `X-Forwarded-For`，且取最右侧受信跳），其余用 `request.getRemoteAddr()`。

### 3.3 匿名限流的桶键同样可伪造，且覆盖面偏窄

**证据**：`server/shared/.../core/security/RateLimitFilter.java`
- 覆盖面：`GUARDED_PREFIXES = { "/api/repo", "/api/template", "/api/project" }`（`:39`）+ `/api/public/question`（`:46`）；**不含** `/api/public/saveAnswer`、`/api/user`、`/api/answer`、`/api/file`。
- 匿名桶：`:92-97` 优先用 `X-Real-IP`，可伪造 → 每个请求换一个假 IP 即换一个新桶。
- 登录限流本身是安全的：`UserApi.java:52-55` 用 `httpRequest.getRemoteAddr()` + `LoginAttemptLimiter`（10 次/10 分钟，`:16-24`）✓

**危害**：脚本刷公开接口（逐题抓题）可绕过限流；登录爆破仍受限流保护（正面）。

**最小修复**：匿名桶改用 `remoteAddr`（或受信代理解析）；把 `saveAnswer` 等写接口纳入限流。

### 3.4 `ProjectApi.select*` 8 个接口无授权注解（登录即可枚举用户/组织）

**证据**：`server/api/.../ProjectApi.java:206-278`：
`/selectUser`(206)、`/selectDept`(216)、`/selectRole`(226)、`/selectPosition`(236)、`/selectDict`(245)、`/selectTemplate`(255)、`/selectRepo`(265)、`/selectTag`(275) —— 均无 `@PreAuthorize`、无 `@EnableDataPerm`；`WebSecurityConfig.java:77` 只要求 `/api/**` 已认证。

其中 `selectUser` 返回 `UserInfo`（`UserServiceImpl.selectUsers:645-668` → `UserInfo::simpleMode`），而 `UserInfo` 的 `phone`/`email` **没有** `@JsonIgnore`（`server/shared/.../dto/UserInfo.java:46`、`:48`；被忽略的只有 status/username/password/authorities），`simpleMode()` 只剥 `authorityList`（`UserInfo.java` 末尾）。

**复现**：任意已登录学员账号（注册后由管理员启用）：
```bash
curl -b cookie.txt -H 'Content-Type: application/json' -d '{"name":""}' \
  https://host/api/project/selectUser
```
→ 全量用户列表（含手机号、邮箱、部门）。

**危害**：用户个人信息批量泄露、组织架构/岗位/角色枚举，为社工与口令喷洒提供素材。

**最小修复**：给 `selectUser/selectDept/selectRole/selectPosition/selectDict` 加最小权限（如 `project:create` 或 `system:user:list`）；`selectUser` 改成精简 DTO（仅 id+name），或按「当前用户可见范围」过滤。

### 3.5 点击劫持：`X-Frame-Options` 被关闭且无 CSP

**证据**：`server/shared/.../config/WebSecurityConfig.java:69` `http.headers().frameOptions().disable();`；全仓 grep 未见 `Content-Security-Policy` 配置。

**危害**：任意站点可 iframe 嵌入系统页面做点击劫持（诱导管理员点「删除/授权/发布」）。

**最小修复**：改回 `frameOptions().sameOrigin()`，至少给管理端加 `frame-ancestors 'self'`。

### 3.6 `@Async` 线程复用导致身份串号（跨用户数据归属错误）

**证据**
- `WebSecurityConfig.java:57`：`SecurityContextHolder.setStrategyName(MODE_INHERITABLETHREADLOCAL)`。
- `UserBookServiceImpl.java:57`、`:74-84`：`@Async` 方法内部用 `SecurityContextUtils.isAuthenticated()/getUserId()`（`:80`、`:83`）决定写入哪个用户的错题本；`AppConfig.java:48-56` 的 `ThreadPoolTaskExecutor` 没有 `TaskDecorator`（不显式传递/清理）。
- `INHERITABLETHREADLOCAL` 只在线程**创建那一刻**复制上下文；线程池复用后，后续任务会沿用上一个任务的用户身份。

**危害**：并发提交时可能把 A 的错题记到 B 名下（数据归属错误）；若线程曾以管理员身份创建，后续任务可能拿到管理员上下文（待实测确认具体触发条件）。

**最小修复**：改为在提交线程取 `userId` 显式作为参数传入；或配置 `TaskDecorator` 在任务前后 `set/clear` SecurityContext。

### 3.7 `GET /api/dashboard/list` 不按用户过滤（且疑似 NPE，待确认）

**证据**：`server/api/.../DashboardApi.java:24-27`（无 `@PreAuthorize`，仅登录）；`server/rdbms/.../impl/DashboardServiceImpl.java:29-33` 只按 `type`/`projectId` 过滤，**没有 createBy/项目权限过滤**。另外该类的 `private DashboardViewMapper dashboardViewMapper;` 字段（`:26`）既非 `final` 也无 `@Autowired`（配合 `@RequiredArgsConstructor` 不会注入）→ 一调用大概率 NPE（**待确认**：需运行时验证）。

**危害**：若注入正常，则任意登录用户可读任意项目的仪表盘配置/统计数据；当前大概率是「一调就 500」的死接口。

**最小修复**：确认该接口是否还需要；保留则加项目权限过滤与授权注解，并修掉注入。

### 3.8 CSRF 关闭 + Cookie 认证（SameSite=Lax 兜底，风险中/低）

**证据**：`WebSecurityConfig.java:70` `csrf().disable()`；认证靠 cookie（`AuthenticationCookieService.java:21-24`，`httpOnly=true, sameSite=Lax`）。现代浏览器对 `SameSite=Lax` 的 cookie **不会**随跨站 POST 发送，因此当前主要风险面被压住；若将来改成 `SameSite=None`（如跨域前端）或旧浏览器，则所有写接口可被 CSRF。

**建议**：保留 `SameSite=Lax` 并在文档里写明禁止改 `None`；或加自定义头校验（`X-Requested-With`）作为纵深。

---

## 4. 低

### 4.1 登录名枚举
`server/api/.../SystemApi.java:251-254` `GET /api/system/checkUsernameExist?username=`（需登录，但任意登录用户可探测账号存在性）。建议合并进注册/找回流程并加频率限制。

### 4.2 公开注册角色枚举
`server/api/.../UserApi.java:109-112` → `UserServiceImpl.getRegisterRoles`（`:750-762`）返回系统配置的可注册角色 id/name；`GET /api/public/listRegisterRole` 公开。信息量小，建议只在注册页按需返回。

### 4.3 JWT 未区分 token 类型（可触发 500）
`JwtTokenUtil.java:52-73` `validate()` 只看签名/有效期；`JwtTokenFilter.java:58` 通过后，`:65` 直接 `jwtTokenUtil.getUser(token).getUserId()` —— 对「survey-wechat token」`getUser` 返回 `null` → NPE，而 `:86` 只 `catch (AuthenticationException)` → 500。建议 `validate` 里校验 claim 类型，或 `getUser` 判空。

### 4.4 `downloadTemplate(name)` 入参未校验（待确认）
`FileApi.java:74-78` → `FileServiceImpl.java:593-600`：`"template/" + name + ".xlsx"` → `ClassPathResource`。`name` 未过滤 `../`；能否读到 `template/` 之外的文件取决于 Spring `ClassPathResource` 对 `..` 的处理（**待确认**，需实测），且需要 `file:import` 权限、强制 `.xlsx` 后缀。建议白名单校验（`[a-zA-Z0-9_-]{1,64}`）。

### 4.5 `@EnableDataPerm` 越权时返回 500
`server/shared/.../core/aop/DataPermAspect.java:58-59` 抛 `InternalServerError("没有权限访问本问卷")` → HTTP 500 而非 403；语义错误且会进错误监控。建议改 `AccessDeniedException`。

### 4.6 按组授权在 `@EnableDataPerm` 处被漏判（功能不一致，非越权）
`ProjectPartnerMapper.java:14`：`select distinct project_id from t_project_partner where user_id = #{userId} and type in (1,2)` —— 只认「按人授权」，**不认 `group_id`（按组授权）**，也不含项目创建者（若创建时未写 partner 行）。表现：被「按组」授权为协作者的老师能在 `GET /api/project/list` 看到项目，但调用 `@EnableDataPerm` 覆盖的接口（`ProjectApi.update/delete/partner/*`）会 500「没有权限访问本问卷」。（安全上是**多拦**，不是越权；但会造成「看到却打不开」的诡异状态。）

### 4.7 RSA 密码传输：1024 位 + 源码内置默认私钥
`server/shared/.../core/uitls/RSAUtils.java:22-25` 内置一对固定公私钥；`:27-34` 启动时 `@PostConstruct` 重新生成（默认值只作兜底，实际有没有生效**待确认**：取决于 bean 初始化顺序）；`:44` `keyPairGen.initialize(1024, ...)`，源码注释也写着「建议将密钥长度改为 2048」。密码 RSA 加密只是 TLS 的补充，**部署必须启用 HTTPS**（否则 cookie 明文传输，登录即被劫持）。

### 4.8 依赖面（待确认，未联网核对 CVE 修复区间）
`server/build.gradle:2` Spring Boot **2.7.7**（已停止维护，2.7.x 最后一个版本是 2.7.18）；`server/build.gradle:50` `commons-lang3:3.0`（2011 年版本，远落后于 3.18）；`server/build.gradle:51` `anji-plus captcha 1.3.0`；`server/rdbms/build.gradle:20` `mysql-connector-java 8.0.26`；`server/shared/build.gradle:20-22` `jjwt 0.11.2`；`server/shared/build.gradle:16-19` `fastexcel 0.12.x`；容器是 Undertow（`server/build.gradle:47`，版本由 Boot 管理未固定）。**这些版本均处于多个已知 CVE 的修复区间之前（具体 CVE 需联网核对，标「待确认」）**。建议：整体升级到 Spring Boot 2.7.18（或 3.x），并把上面几个依赖提到当前维护版本。

---

## 5. 已验证的正面控制（避免误伤，也给后续改动留约束）

| 控制 | 证据 |
|---|---|
| JWT 密钥每次启动随机生成（HS512），源码无硬编码密钥 | `JwtTokenUtil.java:33`、`:90-94` |
| 认证 cookie `HttpOnly` + `SameSite=Lax` + HTTPS 时 `Secure` | `AuthenticationCookieService.java:21-24`、`JwtTokenFilter.java:77-82` |
| 登录失败限次（按 socket 地址 + 用户名，10 次/10 分钟） | `UserApi.java:52-55`、`:73`；`LoginAttemptLimiter.java:16-24` |
| 注册强制 `role=null`、`status=0`（待审核）、强密码校验 | `UserServiceImpl.java:702-738`（`String role = null;` 在 `:728`，`request.getRole()` 实际未被使用） |
| 上传：原文件名黑名单、路径段白名单、扩展名白名单、像素/大小/频率/配额 | `FileServiceImpl.java:298-305`、`:318-323`、`:146-162`、`:170-175`、`:367-379`、`:389-414` |
| 公共文件读取必须 `shared=1`；用户文件需本人或 shared | `FileServiceImpl.java:519-524`、`:558-564` |
| 下载 `inline` 仅限安全扩展名 + `X-Content-Type-Options: nosniff` | `FileServiceImpl.java:572-576`、`:588-591` |
| 答卷导出需要一次性导出 token 或导出密码，并写审计 | `AnswerApi.java:125-134`、`ExportGuardService.java` |
| 管理端答卷读写走权限服务（getAnswerWithPermission/updateAnswerWithPermission/assertAnswersAccess） | `AnswerApi.java:62-66`、`:84-88`、`:94-118`；`AnswerServiceImpl.java:206-213`、`:293-305`、`:812-828` |
| 文件/项目/答卷类接口有 `@EnableDataPerm` 切面校验项目归属 | `DataPermAspect.java:42-61`；`AnswerApi.java:39/51/75/127`；`ProjectApi.java:62/74/96/107/119/130/142/154/165` |
| 项目 SpEL 更新有字段白名单（防 SpEL 注入） | `ProjectServiceImpl.java:138-142`、`:157-164`（`validateSettingKey`） |
| OAuth 回跳地址校验（只允许站内相对路径） | `OAuthServiceImpl.java` `safeRedirect`（拒绝 `//`、`\`、CRLF、绝对 URI） |
| 无 `${}` 形式的 SQL 拼接；`.last("limit " + limit)` 的 limit 已夹紧 1..100 | 全仓 grep `${}` 仅命中 `@Value`/`@RequestMapping` 配置占位符；`SurveyServiceImpl.java:592`、`:601` |
| 日志未打印密码/token；登录失败只记用户名+IP+栈 | `UserApi.java:71-72`；全仓 grep `log.*(password|token|secret)` 无命中 |

---

## 6. 审计方法与未覆盖项

- **已做**：13 个控制器全部端点与 `@PreAuthorize` 对齐（含上下 6 行窗口双向扫描）；`@EnableDataPerm` 覆盖面对照；服务层权限方法逐个读；字符串 SQL/`.apply(/.last(/.exists(` 参数来源逐个看；文件上传下载全流程；JWT/登录/登出/限流/验证码；OAuth 回调与重定向；依赖清单。
- **实测范围**：仅 §1.1 的「用他人 answerId 读答卷」（只读调用），其余为静态分析。
- **未覆盖 / 待确认**：① 依赖 CVE 未联网核对；② `ClassPathResource` 对 `../` 的真实行为未实测；③ `@Async` 身份串号的触发概率未压测；④ `DashboardServiceImpl` 的字段注入是否真的 NPE 未运行验证；⑤ 前端（`client/**`）与部署层（nginx/HTTPS/HSTS）未在本次范围。
