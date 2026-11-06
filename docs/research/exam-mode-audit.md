# 审计：再考一次 / 练习模式即时判题 / 本场考试错题练习

> 审计时间：2026-11-06 18:2x ｜ **只读审计**：未改源码、未写库、未重启服务、未 git 操作。
> 代码基线：当前工作区（未 commit 状态）：`SurveyServiceImpl.java` 1500 行、`PublicAnswer.tsx` 1013 行、`AnswerServiceImpl.java` 906 行、`RepoServiceImpl.java` 1019 行。
> 证据格式 `文件:行`。标注「实测」的条目来自只读接口调用（admin 会话），其余为代码推导；两者冲突时以实测为准，并已注明。

## 0. 结论速览

| 问题 | 结论 | 一句话证据 |
|---|---|---|
| A.「再考一次」新建还是覆盖？ | **覆盖**：复用同一条 `t_answer` 记录（最近一份），旧成绩被新成绩替换，不产生新的作答历史 | `SurveyServiceImpl.java:368-374`（无 id 时取「最近一份」）→ `AnswerServiceImpl.java:224-226`、`249-253`（有 id 走 update） |
| B.「练习模式」选完即判对错？ | **没实现**。后端留了半个钩子（练习模式不剥答案），但被「逐题下发」接口无条件剥答案抵消；前端零引用该开关。只有**交卷后**才能看对错与解析 | `ProjectViewMapper.java:39-44` vs `SurveyServiceImpl.java:281`；`PublicAnswer.tsx:699-744` |
| C. 能只练本场考试的错题吗？ | **不支持**。`t_user_book` 没有 `project` 维度；考试错题只按 `template_id` 入账，现有「错题练习」是题库维度 | `init-mysql.sql:489-508`；`UserBookServiceImpl.java:44-74`；`SurveyServiceImpl.java:158-166` |

---

## A. 「再考一次」= 覆盖旧答卷（不新建）

### A.1 一句话

学员点「再考一次」→ 打开 `/s/:id`（不带 answerId）→ 前端把 localStorage 里的旧 answerId 一起发给「取大纲」接口 → 后端把**旧答案回填**（不是空卷）但**不返回 answerId** → 提交时前端 `id` 为空 → 后端自己查「当前用户最近一份答卷」→ **更新那一条**。所以：**同一条答卷被覆盖，历史尝试不保留**。

### A.2 入口：只有开了「允许修改答案」才出现按钮

`client/src/pages/exercise/List.tsx:437-460`

```tsx
const state = taskState(task.id);
const retry = Boolean(task.setting?.submittedSetting?.enableUpdate);   // :439
...
{retry && (
  <Button ... onClick={() => start(task)}>再考一次</Button>            // :447-451
)}
```

- `start(task)` 只做 `navigate('/s/' + task.id)`（`:413`）——**不传 answerId、也不传任何"新答卷"标记**。
- 其它入口（老师侧「我的问卷/我的考试」答卷列表）是**只读回看**：`/s/${projectId}/exam-result/${answerId}`、`/s/${projectId}/${answerId}`（`client/src/pages/home/tables.tsx:196-205`）。
- 实测：`/api/project/list` 里 3 场考试 `enableUpdate` 全为 `true` → 线上「再考一次」按钮是可见的。

### A.3 打开页面：旧答案回填，但响应里没有 answerId

`client/src/pages/answer/PublicAnswer.tsx:181-183`

```tsx
// URL 里带 answerId（成绩单/回看链接）优先，其次用本地保存的匿名凭证
const savedId = routeAnswerId ?? localStorage.getItem(answerKey(id)) ?? undefined;
applyProject(await post<PublicProjectView>('/api/public/projectOutline', { id, answerId: savedId }));
```

后端 `server/rdbms/src/main/java/cn/surveyking/server/impl/SurveyServiceImpl.java:103-218`（`loadProject`）：

