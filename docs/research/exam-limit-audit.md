# 审计：考试/问卷的各项「限制」到底有没有真的在执行

> 审计时间：2026-11-06 18:1x ｜ 只读审计，未改动源码 ｜ 证据全部为仓库内代码行号（`文件:行`），不接受推测。
> 审计对象：`client/src/pages/survey/Setting.tsx` 里「考试设置 / 答题设置」暴露出来的限制项。
> 代码基线：当前工作区（未 commit 状态），`SurveyServiceImpl.java` 1464 行、`PublicAnswer.tsx` 1013 行。

## 0. 结论速览（用户最关心的三条先说）

| 问题 | 结论 | 一句话证据 |
|---|---|---|
| `maxSubmitMinutes`（最长交卷）是前端算的还是后端算的？刷新能不能续？ | **纯前端，后端零校验**。页面每次挂载都 `Date.now() + minutes * 60_000` 重算，**刷新即续满**，等于没有限制 | `PublicAnswer.tsx:513-533`；后端只有 DTO 字段 `ProjectSetting.java:268`，全仓无任何判断 |
| `maxSwitchScreenTimes`（切屏次数）计数存在哪？刷新是否清零？ | **只存在前端内存（`useState`）**，刷新/换标签页/换设备全部清零；后端完全不知道有这回事 | `PublicAnswer.tsx:140`、`PublicAnswer.tsx:535-555`；后端只有 DTO 字段 `ProjectSetting.java:308` |
| `maxAnswers` / `ipLimit` / `cookieLimit` 后端有没有真计数？ | `maxAnswers` **真有**；`ipLimit`/`cookieLimit` **代码写了但永远数到 0**（新前端不发 `metaInfo`，`Answer.metaInfo` 是 NULL，`like` 恒不命中）→ 形同虚设 | `SurveyServiceImpl.java:716-725`（真）；`:969-1002` + `AnswerServiceImpl.java:218-219`、`:243-245`（假） |

## 1. 逐项结论表

