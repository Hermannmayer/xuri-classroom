---
id: flow-exam-publish-answer
title: 从建卷/组卷到发布、答题、判分与报表
status: current
keywords:
  - 建卷
  - 组卷
  - 发布
  - 答题
  - 交卷
  - 判分
  - 成绩单
  - 报表
  - exam
source_globs:
  - client/src/pages/project/List.tsx
  - client/src/pages/project/ComposeModal.tsx
  - client/src/pages/survey/Editor.tsx
  - client/src/pages/survey/Overview.tsx
  - client/src/pages/answer/PublicAnswer.tsx
  - client/src/pages/answer/ExamResult.tsx
  - client/src/pages/survey/Data.tsx
  - client/src/pages/survey/Report.tsx
  - server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java
  - server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java
  - server/api/src/main/java/cn/surveyking/server/api/AnswerApi.java
  - server/api/src/main/java/cn/surveyking/server/api/ReportApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/SurveyServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RandomSurveyProcessor.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/AnswerScoreEvaluator.java
entrypoints:
  - client/src/pages/project/List.tsx
  - client/src/pages/project/ComposeModal.tsx
  - client/src/pages/survey/Editor.tsx
  - client/src/pages/survey/Overview.tsx
  - client/src/pages/answer/PublicAnswer.tsx
  - client/src/pages/answer/ExamResult.tsx
  - server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java
  - server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/SurveyServiceImpl.java
apis:
  - POST /api/project/create
  - POST /api/repo/pick
  - POST /api/project/update
  - POST /api/project/status
  - GET /api/project
  - GET /api/project/setting
  - POST /api/public/projectOutline
  - POST /api/public/question
  - POST /api/public/validateProject
  - POST /api/public/saveAnswer
  - POST /api/public/loadExamResult
  - POST /api/public/attempts
  - GET /api/answer/list
  - GET /api/report/{shortId}
tables:
  - t_project
  - t_project_partner
  - t_answer
  - t_user_book
tests:
  - 'client:npm run check'
  - 'docs:npm run docs:check'
  - 'nas:python scripts/nas/smoke-test.py'
last_verified: '2026-11-09'
verified_against: '765fc89'
---

# 从建卷/组卷到发布、答题、判分与报表

## 目标

把一份"还没人答"的试卷走完：建卷或从题库组卷 → 在编辑器里补题/改设置 → 发布 → 学员公开答题 → 交卷判分 → 学员看成绩单 → 老师在数据页/报表里看结果。每一步都对应明确的接口、权限和数据落点，出问题时可以按步骤定位。

## 角色与前置条件

| 角色 | 需要什么 |
|---|---|
| 出卷老师 | `project:create`、`project:update`；组卷还要 `repo:list`/`repo:detail`；发布要 `project:publish` |
| 学员 | 被加入 `t_project_partner`（`type=3`，个人或组）才有"考试安排"入口；还要 `project:answer` 才能进 `/tasks` |
| 阅卷/看数据 | `answer:list`（数据页）、`answer:export`（导出）、`project:report`（报表） |
| 系统 | 后端已启动、MySQL 可用；生产环境必须配置 `JWT_SECRET`，否则重启会掉登录态 |

## 端到端步骤

1. **建空卷或直接组卷**
   - 空白建卷：`client/src/pages/project/List.tsx` 的 `submitCreate` 调 `POST /api/project/create`，请求 `{ name, mode:'exam', parentId, setting: DEFAULT_SETTING, survey: { title, type:'Survey', attribute:{ mode:'exam' }, children: [] } }`。
   - 从题库组卷：先打开 `ComposeModal`，选题库、按题型配题数/每题分值，然后 `POST /api/project/create` 建空项目 → `POST /api/repo/pick` 抽题 → 补 `required`/`dataSource` → `POST /api/project/update { id, survey }`。详细链路见 [repo-compose](./repo-compose.md)。
   - 服务端 `ProjectServiceImpl.addProject` 会补齐 `ProjectSetting`，生成 6 位项目 id，并写入一条 `t_project_partner(type=1 OWNER)`。
2. **编辑器补题/改结构**：`/survey/:id/edit` 调 `GET /api/project` 拿整棵树；保存时 `normalizeSchema` 补齐 children，再 `POST /api/project/update { id, name, survey, setting }`。这一步只写 `t_project.survey`，不影响已发布状态。
3. **配置发布/考试设置**：`/survey/:id`（概述页）把概览与全部 `setting` 合并成一个表单。保存时 `POST /api/project/update { id, setting }`；发布开关变更再单独调 `POST /api/project/status`（`project:publish`）。关键字段：
   - `answerSetting`：密码、需登录、进度条、题号、自动暂存、回收上限、截止时间、IP/设备/登录/白名单限次。
   - `examSetting`：开考/结束时间、最短/最长交卷分钟、排名、练习模式、闯关模式与每题秒数、随机顺序、随机抽题、错题练习、允许切屏次数。
   - `submittedSetting`：允许修改答案、完成跳转、成绩单、答案解析、排名显示、公开查询。