- `:185-190` 无 answerId：正常校验 + `:214` `projectView.setAnswer(getLatestAnswer(...))`（**只有 enableUpdate 才预填**，见 `:914-937`）。
- `:191-202` 带 answerId：`getAnswerForProject(project.getId(), query.getAnswerId())` → 只 `setAnswer` / `setSurvey`，**没有 `setAnswerId`**，直接 `return`。
- 大纲接口只是把整卷 schema 换成空壳（`:222-224` → `:231-257`），`answer` 字段原样保留。

前端 `applyProject`（`PublicAnswer.tsx:149-167`）：

```tsx
if (data.answerId) { setAnswerId(data.answerId); localStorage.setItem(answerKey(id), data.answerId); }  // :162-165
if (data.answer) setValues(data.answer as Record<string, AnswerValue>);                                   // :166
```

**实测**（`POST /api/public/projectOutline`，项目 `qOnwfz`）：

| 请求 | 响应 keys | answer |
|---|---|---|
| `{id: qOnwfz}` | `id, survey, outline, status, setting, name, mode, createAt, isAuthenticated` | 无 |
| `{id: qOnwfz, answerId: 3a39c8…}` | `id, survey, outline, status, setting, name, mode, createAt, answer` | 有，4 个 key |

⇒ 带 answerId 时**答案被回填**，但响应里**确实没有 answerId**，因此前端 `answerId` state 仍是 `undefined`。

### A.4 提交：`id` 为空 → 后端覆盖「最近一份」

`PublicAnswer.tsx:478-483`

```tsx
const res = await post<PublicAnswerView>('/api/public/saveAnswer', {
  projectId: id,
  id: answerId,          // A.3 结论：再考一次时为 undefined
  answer: values,
  survey: submissionSurvey,
});
```

`SurveyServiceImpl.java:337-400`（`saveAnswer`）：

```java
String answerId = request.getId();                                            // :345
...
else if (isNotBlank(request.getId()) && !EXERCISE_PROJECT_ID.equals(...)) {   // :357
  getAnswerForProject(projectId, request.getId());                            // :360
  boolean enableUpdate = Boolean.TRUE.equals(project.getSetting().getSubmittedSetting().getEnableUpdate()); // :361
  boolean tempSaving = Integer.valueOf(0).equals(request.getTempSave());      // :363
  if (!enableUpdate && !tempSaving) throw new ErrorCodeException(ErrorCode.AnswerChangeDisabled); // :365（4020）
}
else {                                                                        // :368  ← 再考一次走这里
  AnswerView latestAnswer = validateAndGetLatestAnswer(project, request);     // :370
  if (latestAnswer != null) answerId = latestAnswer.getId();                  // :371-372  ← 覆盖已有的那份
}
request.setId(answerId);                                                      // :377
AnswerView answerView = answerService.saveAnswer(request);                    // :378
```

- `validateAndGetLatestAnswer`（`:873-907`）：登录 + `enableUpdate` 为真 → 取「当前用户最近一份」（`:914-937` → `AnswerServiceImpl.getAnswer`，`:169-180` 按 `createBy = 当前用户` 过滤 + `orderByDesc(createAt)`）。
- `AnswerServiceImpl.saveAnswer`（`:216-235`）：`if (StringUtils.hasText(request.getId()))` → `updateAnswer`（`:249-253` `updateById`）；否则 UUID 新建。
- 成绩/逐题得分由 `beforeSaveAnswer` → `computeExamScore`（`AnswerServiceImpl.java:728-739`、`791-808`）重算后覆盖。

### A.5 实测证据（无新增行）

`GET /api/answer/list?projectId=qOnwfz` → **只有 1 条**：`id=3a39c877-…`，`createAt=2026-11-06 14:46:10`，`examScore=0`；`GET /api/answer?id=…` 返回同一行 `updateAt=2026-11-06 17:52:33`。

⇒ 同一行在 14:46 创建、17:52 被再次提交更新，**没有出现第二条**，与 A.4 的代码路径一致。DDL 里 `update_at timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP`（`init-mysql.sql:503`）也说明覆盖只刷新 update_at、`create_at` 保留首次时间。