| # | 设置项 | 后端是否校验 | 前端是否处理 | 证据（文件:行） | 结论 | 风险 |
|---|---|---|---|---|---|---|
| 1 | `examSetting.startTime` 考试开始时间 | **是**（仅"无 answerId"的加载/首提路径） | 否，只把后端 6000 报错弹出来 | `SurveyServiceImpl.java:822-824`；调用点 `:189`、`:319`、`:841` | 已执行 | 低 |
| 2 | `examSetting.endTime` 考试结束时间 | **是**（同上路径） | 否 | `SurveyServiceImpl.java:826-828`；调用点同上 | 已执行，但带 `answerId` 的保存路径不校验（见 §3） | 中 |
| 3 | `examSetting.minSubmitMinutes` 最短交卷 | **否**：全仓只有 DTO 字段 | **否**：设置界面有输入框，答题页无任何"不能提前交"逻辑 | `ProjectSetting.java:263`；`Setting.tsx:56`、`:111`、`:217`；`PublicAnswer.tsx` 无 `minSubmit` 关键字 | **完全没实现**（两端都空） | 高 |
| 4 | `examSetting.maxSubmitMinutes` 最长交卷 | **否**：全仓只有 DTO 字段；且服务端**没有记录答题开始时间** | 是：倒计时 + 到点自动交卷，但 deadline 每次挂载重算 | `ProjectSetting.java:268`；`PublicAnswer.tsx:513-533`（`const deadline = Date.now() + minutes * 60_000`）；`AnswerMetaInfo.AnswerInfo` 只被读、从未被写（`SchemaHelper.java:787-793`、`UserServiceImpl.java:886-887`） | **仅前端限制：刷新即重置，改系统时钟亦可** | 高 |
| 5 | `examSetting.maxSwitchScreenTimes` 最大切屏次数 | **否**：全仓只有 DTO 字段 | 是：`visibilitychange` 计数，但计数在组件 `useState` 里 | `ProjectSetting.java:308`；`PublicAnswer.tsx:140`（`useState(0)`）、`:535-555` | **仅前端 + 内存计数：刷新清零，多标签各记一份** | 高 |
| 6 | `examSetting.passMode` / `passModePerSeconds` 闯关模式 | **否** | **否**：只有设置开关和 `BatchSettingModal` 的批量项，答题页零引用 | `ProjectSetting.java:283`、`:288`；`Setting.tsx:60-61`、`:115-116`、`:232`、`:240`；`BatchSettingModal.tsx:76`；`PublicAnswer.tsx` 无 `passMode` 关键字 | **完全没实现**（开关是装饰品） | 中 |
| 7 | `answerSetting.maxAnswers` 回收上限 | **是**（每次新建答卷前 `count >= maxAnswers` 即 4010） | 否，靠后端报错 | `SurveyServiceImpl.java:716-725`（`answerService.count(projectId)`）；计数实现 `AnswerServiceImpl.java:238-246` | 已执行（只拦"新建"，更新已有答卷不重复计数，符合语义） | 低 |
| 8 | `answerSetting.ipLimit` / `cookieLimit` 每 IP / 每设备限次 | **代码在，但实际永远不触发** | 否 | `SurveyServiceImpl.java:743-745`、`:991-1002`（IP）、`:739-741`、`:969-989`（Cookie）；计数 `AnswerServiceImpl.java:243-245` 对 `Answer.metaInfo` 做 `like`；而 `metaInfo` 只在**请求带了 metaInfo** 时才写（`AnswerServiceImpl.java:218-219` → `AnswerService.java:46-59`），新前端提交体 `PublicAnswer.tsx:478-483` 不含 `metaInfo` | **读了但没用于判断（数据源为空 → 恒 0 条）** | 高 |
| 9 | `answerSetting.endTime` 回收截止时间 | **是**（4011） | 否 | `SurveyServiceImpl.java:727-732`；调用点 `:189`、`:319`、`:841` | 已执行，但同 §3 可绕过 | 中 |
| 10 | `answerSetting.password` / `loginRequired` / `whitelistType` | **只在"打开/校验"时执行；`saveAnswer` 完全不校验** | 是（密码页、登录提示），但"导入用户白名单"没有专门界面 | 校验逻辑 `SurveyServiceImpl.java:1247-1258`（错题练习需登录）、`:1262-1272`（需要登录）、`:1274-1285`（密码）、`:1287-1338`（系统用户白名单）、`:1340-1364`（导入用户白名单）；`saveAnswer` `:335-398` 只调 `requireWechatAccess` + `getAnswerForProject` + `validateAndGetLatestAnswer`（`:837-871`，只校验限额/唯一/配额），**不调** `convertAndValidateLoginFormIfNeeded` | **半执行：直连 `POST /api/public/saveAnswer` 可绕过密码/登录/白名单** | 高 |

## 2. 关键证据片段

### 2.1 `maxSubmitMinutes`：deadline 在组件挂载时重算（刷新即续）

`client/src/pages/answer/PublicAnswer.tsx:513-533`

```tsx
/** 考试限时：到点自动交卷 */
useEffect(() => {
  const minutes = project?.setting?.examSetting?.maxSubmitMinutes;
  if (!minutes) return;
  const deadline = Date.now() + minutes * 60_000;   // ← 每次挂载都从现在开始重算
  const tick = () => {
    const left = deadline - Date.now();
    setRemainMs(left);
    if (left <= 0) { /* 自动交卷 */ }
  };
  ...
}, [project?.setting?.examSetting?.maxSubmitMinutes]);
```

- 依赖数组里只有 `maxSubmitMinutes`，但 `project` 一变（重新 `load()`、路由重挂载）effect 就重跑 → 新 deadline。
- 后端侧：`grep -rn "maxSubmitMinutes" server/ --include=*.java` 只命中 `ProjectSetting.java:268` 的字段声明，**没有任何比较逻辑**。
- 服务端也**没有**答题开始时间可用：`AnswerMetaInfo.AnswerInfo{startTime,endTime}`（`AnswerMetaInfo.java:22-29`）全仓只有读（`SchemaHelper.java:787-793`、`UserServiceImpl.java:886-887`），没有任何 `setAnswerInfo`/`setStartTime` 写入；前端提交体 `PublicAnswer.tsx:478-483` 连 `metaInfo` 都不发。
- 结论：交卷时间完全由客户端自觉，**刷新页面 = 重新计时**；改系统时钟同理。风险：高。