4. **发布**：`POST /api/project/status { id, status:1 }`。`ProjectServiceImpl.updateProjectStatus` 同时写 `t_project.status` 和 `setting.status`；两个字段必须一致——列表读列，答题页读 setting。发布后公开链接是 `/s/{projectId}`。
5. **学员进入**：学员在 `/tasks?tab=exam` 看到 `ProjectList` 的学员视图（只有"开始答题"按钮，没有管理入口）。点击直接跳 `/s/{id}`；这一步不要求 `project:detail`，因为公开接口只靠项目 id。
6. **首屏加载**：`PublicAnswer` 调 `POST /api/public/projectOutline`。`SurveyServiceImpl.loadProject` 依次处理：项目不存在 → 404；微信授权未完成 → 只返回授权提示；`repoId` 练习 → 题库练习分支；否则 `convertAndValidateLoginFormIfNeeded`（密码/登录/白名单）→ `validateProject`（状态/上限/截止/限次/考试时间）→ 随机卷 → 最近一份答案。首屏只返回 `outline` + shell，不返回题干/选项。
7. **逐题取题**：前端按 `outline` 里的题 id 调 `POST /api/public/question { id, answerId, questionId }`。后端重新走 `loadProject`，校验题目属于当前项目/随机卷快照，再按模式剥离答案；练习模式保留正确答案/解析，非练习模式连分值一起剥。
8. **交卷**：`POST /api/public/saveAnswer { projectId, id, answer, survey, freshAttempt, metaInfo }`。校验顺序：
   1. `validateSubmittable`：`setting.status` 必须为 1、未过 `answerSetting.endTime`、新答卷不超过 `maxAnswers`。
   2. `validateAnswerGate`：`loginRequired` 必须已登录、`password` 必须已通过密码 Cookie、`whitelistType` 必须命中白名单。
   3. `AnswerServiceImpl.saveAnswer`：15 秒幂等（projectId + 答题人 + 答案指纹）、生成 UUID、`beforeSaveAnswer` 丢弃考试模式客户端 `survey`、校验最短/最长答题时间、绑定附件、判分、写错题本。
9. **判分**：`AnswerScoreEvaluator` 只使用服务端 schema（随机卷快照优先，否则项目 `survey`）。按每题 `examAnswerMode`：`onlyOne` / `selectAll` / `selectCorrect` / `select`；`manual`/`none` 不自动判。结果写 `t_answer.exam_score` 与 `exam_info.questionScore`。闯关模式超时题由 `SurveyServiceImpl.applyPassModePenalty` 记 0 分并重算总分。
10. **成绩单**：`/s/{id}/exam-result/{answerId}` 调 `POST /api/public/loadExamResult`。只有 `submittedSetting.answerAnalysis=true` 且考试结束（`examFinished`）才返回答案/schema/examInfo；`transcriptVisible` 控制总分，`rankVisible` 控制排名。随机卷快照如果缺正确答案，会回退项目 schema。
11. **再次作答**：`/s/{id}?fresh=1` 会清本地 answerId/草稿，提交时带 `freshAttempt=true`，后端跳过"复用最近一份"直接新建；`POST /api/public/attempts` 返回该用户在这份试卷上的历次成绩。
12. **数据与报表**：老师进 `/survey/:id/data`（`answer:list`）看全部答卷；`/survey/:id/report`（`project:report`）看逐题统计与每日趋势。导出走 `POST /api/repo/export/token` → `GET /api/answer/download`，见 [answer](../modules/answer.md)。

## 状态与判定矩阵

| 设置/字段 | 影响点 | 读哪里 |
|---|---|---|
| `project.status` | 列表显示"已发布/未发布" | `t_project.status` |
| `setting.status` | 答题页是否允许打开/提交（0 → `SurveySuspend` 4000） | `ProjectSetting.status` |
| `answerSetting.endTime` | 超过后 `ExceededEndTime` 4011 | `validateSubmittable` / `validateProject` |
| `answerSetting.maxAnswers` | 新答卷达到上限 `ExceededMaxAnswers` 4010 | `validateSubmittable` |
| `examSetting.startTime/endTime` | 未开始 `ExamUnStarted` 6000 / 已结束 `ExamFinished` 6010 | `validateExamSetting` |
| `examSetting.minSubmitMinutes/maxSubmitMinutes` | 最短/最长交卷；最长到点前端自动交卷 | `PublicAnswer` + `AnswerScoringService#assertWithinTimeLimit` |
| `examSetting.maxSwitchScreenTimes` | 达到次数自动交卷并锁定 | `PublicAnswer` visibilitychange + `/api/public/exam/switch-screen` |
| `examSetting.exerciseMode` | 逐题下发时保留正确答案/解析 | `loadPublicQuestion` |
| `examSetting.passMode` | 一页一题、不可回头、超时 0 分 | `PublicAnswer` + `applyPassModePenalty` |
| `submittedSetting.enableUpdate` | 未开启时再次保存返回 4020 | `SurveyServiceImpl.saveAnswer` |
| `submittedSetting.transcriptVisible/answerAnalysis/rankVisible` | 成绩单显示哪些块 | `loadExamResult` |