### A.6 边界与后果

1. **`enableUpdate=false` 时**：按钮不出现；但学员直接访问 `/s/:id` 仍可提交 → 走 A.4 的「无 id」分支，`needGetLatest=false`（`:879-883`、`:885-895`）→ **新建一条答卷**（受 `maxAnswers`/每用户限次约束，见 `docs/research/exam-limit-audit.md`）。
2. **多次「再考一次」只保留一条**：`examScore`、`examInfo`（逐题得分）、`answer` 都被覆盖；`createAt`（提交时间）仍是第一次的 → 成绩单/统计/导出/排名都只看这一份，历史成绩不可追溯。
3. **「再考一次」其实是「打开上次答卷继续改」**：`PublicAnswer.tsx:166` 会把旧答案塞回答题区，学员看到的是自己上次的答案，不是空白新卷。
4. localStorage 的 `sk-answer-<projectId>` **只写不删**（`PublicAnswer.tsx:164`、`:486`；全文件无 `removeItem(answerKey(...))`）→ 换浏览器/清缓存后行为会退化为「仅靠 enableUpdate 自动预填旧答案」。

### A.7 顺带发现的风险（同一条链路，建议单独处理）

| 风险 | 证据 | 说明 |
|---|---|---|
| `answerId` 越权读取 | `SurveyServiceImpl.java:972-991`（`getAnswerForProject` 只校验 answerId 属于该项目，**不校验 createBy**）+ `:191-202`（loadProject 带 answerId 时原样回传 answer） | 实测：admin 用另一位用户（`createBy=2118380136249200642`）的 answerId 调 `projectOutline`，成功拿到 4 条答案 key。answerId 是 UUID，未被泄露时难枚举，但成绩单/分享链接里带 answerId（`home/tables.tsx:199`） |
| `@Async` 里读 SecurityContext 可能拿到错的人 | `UserBookServiceImpl.java:43` `@Async` + `:44-52` 用 `SecurityContextUtils`；`WebSecurityConfig.java:56-57` 用 `MODE_INHERITABLETHREADLOCAL`；`AppConfig.java:48-56` 的 `ThreadPoolTaskExecutor` **没有 TaskDecorator** | 线程池复用时只有「线程创建那一刻」的身份被继承，后续任务会沿用旧身份；匿名时 `isAuthenticated()` 为 false 直接 return（`SecurityContextUtils.java:39-41`、`:47-50`）。**需实测确认**，但建议改成显式传 `userId` |

---

## B. 练习模式（选完选项立刻显示对错 / 正确答案）：没实现

### B.1 设置项确实存在，而且注释写得就是用户的期望

- `ProjectSetting.java:275-278`：`/** 练习模式 打完问题后立即显示答案 */ private Boolean exerciseMode;`
- 管理端两处入口：`client/src/pages/survey/Setting.tsx:237`（`switchItem('exerciseMode', '练习模式')`）、`client/src/pages/project/BatchSettingModal.tsx:74`。
- 前端类型：`client/src/schema/project.ts:69`。

### B.2 后端只做了一半，而这一半被「逐题下发」抵消

唯一的后端使用点 —— `ProjectViewMapper.java:36-51`：

```java
// 非练习模式需要去掉 schema 里面的答案信息
if (ProjectModeEnum.exam.equals(source.getMode())
        && !(... getExamSetting().getExerciseMode())) {      // :40-42
    trimExamAnswerInfo(view.getSurvey());                    // :43
}
default void trimExamAnswerInfo(SurveySchema schema) {       // :53
    SchemaHelper.ignoreAttributes(schema, "examCorrectAnswer", "examScore", "examMatchRule");  // :58
}
```

也就是说：**练习模式为真时，整卷 schema 会带着 `examCorrectAnswer` 下发给公开答题端**。

但是答题页已经不再拿整卷 schema 了：