### 2.2 `maxSwitchScreenTimes`：计数在内存里

`client/src/pages/answer/PublicAnswer.tsx:140` / `:535-555`

```tsx
const [switchCount, setSwitchCount] = useState(0);      // 只活在这个组件实例里
...
document.addEventListener('visibilitychange', onVisibility);   // 只有标签页变隐藏才 +1
```

- 刷新、关标签页重进、换浏览器/换设备 → 计数归零。
- 分屏并排（两边都可见）不触发 `visibilitychange`，不计次。
- 后端无字段、无接口、无审计日志，服务端无法复算。
- 结论：**仅前端限制且不持久**。风险：高。

### 2.3 `ipLimit` / `cookieLimit`：逻辑在，数据永远为空

计数侧（`AnswerServiceImpl.java:238-246`）：

```java
return count(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, query.getProjectId())
        ...
        .like(query.getIp() != null, Answer::getMetaInfo, query.getIp())          // ← 依赖 metaInfo
        .like(query.getCookie() != null, Answer::getMetaInfo, query.getCookie()));
```

写入侧（`AnswerServiceImpl.java:216-219`）：

```java
public AnswerView saveAnswer(AnswerRequest request) {
    // 公开查询修改答案时不会传元数据
    if (request.getMetaInfo() != null) {                       // ← 只有前端传了才写
        request.getMetaInfo().setClientInfo(parseClientInfo(request.getMetaInfo().getClientInfo()));
    }
```

而新前端提交答卷时（`PublicAnswer.tsx:478-483`）：

```tsx
const res = await post<PublicAnswerView>('/api/public/saveAnswer', {
  projectId: id, id: answerId, answer: values, survey: submissionSurvey,
});   // 没有 metaInfo
```

`metaInfo` 在整个 `client/src` 里只出现在类型声明 `schema/project.ts:130`，**从未被赋值**。

- 结果：`Answer.metaInfo` 为 NULL → `LIKE '%ip%'` 恒不命中 → `count = 0` → `total >= limitNum` 永不成立 → 限次永远放行。
- 即使补上 `metaInfo`，还有两个问题：
  1. `doValidate` 在发布方开了「允许修改答案」时直接 `return`（`SurveyServiceImpl.java:1025-1028`），限次整段跳过；
  2. IP 取自 `X-Forwarded-For` 等请求头（`IPUtils.java:15-22`，无受信代理判断），客户端随手伪造即可换 IP。
- 结论：**读了但没用于判断**（对现有数据等于没实现）。风险：高。

### 2.4 `maxAnswers` / `answerSetting.endTime` / 考试时间：只在 `validateProject` 里，且有绕过口

`SurveyServiceImpl.java:716-732`

```java
Long maxAnswers = setting.getAnswerSetting().getMaxAnswers();
if (maxAnswers != null) {
    ... long totalAnswers = answerService.count(answerQuery);
    if (totalAnswers >= maxAnswers) throw new ErrorCodeException(ErrorCode.ExceededMaxAnswers);   // 4010
}
Long endTime = setting.getAnswerSetting().getEndTime();
if (endTime != null && new Date().getTime() > endTime) throw new ErrorCodeException(ErrorCode.ExceededEndTime); // 4011
```

`validateProject` 的调用点只有三处：

- `loadProject` 的"没有 answerId"分支：`SurveyServiceImpl.java:185-190`
- `POST /api/public/validateProject`：`:314-319`
- `saveAnswer` 的"全新答卷"分支（`validateAndGetLatestAnswer`）：`:366-372` → `:841`

**绕过点在 `loadProject` 的另一个分支**（`:191-202`）：请求里**带了 `answerId`** 就直接按答案回填并 `return`，**完全跳过 `validateProject`**：