## 数据与权限

| 步骤 | 接口 | 权限 | 数据落点 |
|---|---|---|---|
| 建卷 | `POST /api/project/create` | `project:create` | `t_project` + `t_project_partner(OWNER)` |
| 组卷抽题 | `POST /api/repo/pick` | `repo:detail`/`repo:book`/admin | 只读题库；结果写入 `t_project.survey` |
| 保存题目 | `POST /api/project/update` | `project:update` + `@EnableDataPerm` | `t_project.survey` |
| 保存设置 | `POST /api/project/update` | `project:update` + `@EnableDataPerm` | `t_project.setting` |
| 发布 | `POST /api/project/status` | `project:publish`/admin + `@EnableDataPerm` | `t_project.status` + `setting.status` |
| 公开加载/取题/交卷 | `/api/public/*` | 无注解，Service 校验 | `t_answer` |
| 成绩单 | `POST /api/public/loadExamResult` | 凭 answerId | 只读 `t_answer` |
| 数据页 | `GET /api/answer/list` | `answer:list` + `@EnableDataPerm` | 只读 `t_answer` |
| 报表 | `GET /api/report/{shortId}` | `project:report` + `@EnableDataPerm` | 只读 `t_answer` |
| 导出 | `GET /api/answer/download` | `answer:export` + 导出 token/密码 | 只读 `t_answer`，写 `t_audit_log` |

## 已知限制

- **学员看不到考试**：不是 `project.status` 的问题，先查 `t_project_partner` 是否有该用户的 `type=3` 记录（或组授权 + 用户组链）。
- **状态两处不一致**：直接改数据库只改 `status` 或只改 `setting.status`，会出现"列表显示已发布但打不开"或反之；发布/关闭统一走 `/api/project/status`。
- **密码/登录不是同一种**：`answerSetting.password` 通过答题页表单 `extraPassword` 校验，成功后写 2 小时 `sk_pwd_<projectId>` Cookie；`loginRequired` 走答题页内嵌登录表单，密码是**明文**提交（HTTPS 保护），不是 `/api/public/login` 的 RSA 加密。
- **最短/最长交卷依赖客户端上报的开始时间**：服务端有合理性校验（不能晚于现在、不能早于 24 小时/开考时间），但没有独立计时器；客户端谎报更早开始可以让最短交卷提前满足，最长交卷更容易触发（自伤方向）。
- **切屏计数是"读-改-写"**：`recordSwitchScreen` 用 JVM 内的 `switchScreenLocks` 串行化；单实例够用，多实例部署会丢计数，需要改数据库原子自增。
- **随机卷快照会污染统计**：`RandomSurveyProcessor` 会先写一条没有 `answer` 的 `t_answer`（`tempSave` 默认 1），报表/列表总数可能把它算进去；详见 [answer](../modules/answer.md) 的坑。
- **成绩单的逐题对错是前端预览**：最终分数以 `exam_score` 为准；`manual` 模式标注"待人工评分"。
- **允许修改答案不等于可以无限重交**：`enableUpdate=false` 时第二次提交 4020；临时保存（`tempSave=0`）仍允许覆盖自己的草稿。
- **"再考一次"必须带 `fresh=1`**：否则后端会复用最近一份答卷并走"修改答案"逻辑，没开 `enableUpdate` 时会被 4020 拦住。

## 验证

```bash
cd client && npm run check
python scripts/nas/smoke-test.py
npm run docs:check
```

手工冒烟：

1. 空白建考试 → 加 2 道单选 + 1 道填空 → 保存 → 刷新编辑器，题目和分值不丢。
2. 发布后用学员账号打开 `/s/{id}`，首屏 Network 里 `projectOutline` 不含题干；逐题 `question` 不含 `examCorrectAnswer`。
3. 交卷后 `/api/answer/list` 出现一条 `temp_save=1` 的记录，`exam_score` 等于各题得分之和。
4. 关闭"允许修改答案"再交一次，返回 4020；打开后可以再交，且历史成绩保留。
5. 数据页能看到答卷；报表总数与数据页一致（若开启随机抽题，确认空快照是否被计入）。

## 相关文档

- [考试与问卷（项目）](../modules/project.md)
- [考试编辑器与题型](../modules/survey.md)
- [答卷、判分与报表](../modules/answer.md)
- [从题库组卷到考试](./repo-compose.md)
- [登录与会话](./login-auth.md)
- [权限、角色与用户组](../modules/permissions.md)