- 首屏只拿大纲：`SurveyServiceImpl.java:222-224`（`loadProjectOutline` → `toOutlineView`），`:231-257` 把 `survey` 换成只含 id/title/type/attribute 的**空壳**（`setChildren(new ArrayList<>())`），题干/选项/属性一律不下发。
- 题目逐题拉：`PublicAnswer.tsx:342-346` `POST /api/public/question` → `SurveyServiceImpl.loadPublicQuestion`（`:264-283`），第 **281** 行：
  ```java
  SchemaHelper.ignoreAttributes(question, "examCorrectAnswer", "examScore", "examMatchRule", "examAnalysis");
  ```
  **无条件剥掉，没有 exerciseMode 判断。**

⇒ 结论：练习模式打开也拿不到答案；这个开关对答题页**零影响**。

### B.3 前端零引用：答题页根本不看这个开关

`client/src/pages/answer/PublicAnswer.tsx` 读取的 `examSetting` 字段只有两个：

- `:515` / `:533` `maxSubmitMinutes`（限时）
- `:537` / `:555` `maxSwitchScreenTimes`（切屏）

全仓 `exerciseMode` 命中位置只有：`Setting.tsx:59/114/237`、`BatchSettingModal.tsx:45/74`、`schema/project.ts:69` —— 全是设置界面与类型，**没有一处判题逻辑**。

题目组件（`client/src/renderer/questions/*`）只渲染控件与回填值，`SchemaRenderer` 也没有"作答后反馈"的模式。

### B.4 唯一的判题时机是「交卷后」

- 交卷结果页：`PublicAnswer.tsx:699` `const showAnalysis = Boolean(project.setting?.submittedSetting?.answerAnalysis);`，`:700-744` 用 `resultSurvey + values` 渲染「选项 / 我的答案 / 正确答案 / 对错 / 解析」卡片 —— **只在提交成功后出现**。
- 成绩单路由：`loadExamResult`（`SurveyServiceImpl.java:468-502`），`:478` `if (answerAnalysis && examFinished(examSetting))` 才把 `answer/schema/examInfo` 下发；`examFinished`（`:613-618`）还要求「没设结束时间，或已过结束时间」。

### B.5 结论与要做的事

**结论：完全没实现「边做边判」**；现状只有「交卷后看解析」，而且解析还要求发布方打开「显示答案解析」（默认关闭时连解析都没有）。准确表述是：**后端留了半截钩子（项目级 exerciseMode 不剥答案），但被单题下发接口的无条件剥离抵消；前端从未消费这个开关。**

要真正支持，最小改动：

1. 后端：`loadPublicQuestion`（`:264-283`）按项目 `examSetting.exerciseMode` 放行 `examCorrectAnswer`（或新增 `POST /api/public/checkAnswer` 单题判分，返回 `{correct, correctAnswer, analysis}`，避免整卷答案暴露）。
2. 判分口径：复用 `AnswerScoreEvaluator`（`AnswerScoreEvaluator.java`），并处理 `examScore`/`examAnswerMode` 缺失时的兜底——否则像现在这样全 0 分（见 C.6）。
3. 前端：`PublicAnswer` 在题目 `onChange` 后请求判分并把结果渲染在题目下方（新增一个 `mode="practice"` 的渲染分支，或直接在题目卡片底部加"对/错 + 正确答案 + 解析"区块）；作答卡上可加对错底色。
4. 关联：`passMode`（闯关模式，`ProjectSetting.java:283`）同样是死开关（`docs/research/exam-limit-audit.md` 已列），"一题一结算"的逻辑将来可与练习模式共用。

---

## C. 「只练这一场考试的错题」：不支持

### C.1 表结构没有考试维度

`server/rdbms/src/main/resources/scripts/init-mysql.sql:489-508`（H2 同：`init-h2.sql:472-490`）：

```sql
CREATE TABLE `t_user_book` (
  `id` ..., `name` ..., `template_id` ..., `wrong_times` ..., `correct_times` ...,
  `note` ..., `status` ..., `type` ..., `create_at` ..., `create_by` ...,
  `update_at` ..., `update_by` ..., `repo_id` ..., `is_marked` ...
) COMMENT='错题本';
```