```java
else {   // query.getAnswerId() != null
    AnswerView answerView = getAnswerForProject(project.getId(), query.getAnswerId());
    ...
    return projectView;      // ← 没有 validateProject / 没有考试时间校验
}
```

`saveAnswer` 同理分三条路（`:347-372`），只有最后那条走限额校验：

| 提交时的入参 | 走的分支 | 是否校验 开考/结束/回收上限 |
|---|---|---|
| 随机卷 cookie 存在 | `:347-350` | 否 |
| 带 `queryId`（公开查询改答案） | `:351-354` | 否 |
| **带 `id`（answerId）** | `:355-365` | **否**（只校验 `getAnswerForProject` 归属 + 是否允许修改） |
| 三者都没有（全新答卷） | `:366-372` | 是 |

后果：**只要手里有一个自己的 `answerId`（交过一次就有，还存在 localStorage `sk-answer-<projectId>`），考试结束/回收截止之后仍然可以继续改答案并重新判分。**

### 2.5 「最短交卷 / 闯关模式」：真的只有字段

```
$ grep -rn "minSubmitMinutes\|passMode" server/ --include=*.java
server/shared/.../ProjectSetting.java:263:  private Integer minSubmitMinutes;
server/shared/.../ProjectSetting.java:283:  private Boolean passMode;
server/shared/.../ProjectSetting.java:288:  private Integer passModePerSeconds;
```

前端答题页（`PublicAnswer.tsx`）里也没有任何 `minSubmitMinutes` / `passMode` 引用；设置界面 `Setting.tsx:217-240` 有输入框，`BatchSettingModal.tsx:76` 有批量项 —— 用户能配、库里能存、**答题时没人读**。

### 2.6 密码 / 登录 / 白名单：打开时拦，提交时不拦

打开时（`loadProject:187` → `convertAndValidateLoginFormIfNeeded`）确实执行：

```java
// SurveyServiceImpl.java:1274-1285
if (answerSetting.getPassword() != null) {
    loginRequired = true;
    ...
    if (!answerSetting.getPassword().equals(...extraPassword...)) throw new ErrorCodeException(ErrorCode.ValidationError);
}
// :1287 系统用户白名单：登录用户不在 project_partner 名单里 → PermVerifyFailed
// :1340 导入用户白名单：用户名不在名单里 → PermVerifyFailed
```

但提交接口 `saveAnswer`（`:335-398`）**没有调用这段逻辑**：它只做 `requireWechatAccess`、answerId 归属校验、`validateProject`（状态/限额/考试时间）与 `validateAnswer`（唯一/配额）。因此：

```
curl -X POST /api/public/saveAnswer -d '{"projectId":"<分享链接里的id>","answer":{...}}'
```

即可在**不知道答题密码、未登录、不在白名单**的情况下写入一份答卷（`create_by` 为空，白名单状态也不会被更新）。

另外，「导入用户白名单」在前端没有对应界面：`PublicAnswer.tsx:149-167` 的 `applyProject` 只识别 `extraPassword`（密码页）和 `username`（登录提示），`whitelistName` 字段会掉进 `setProject(data)`，被当成一道普通填空题渲染。

## 3. 最危险的 3 个「形同虚设」的限制

1. **`maxSubmitMinutes` 最长交卷 = 0 效果**（`PublicAnswer.tsx:517`，后端 `ProjectSetting.java:268` 无逻辑）
   刷新页面即重新计时，考生可以无限延长；服务端连答题开始时间都没存（`AnswerMetaInfo.AnswerInfo` 无写入点），想事后判"超时"也没有依据。
   修法方向：`loadProject/首屏` 时由服务端把 `answerStartAt` 落到答卷（或 cookie 签名的 deadline），`saveAnswer` 用服务端时钟裁决，超时落库并标 `late`，而不是丢弃。

