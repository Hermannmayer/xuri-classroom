---
id: module-answer
title: 答卷、判分与报表
status: current
keywords:
  - 答卷
  - 判分
  - 成绩单
  - 报表
  - 导出
  - 回收站
  - t_answer
  - AnswerScoreEvaluator
source_globs:
  - client/src/pages/answer/**
  - client/src/pages/survey/Data.tsx
  - client/src/pages/survey/Report.tsx
  - client/src/pages/survey/data/**
  - client/src/pages/survey/report/**
  - server/api/src/main/java/cn/surveyking/server/api/AnswerApi.java
  - server/api/src/main/java/cn/surveyking/server/api/ReportApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ReportServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/AnswerScoreEvaluator.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/ProjectStatHelper.java
entrypoints:
  - client/src/pages/answer/PublicAnswer.tsx
  - client/src/pages/answer/ExamResult.tsx
  - client/src/pages/answer/PublicQuery.tsx
  - client/src/pages/survey/Data.tsx
  - client/src/pages/survey/Report.tsx
  - server/api/src/main/java/cn/surveyking/server/api/AnswerApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/AnswerScoreEvaluator.java
apis:
  - GET /api/answer/list
  - GET /api/answer
  - GET /api/answer/trash
  - POST /api/answer/create
  - POST /api/answer/update
  - POST /api/answer/delete
  - POST /api/answer/destroy
  - POST /api/answer/restore
  - GET /api/answer/download
  - POST /api/answer/upload
  - GET /api/report/{shortId}
  - POST /api/public/saveAnswer
  - POST /api/public/loadExamResult
  - POST /api/public/attempts
  - POST /api/public/exam/switch-screen
tables:
  - t_answer
  - t_project
  - t_file
tests:
  - client:npm run check
  - docs:npm run docs:check
  - nas:python scripts/nas/smoke-test.py
last_verified: 2026-11-09
verified_against: c0e3501fb432dfcbb2da095a36de431938398737
---

# 答卷、判分与报表

## 30 秒摘要

一份答卷是一行 `t_answer`：`answer` 存最终作答、`temp_answer` 存草稿、`survey` 存随机卷快照、`exam_score` / `exam_info` 存总分与逐题得分。这个模块覆盖"公开答题 → 交卷判分 → 成绩单 → 数据页 → 报表 → 导出/回收站"，后端入口是 `AnswerApi`、`ReportApi`，大部分规则在 `AnswerServiceImpl` 与 `AnswerScoreEvaluator`。题目结构在 [survey](./survey.md)，项目生命周期在 [project](./project.md)。

## 什么时候看这篇

- 交卷报错、分数不对、某题没判分、成绩单不显示答案解析。
- 要改答卷列表的列、补录/编辑/删除/恢复数据。
- 导出 Excel 空文件、提示导出密码错误、导出 token 失效。
- 报表 500、总数比实际交卷多、逐题统计不准。
- 要确认学员能不能看到别人的答卷。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 公开答题页 | `client/src/pages/answer/PublicAnswer.tsx` | 首屏大纲、逐题加载、本地草稿、提交、倒计时/切屏/闯关 |
| 成绩单/解析 | `client/src/pages/answer/ExamResult.tsx` | `/api/public/loadExamResult`；逐题对错只是前端预览 |
| 公开查询 | `client/src/pages/answer/PublicQuery.tsx` | 按条件查询/修改答卷，走 `/api/public/loadQuery` / `getQueryResult` |
| 数据页 | `client/src/pages/survey/Data.tsx` | 全量答卷表格、筛选/排序、详情、补录/编辑、导入、导出、回收站入口 |
| 答卷回收站 | `client/src/pages/survey/data/TrashDrawer.tsx` | `answer:list` + `answer:restore`/`answer:delete` |
| 报表页 | `client/src/pages/survey/Report.tsx`、`pages/survey/report/QuestionBlock.tsx` | 每日趋势、逐题选项分布、数值统计 |
| 数据格式化 | `client/src/pages/survey/data/format.ts` | 答案值 → 表格单元格文本（空值统一 `—`） |
| 答卷接口 | `server/api/src/main/java/cn/surveyking/server/api/AnswerApi.java` | 管理侧 CRUD、导入导出、回收站 |
| 报表接口 | `server/api/src/main/java/cn/surveyking/server/api/ReportApi.java` | `GET /api/report/{shortId}`，`project:report` + 数据权限 |
| 答卷实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerServiceImpl.java` | 列表范围、幂等提交、判分、导出、回收站、导入 |
| 判分器 | `server/shared/src/main/java/cn/surveyking/server/core/uitls/AnswerScoreEvaluator.java` | `onlyOne` / `selectAll` / `selectCorrect` / `select` |
| 报表实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ReportServiceImpl.java` | 逐题选项计数、每日答卷数、数值 min/max/avg |
| 公开统计 | `server/shared/src/main/java/cn/surveyking/server/core/uitls/ProjectStatHelper.java` | 投票/配额用的轻量统计 |
| 数据表 | `t_answer`、`t_project`、`t_file` | 答卷、项目/题目树、附件引用 |

## 关键流程

1. **打开答题页**：`/s/:id`（可选 `/:answerId`）先 `POST /api/public/projectOutline`。后端 `SurveyServiceImpl.loadProject` 会按项目设置依次处理微信授权、题库练习、密码/登录表单、随机卷、最近一份答案；返回的 `survey` 首屏只有 shell + `outline`，不含题干和选项。前端 `applyProject` 恢复 `answerId`、答案、切屏次数，并从 `localStorage` 读未提交草稿。
2. **逐题取题**：`PublicAnswer` 对当前题调 `POST /api/public/question { id, answerId, questionId }`；后端重新走 `loadProject`，校验题目属于当前项目/快照，再按模式剥答案。练习模式保留正确答案/解析，其它模式连 `examScore` 一起剥。
3. **提交**：`doSubmit` 调 `POST /api/public/saveAnswer`，带 `projectId`、`id`、`answer`、`survey`、`freshAttempt`、`metaInfo`。后端 `SurveyServiceImpl.saveAnswer` 先做提交路径校验（`validateSubmittable`：状态/截止/回收上限；`validateAnswerGate`：密码/登录/白名单/开始时间/限次），再处理随机卷 Cookie、公开查询修改、允许修改答案、`freshAttempt` 新轮次。
4. **保存与判分**：`AnswerServiceImpl.saveAnswer` 对新答卷做 15 秒应用级幂等（key = projectId + 答题人 + 答案指纹），生成 UUID 作为 `t_answer.id`；`beforeSaveAnswer` 丢弃考试模式下客户端上传的 `survey`（防伪造正确答案刷分），校验最长/最短答题时间，绑定附件，调 `computeExamScore`。判分 schema 只来自服务端：库里随机卷快照优先，否则项目 `survey`。
5. **判分口径**：`AnswerScoreEvaluator` 按每题的 `attribute.examAnswerMode` 选 evaluator：`onlyOne`（唯一正确项且只选一个）、`selectAll`（全对才得分）、`selectCorrect`（选择类选错整题 0 分，填空类按正确项累加）、`select`（按选中项分值累加）。`manual` / `none` 没有 evaluator，按 0 分或人工处理；自动判分只覆盖 `examType()` 的 7 种题型。结果写 `exam_score` 与 `exam_info.questionScore`。
6. **成绩单**：`/s/:id/exam-result/:answerId` 调 `POST /api/public/loadExamResult`。只有 `submittedSetting.answerAnalysis=true` 且考试已结束（`examFinished`）才返回答案/schema/examInfo；`transcriptVisible` 控制总分，`rankVisible` 控制排名。随机卷快照若已剥掉正确答案，会回退项目 schema 渲染解析。
7. **数据页**：`/survey/:id/data`（`answer:list`）用 `pageSize=-1` 拉全量，前端筛选/排序/分页。列由项目 schema 的 `flattenSchema(...).filter(isDataQuestion)` 生成；单元格文本由 `data/format.ts` 统一格式化。补录走 `POST /api/answer/create`，编辑走 `POST /api/answer/update`，删除走 `/delete`（进回收站）。
8. **导出**：先 `POST /api/repo/export/token { exportPassword }` 换一次性 token（60 秒、绑定用户、用一次失效），再 `GET /api/answer/download?projectId=...&pageSize=-1&exportToken=...`。后端 `ExportGuardService` 校验 token/密码，导出成功后写一条 `EXPORT_ANSWER` 审计；没有配置导出密码时直接放行。
9. **报表**：`GET /api/report/{shortId}`（`project:report` + `@EnableDataPerm`）。`ReportServiceImpl.getData` 按 `project_id` 取全部答卷，递归统计选项/数值，再算每日答卷数；前端用项目 schema 或最新答卷快照渲染每题区块。
10. **回收站**：`POST /api/answer/delete` 只把 `is_deleted` 置 1；`GET /api/answer/trash` 查已删；`/restore` 恢复（`answer:restore` 或 admin），`/destroy` 物理删除（`answer:delete`）。`listAnswer` 默认过滤逻辑删除，回收站列表用 Mapper 的 `selectLogicDeleted`。

## 修改指南

### 改判分规则

1. 先改 `AnswerScoreEvaluator`：新增/调整 `Evaluator`，确认 `support` 条件与 `eval` 的 0 分边界。
2. 同步 `SurveySchema.ExamScoreMode` 枚举、`client/src/schema/types.ts` 的 `ExamScoreMode`，以及编辑器属性面板的计分方式选项。
3. 判分 schema 只能来自 `trustedScoreSchema`（服务端快照/项目 schema），不要改成请求体里的 `answer.survey`，否则客户端可伪造 `examCorrectAnswer` 刷满分。
4. 用一份含单选/多选/填空的考试分别测 4 种模式，再测"未作答"必须 0 分且不进错题本。

### 新增答卷字段/接口

1. 后端：`Answer` 实体 → `AnswerRequest` / `AnswerView` / `AnswerQuery` → `AnswerViewMapper` → `AnswerServiceImpl`。
2. 数据库：改 `init-mysql.sql` 的 `t_answer`，同时在 `scripts/nas/migrate/` 加幂等迁移；有数据的库不要重跑 init。
3. 前端：`client/src/schema/project.ts` 的 `Answer` 类型、`Data.tsx` 的列/详情、`ExamResult.tsx` 的展示。
4. 如果字段参与导出，同步 `SchemaHelper.parseColumns` / `AnswerServiceImpl.export`。

### 改导出/回收站

1. 导出权限在 `AnswerApi#download`（`answer:export` + `@EnableDataPerm`），密码/token 在 `ExportGuardService`；不要只改前端按钮。
2. 回收站恢复/彻底删除分别在 `AnswerApi#restoreAnswer` / `batchDestroyAnswer`；`batchDestroy` 是物理 DELETE，改动前确认审计与备份要求。
3. 删除/恢复整批答卷时，`assertAnswersAccess` 会按答卷所属项目逐个校验，不能只校验第一个 id。

## 权限与数据范围

| 动作 | 权限 | 数据范围 |
|---|---|---|
| 答卷列表/回收站 | `answer:list` + `@EnableDataPerm` | 管理员/项目 OWNER/COLLABORATOR（含组授权）看全部；其他登录用户只看 `create_by=自己` |
| 查看单份 | `answer:detail` | `assertAnswerAccess`：本人 / 项目管理者 / admin |
| 补录 | `answer:create` + `@EnableDataPerm` | 项目管理者 |
| 修改 | `answer:update` | 本人或项目管理者；后台编辑会强制沿用原 `projectId` |
| 删除 | `answer:delete` | 项目管理者；删除进回收站 |
| 恢复 | `answer:restore` 或 admin | 项目管理者 |
| 彻底删除 | `answer:delete` | 项目管理者；物理删除 |
| 导出 | `answer:export` + 导出密码/token | 项目管理者 |
| 导入数据 | `answer:upload` | 项目管理者 |
| 报表 | `project:report` + `@EnableDataPerm` | 项目管理者/admin |

## 坑与已知限制

- **导出并发受限、统计不读整卷快照**：导出走 `EXPORT_POOL`（2 并发 + 队列 4，队满返回中文错误而不是把 JVM 拖死）；统计走 `listAnswerForStat`，只 SELECT `answer` 等必要列，不再把每份答卷的整卷 `survey`（100 题约 30~80KB）读进堆。给 `listAnswer` 加字段时注意：不要把 `survey` 加回统计路径，否则单场 500 份的统计会重新变成几百 MB 的临时对象。
- **报表可能把随机卷快照算进总数**：`ReportServiceImpl.getData` 按 `project_id` 取全部 `t_answer`，不过滤 `answer IS NULL`。`RandomSurveyProcessor` 创建随机卷快照时会先写一条没有 `answer` 的答卷（`saveAnswer` 会把 `tempSave` 默认成 1），因此报表总数和逐题统计可能包含这些空记录；`parseAnswer` 对 null `answer` 也没有防御，极端情况下会 500。项目列表的 `total` 也按 `temp_save=1` 计数，同样会把快照算进去。
- **数据页全量进内存**：`Data.tsx` 固定 `pageSize=-1`，筛选/排序/分页都在前端。答卷上万条后首屏会明显变慢，需要改成服务端分页 + 服务端排序。
- **彻底删除不清理附件**：`batchDestroyAnswer` 只执行 `DELETE FROM t_answer`，没有看到删除 `t_file` 或物理附件的代码；回收站提示"附件也会一起清掉"与当前实现不完全一致，需另行确认/补清理任务。
- **导出 token 在内存里**：`ExportGuardService` 的 token 存在 `ConcurrentHashMap`，60 秒过期、用一次即失效、绑定用户；后端重启或多实例部署会失效/互不认。不要把它当持久下载链接。
- **旧的 `exportPassword` 参数仍兼容**：`AnswerApi#download` 同时接受 `exportToken` 和 `exportPassword`，优先 token。密码出现在 URL 会进访问日志，前端应继续走"先换 token"。
- **`tempSave=0` 的草稿不在列表里**：`listAnswer` 有 `isNotNull(Answer::getAnswer)`，未提交/仅暂存的记录不会出现在数据页；不要用答卷列表判断"有没有人打开过"。
- **`answer:attach` 没有接到接口**：答题页附件走公开 `POST /api/public/upload`，管理侧导入走 `answer:upload`；权限目录里的 `answer:attach` 目前只是注释约定，改附件权限时要一起确认。
- **成绩单逐题对错是前端预览**：`ExamResult.tsx` 用 `utils/scoring.ts` 自行比对，最终分数以服务端 `exam_score` 为准；`manual` 模式会标"待人工评分"，不会假装判过。
- **公开查询与普通答卷共用 `t_answer`**：`PublicQuery` 的修改走 `validateAndMergeAnswer`，字段权限由 `ProjectSetting.PublicQuery.fieldPermission` 控制；改答卷结构时要同时看 `SurveyServiceImpl.getQueryResult` / `filterAnswerByFieldPermission`。

## 验证

```bash
cd client && npm run check
python scripts/nas/smoke-test.py
npm run docs:check
```

手工回归：

1. 学员提交一份含单选/多选/填空的试卷，成绩单总分 = 各题得分之和；未作答题目 0 分且不出现在错题本。
2. 关闭"允许修改答案"后再提交同一份，后端返回 4020，前端提示"未开启允许修改答案"。
3. 数据页新增/编辑/删除一份答卷，回收站能恢复，彻底删除后列表与回收站都不再出现。
4. 配置导出密码：错误密码报"导出密码错误"；正确密码换 token 后能下载；同一 token 第二次应失效。
5. 报表打开不白屏，每日趋势与答卷总数对得上（若开启随机抽题，先确认快照行是否被计入）。

## 相关文档

- [考试与问卷（项目）](./project.md)
- [考试编辑器与题型](./survey.md)
- [任务中心、练习与错题本](./exercise.md)
- [登录与会话](../flows/login-auth.md)
- [数据模型](../architecture/data-model.md)