没有 `project_id`（也没有 `source`/`exam_id`）。实体 `UserBook.java:25-68`、视图 `UserBookView.java:16-54`、查询 `UserBookQuery.java:17-35` 也都只有 `templateId / repoId / type / status / wrongTimesMin …`。

### C.2 收集入口：只拿「题目 id → 得分」

`SurveyServiceImpl.java:381-389`（考试交卷后）：

```java
if (ProjectModeEnum.exam.equals(project.getMode()) && !EXERCISE_PROJECT_ID.equals(projectId)) {
    result.setExamScore(answerView.getExamScore());
    result.setQuestionScore(answerView.getExamInfo().getQuestionScore());
    AnswerExamInfo answerExamInfo = answerView.getExamInfo();
    LinkedHashMap<String, Double> questionScore = answerExamInfo.getQuestionScore();
    userBookService.saveWrongQuestion(questionScore);        // :388  ← 没有 projectId
}
```

`UserBookServiceImpl.java:44-74`：

```java
@Async
public void saveWrongQuestion(LinkedHashMap<String, Double> questionScore) {   // :44
    ...
    List<String> templateIds = questionScore.entrySet().stream()
        .filter(x -> x.getValue() != null && x.getValue() == 0).map(x -> x.getKey())...;  // :49 0 分即错题
    List<UserBook> existUserBooks = list(... in(UserBook::getTemplateId, templateIds) ...);  // :51-52
    existUserBooks.forEach(x -> x.setWrongTimes(x.getWrongTimes() + 1));                     // :53
    ...
    userBook.setWrongTimes(1); userBook.setTemplateId(x.getId()); userBook.setName(x.getName()); // :67-69
    userBook.setType(BOOK_TYPE_WRONG);                                                       // :70  ← 无 repoId、无 projectId
}
```

⇒ 一条错题记录只知道「哪道题、错了几次」，**不知道来自哪场考试**。

### C.3 现有的「错题练习」都是题库维度

- 题库练习 W 模式：`SurveyServiceImpl.java:158-166`
  ```java
  if (query.getExamExerciseType() == ExamExerciseTypeEnum.W) {
      questionList = userBookService.list(... .eq(UserBook::getRepoId, query.getRepoId()) ... gt(UserBook::getWrongTimes, 0)) ...
  }
  ```
  → 按**题库** `repo_id` 取错题（`ExamExerciseTypeEnum` 只有 O 顺序 / R 随机 / W 错题，见 `ExerciseView`、`exercise/List.tsx:20-24`）。
- 项目级开关 `randomSurveyWrong`（「错题练习」，`ProjectSetting.java:300-303`）**只做了一件事**：未登录时要求登录（`SurveyServiceImpl.java:1280-1293`），没有任何"只出本场错题"的逻辑。
- 学员端错题本（`client/src/pages/repo/Book.tsx`）与练习页（`BookPractice.tsx`）的筛选维度是：类型 / 错误次数 / 时间 / 重点 / 关键词 —— **没有"来源考试"**。

### C.4 前端只能"看本场错题"，不能"练本场错题"

- 成绩单 `client/src/pages/answer/ExamResult.tsx:588` 有「只看错题（含未作答）」开关 → 只是**查看解析**的过滤器，没有"开始练这些错题"的入口。
- 交卷结果页 `PublicAnswer.tsx:700-744` 同样只是解析卡片。
- 错题本页面没有"来源考试"列（`Book.tsx` 表格列：题目/重点/错误次数/状态/笔记/最近错误时间/操作）。

### C.5 结论与最小改动集

**结论：不支持**——既没有数据（表里没有 project 维度），也没有接口（`UserBookQuery` 没有 project 条件），也没有入口（成绩单/错题本都没有"练本场错题"）。

要支持，按依赖顺序：