2. **密码 / 登录 / 白名单只挡 UI，不挡接口**（`SurveyServiceImpl.java:335-398` 不调 `:1233-1398` 的校验）
   分享链接的 `projectId` 是公开的，任何人直接 POST `saveAnswer` 就能交卷。`minSubmitMinutes` 与 `passMode` 也同样完全没实现（见 §2.5）。
   修法方向：校验前移到 `saveAnswer`（密码需随请求带上一次性校验凭据，登录/白名单则从安全上下文判定）。

3. **`answerId` 分支在 `loadProject` 与 `saveAnswer` 里都跳过限额**（`SurveyServiceImpl.java:191-202`、`:355-365`）
   有历史答卷的用户在考试结束/回收截止后仍可改写答案并重新判分；再叠加 `tempSave: 0`（`:361-364`，未开"允许修改答案"时也放行草稿覆盖），连"提交后不可修改"都能绕开。
   修法方向：把 `validateProject`（以及考试时间校验）从"分支里调用"改为"入口统一调用"，更新路径至少校验考试结束时间与 `enableUpdate`。

## 4. 顺带核实：这些限制是真的（避免误伤）

| 设置项 | 证据 | 说明 |
|---|---|---|
| `setting.status = 0`（暂停回收） | `SurveyServiceImpl.java:712-714` | 4010 系列错误，真执行 |
| `answerSetting.maxAnswers` | `:716-725` | 真执行（注意：`AnswerServiceImpl.count` 不过滤 `tempSave`，草稿也占名额） |
| `examSetting.startTime/endTime` | `:822-828` | 真执行（仅 `mode=exam`，且仅"无 answerId"路径） |
| `examSetting.randomOrder` 随机题序 | `ProjectViewMapper.java:46-50`、`RandomSurveyProcessor.java:184` | 真执行（每次请求按服务端随机） |
| `examSetting.randomSurvey` 随机抽题 | `RandomSurveyProcessor.java:89-176` | 真执行（选中 schema 落 `Answer.survey` 快照） |
| `examSetting.exerciseMode` | `ProjectViewMapper.java:40-44` | 真执行（练习模式不剥离答案） |
| 题库刷接口限流 | `RateLimitFilter.java:36-49`（默认 60 次/分） | 真执行；但匿名用户的 key 取 `X-Real-IP`（`:78-82`），客户端可伪造绕过 |
| `examSetting.rankingEnabled` | 全仓无引用（`grep -rn "getRankingEnabled" server/` 0 命中） | **未使用**；实际排名由 `submittedSetting.rankVisible` 控制（`SurveyServiceImpl.java:486`） |

## 5. 复核方法（自己跑一遍）

```powershell
cd C:\Users\Nightwatchman\Desktop\SurveyKing
# 1) 五个考试设置项在后端有没有逻辑（预期：只命中 DTO）
rg -n "minSubmitMinutes|maxSubmitMinutes|maxSwitchScreenTimes|passMode|randomSurveyWrong" server --glob "*.java"
# 2) 前端答题页用了哪些考试设置项
rg -n "examSetting\?\." client/src
# 3) 谁在收 metaInfo（预期：只有类型声明）
rg -n "metaInfo" client/src
# 4) validateProject 的调用点（预期 3 处）
rg -n "validateProject\(project\)" server/rdbms/src/main/java/cn/surveyking/server/impl/SurveyServiceImpl.java
# 5) 答案开始时间有没有写入点（预期 4 命中，但**没有一处**是写 AnswerMetaInfo.AnswerInfo：
#    UserServiceImpl:886 是读它填 taskView，另外 3 处是 AnswerQuery 的查询时间窗）
rg -n "setAnswerInfo|setStartTime" server --glob "*.java"
```

---

**一句话总结**：这套「考试限制」目前只有 `maxAnswers` / 回收截止 / 开考结束 / 随机题序是真在服务端跑的；**限时（最长交卷）、切屏次数、最短交卷、闯关模式四项在服务端完全不存在**，其中限时与切屏只靠前端内存，刷新即归零；**IP/设备限次因为 `metaInfo` 从未被写入而恒不生效**；而密码/登录/白名单只挡页面不挡接口。