1. **DB**：`t_user_book` 增加 `project_id varchar(64) NULL` + 索引 `(create_by, project_id)`；`init-mysql.sql` / `init-h2.sql` 同步；历史数据保留 NULL（视作"来源未知"）。
2. **写入**：`saveWrongQuestion(questionScore, projectId, repoId)`（`UserBookServiceImpl.java:44`），调用点 `SurveyServiceImpl.java:388` 传 `project.getId()`；顺手把 `template.getRepoId()` 一起写入（见 C.6-3）。
3. **读取**：`UserBookView` 加 `projectId`（+ 可选的 `projectName` 便于展示），`UserBookQuery` 加 `projectId`，`RepoServiceImpl.listUserBook`（`:262-275`）加 `.eq(projectId != null, UserBook::getProjectId, ...)`。
4. **接口**：`GET /api/repo/book/list?projectId=`；交卷页要显示"本场错 N 题"再加一个 summary 接口。
5. **前端**：错题本 `Book.tsx` 加「来源考试」列 + 筛选（`BookFilter` 加 `projectId`，`bookQueryString` 透传）；成绩单/交卷结果页加「练本场错题」→ `/repo/book/practice?projectId=…`（`BookPractice.tsx` 已按 URL 筛选取题，只需多认一个参数）。
6. **语义决策（必须先定）**：现在 `t_user_book` 的去重键实际是 `(create_by, template_id, type)`（`UserBookServiceImpl.java:51-52`），加 `project_id` 后要决定：同一道题在两场考试各错一次——**合并成一条（wrongTimes=2）**还是**两条（按考试分开）**。选前者只需加字段+筛选；选后者要加唯一索引并改 `wrongTimes` 语义（"在本次考试错了几次"变成 0/1）。

### C.6 现有实现的三个隐患（直接决定"本场错题"内容可不可信）

| # | 隐患 | 证据 | 影响 |
|---|---|---|---|
| 1 | **未作答的题也会被当成错题** | 判 0 分即收：`UserBookServiceImpl.java:49`；未作答时各 evaluator 的 `support` 都要求 `answer.get(qId) != null`（`AnswerScoreEvaluator.java:110`、`:152`、`:190`、`:228`）→ 落到 `DefaultEvaluator` 返回 `0.0`（`:233-237`），仍会写进 `questionScore`（`:56`） | **实测**：那场考试答卷只答了 4 题，`examInfo.questionScore` 里 50+ 题**全部为 0**（`/api/answer?id=…` 返回）→ 一旦收集，整卷都会进错题本，"本场错题"数量 = 题目总数 |
| 2 | 只有"题库来源"的题写得进去 | `questionScore` 的 key 是题目 id，但代码按模板查：`UserBookServiceImpl.java:64` `templateService.listByIds(notExistTemplateIds)` | 设计器自建题目的考试（题目 id 不在 `t_template`）→ `templates` 为空 → **静默不入库、无任何报错** |
| 3 | 考试错题的 `repo_id` 是 NULL → 题库「错题练习(W)」取不到 | `saveWrongQuestion` 从未 `setRepoId`（`:65-72`）；`repo_id` 只在题库作答链路写（`RepoServiceImpl.java:331`、`:380`）；而 W 模式按 `repo_id` 过滤（`SurveyServiceImpl.java:158-166`） | 考试收进来的错题能在错题本列表看到，但**在"题库错题练习"里查不到**；若将来做"本场考试错题"，`repo_id` 也必须一起补 |

---

## 附：验证方式与边界

- **实测（只读接口，admin 会话）**：`GET /api/project/list`、`GET /api/answer/list?projectId=qOnwfz`、`GET /api/answer?id=3a39c877-…`、`POST /api/public/projectOutline`（带/不带 answerId 各一次）。
- **未做**：没有提交任何答卷、没有触发 `saveWrongQuestion`、没有改数据库、没有改源码、没有重启服务、没有 git 操作。
- B/C.6-1 的结论来自「代码推导 + 现有答卷数据（全 0 分）交叉印证」；A.7 的 `@Async` 身份问题属**风险提示**（需实测或改造后验证），未计入 A 的结论。
