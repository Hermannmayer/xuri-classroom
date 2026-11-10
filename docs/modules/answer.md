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
  - 班级
  - 按班学情
  - 按班导出
  - classId
  - 匿名答卷
  - sk-anon
  - is_anonymous
  - anonymous_subject_id
  - PublicAttemptView
  - 匿名清理
  - 保留天数
  - purgeOlderThan
  - t_answer
  - t_answer.class_id
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
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerExporter.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerSubmitIdempotency.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerUploadParser.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerScoringService.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java
  - server/rdbms/src/main/resources/mapper/TeachingMapper.xml
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerSchemaDecorator.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerMetaEnricher.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ExerciseAnswerService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/LinkSurveyUpdater.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ReportServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/AnswerScoreEvaluator.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/ProjectStatHelper.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/AnswerQuery.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/DownloadQuery.java
  - server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/AnonymousIdentityService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnonymousIdentityServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/AnonymousSubject.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/AnonymousSubjectMapper.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/Answer.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/PublicSurveyExtrasService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnonymousCleanupService.java
  - server/api/src/main/java/cn/surveyking/server/api/SystemApi.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/SystemInfo.java
  - client/src/pages/system/Setting.tsx
  - scripts/nas/migrate/33-anonymous-answer.sql
entrypoints:
  - client/src/pages/answer/PublicAnswer.tsx
  - client/src/pages/answer/AnonymousAnswersDrawer.tsx
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
  - POST /api/answer/export/token
  - POST /api/answer/upload
  - GET /api/report/{shortId}
  - POST /api/public/saveAnswer
  - GET /api/public/anonymous/answers
  - POST /api/public/anonymous/claim
  - POST /api/system/anonymous/cleanup
  - POST /api/public/loadExamResult
  - POST /api/public/attempts
  - POST /api/public/exam/switch-screen
tables:
  - t_answer
  - t_project
  - t_class_resource
  - t_user
  - t_anonymous_subject
  - t_sys_info
  - t_file
tests:
  - client:npm run check
  - docs:npm run docs:check
  - nas:python scripts/nas/smoke-test.py
last_verified: 2026-11-10
verified_against: 195a7d45051c0de73bfe0abe6ed1e79342aa7765
---

# 答卷、判分与报表

## 30 秒摘要

一份答卷是一行 `t_answer`：`answer` 存最终作答、`temp_answer` 存草稿、`survey` 存随机卷快照、`exam_score` / `exam_info` 存总分与逐题得分；本轮新增 `class_id` 记录「答题时所在班级」，并加入匿名答卷主体 `t_anonymous_subject` / `sk-anon` / `is_anonymous`。这个模块覆盖"公开答题 → 交卷判分 → 成绩单 → 数据页 → 报表 → 导出/回收站"，后端入口是 `AnswerApi`、`ReportApi`，大部分规则在 `AnswerServiceImpl` 及其 impl 包下的组件与 `AnswerScoreEvaluator`。题目结构在 [survey](./survey.md)，项目生命周期在 [project](./project.md)。

## 什么时候看这篇

- 交卷报错、分数不对、某题没判分、成绩单不显示答案解析。
- 要改答卷列表的列、补录/编辑/删除/恢复数据。
- 导出 Excel 空文件、提示导出密码错误、导出 token 失效。
- 报表 500、总数比实际交卷多、逐题统计不准。
- 要确认学员能不能看到别人的答卷。
- 匿名答卷刷新/换设备后找不回、登录后认领不到，或报表里匿名数对不上。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 公开答题页 | `client/src/pages/answer/PublicAnswer.tsx` | 首屏大纲、逐题加载、本地草稿、提交、倒计时/切屏/闯关；交卷后「我的答卷」抽屉（匿名/登录都可看） |
| 匿名答卷抽屉 | `client/src/pages/answer/AnonymousAnswersDrawer.tsx` | `GET /public/anonymous/answers` 列本设备/本人答卷；登录后 `POST /public/anonymous/claim` 认领 |
| 匿名身份 | `server/rdbms/src/main/java/cn/surveyking/server/impl/AnonymousIdentityServiceImpl.java` | `sk-anon` cookie、SHA-256 主体、ensure/current/claim/purge；匿名答卷不写 `create_by` |
| 匿名清理 | `server/rdbms/src/main/java/cn/surveyking/server/impl/AnonymousCleanupService.java` | `purgeOlderThan(days)`：只删 `is_anonymous=1` 且过期答卷（逻辑删），主体无剩余匿名答卷时物理删；每日 03:30 + 手动 `/system/anonymous/cleanup` |
| 成绩单/解析 | `client/src/pages/answer/ExamResult.tsx` | `/api/public/loadExamResult`；逐题对错只是前端预览 |
| 公开查询 | `client/src/pages/answer/PublicQuery.tsx` | 按条件查询/修改答卷，走 `/api/public/loadQuery` / `getQueryResult` |
| 数据页 | `client/src/pages/survey/Data.tsx` | 全量答卷表格、筛选/排序、详情、补录/编辑、导入、导出、回收站入口 |
| 答卷回收站 | `client/src/pages/survey/data/TrashDrawer.tsx` | `answer:list` + `answer:restore`/`answer:delete` |
| 报表页 | `client/src/pages/survey/Report.tsx`、`pages/survey/report/QuestionBlock.tsx` | 每日趋势、逐题选项分布、数值统计 |
| 数据格式化 | `client/src/pages/survey/data/format.ts` | 答案值 → 表格单元格文本（空值统一 `—`） |
| 答卷接口 | `server/api/src/main/java/cn/surveyking/server/api/AnswerApi.java` | 管理侧 CRUD、导入导出、回收站；`/download` 带 `classId` 走按班导出；`/export/token` 换一次性 token |
| 公开匿名接口 | `server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java` | `loadProject` 在未登录且不要求登录时建匿名主体；`GET /anonymous/answers`、`POST /anonymous/claim` |
| 按班报表接口 | `server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java` | `GET /api/teaching/classes/answers`：班级可见即可看本班答卷（见 [teaching](./teaching.md)） |
| 报表接口 | `server/api/src/main/java/cn/surveyking/server/api/ReportApi.java` | `GET /api/report/{shortId}`，`project:report` + 数据权限 |
| 答卷实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerServiceImpl.java` | 列表范围与回收站；匿名新建/更新保留标识；按班 `listAnswerByClass` / `downloadByClass`；提交前的判分/附件绑定在 `AnswerScoringService`、幂等在 `AnswerSubmitIdempotency`、导出在 `AnswerExporter`、导入在 `AnswerUploadParser`，其余见同目录 |
| 班级归属 | `server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java` | `resolveForStudent`：按「学生班级 + 班级资源分配」算 `t_answer.class_id`，主班优先 |
| 判分器 | `server/shared/src/main/java/cn/surveyking/server/core/uitls/AnswerScoreEvaluator.java` | `onlyOne` / `selectAll` / `selectCorrect` / `select` |
| 报表实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ReportServiceImpl.java` | 逐题选项计数、每日答卷数、数值 min/max/avg |
| 公开统计 | `server/shared/src/main/java/cn/surveyking/server/core/uitls/ProjectStatHelper.java` | 投票/配额用的轻量统计 |
| 数据表 | `t_answer`、`t_anonymous_subject`、`t_project`、`t_class_resource`、`t_file` | 答卷（含 `class_id`/匿名列）、匿名主体、项目/题目树、班级分配、附件引用 |

## 关键流程

1. **打开答题页**：`/s/:id`（可选 `/:answerId`）先 `POST /api/public/projectOutline`。后端 `SurveyServiceImpl.loadProject` 会按项目设置依次处理微信授权、题库练习、密码/登录表单、随机卷、最近一份答案；返回的 `survey` 首屏只有 shell + `outline`，不含题干和选项。前端 `applyProject` 恢复 `answerId`、答案、切屏次数，并从 `localStorage` 读未提交草稿。
2. **逐题取题**：`PublicAnswer` 对当前题调 `POST /api/public/question { id, answerId, questionId }`；后端重新走 `loadProject`，校验题目属于当前项目/快照，再按模式剥答案。练习模式保留正确答案/解析，其它模式连 `examScore` 一起剥。
3. **提交**：`doSubmit` 调 `POST /api/public/saveAnswer`，带 `projectId`、`id`、`answer`、`survey`、`freshAttempt`、`metaInfo`。后端 `SurveyServiceImpl.saveAnswer` 先做提交路径校验（`validateSubmittable`：状态/截止/回收上限；`validateAnswerGate`：密码/登录/白名单/开始时间/限次），再处理随机卷 Cookie、公开查询修改、允许修改答案、`freshAttempt` 新轮次。
4. **保存与判分**：`AnswerServiceImpl.saveAnswer` 对新答卷做 15 秒应用级幂等（key = projectId + 答题人 + 答案指纹，实现在 `AnswerSubmitIdempotency`），生成 UUID 作为 `t_answer.id`；新建答卷还会调 `ClassResourceService#resolveForStudent` 写 `t_answer.class_id`（主班优先；匿名/教职工为 NULL），更新答卷不改该字段；`AnswerScoringService#beforeSaveAnswer` 丢弃考试模式下客户端上传的 `survey`（防伪造正确答案刷分），校验最长/最短答题时间，绑定附件，调 `computeExamScore`。判分 schema 只来自服务端：库里随机卷快照优先，否则项目 `survey`。
5. **判分口径**：`AnswerScoreEvaluator` 按每题的 `attribute.examAnswerMode` 选 evaluator：`onlyOne`（唯一正确项且只选一个）、`selectAll`（全对才得分）、`selectCorrect`（选择类选错整题 0 分，填空类按正确项累加）、`select`（按选中项分值累加）。`manual` / `none` 没有 evaluator，按 0 分或人工处理；自动判分只覆盖 `examType()` 的 7 种题型。结果写 `exam_score` 与 `exam_info.questionScore`。
6. **成绩单**：`/s/:id/exam-result/:answerId` 调 `POST /api/public/loadExamResult`。只有 `submittedSetting.answerAnalysis=true` 且考试已结束（`examFinished`）才返回答案/schema/examInfo；`transcriptVisible` 控制总分，`rankVisible` 控制排名。随机卷快照若已剥掉正确答案，会回退项目 schema 渲染解析。
7. **数据页**：`/survey/:id/data`（`answer:list`）用 `pageSize=-1` 拉全量，前端筛选/排序/分页。列由项目 schema 的 `flattenSchema(...).filter(isDataQuestion)` 生成；单元格文本由 `data/format.ts` 统一格式化。补录走 `POST /api/answer/create`，编辑走 `POST /api/answer/update`，删除走 `/delete`（进回收站）。
8. **导出**：先 `POST /api/repo/export/token { exportPassword }`（数据页）或 `POST /api/answer/export/token`（班级答卷抽屉）换一次性 token（60 秒、绑定用户、用一次失效），再 `GET /api/answer/download?projectId=...&pageSize=-1&exportToken=...`（按班再加 `classId`）。后端 `ExportGuardService` 校验 token/密码，导出成功后写一条 `EXPORT_ANSWER` 审计；没有配置导出密码时直接放行。
9. **报表**：`GET /api/report/{shortId}`（`project:report` + `@EnableDataPerm`）。`ReportServiceImpl.getData` 按 `project_id` 取全部答卷，递归统计选项/数值，再算每日答卷数；前端用项目 schema 或最新答卷快照渲染每题区块。
10. **回收站**：`POST /api/answer/delete` 只把 `is_deleted` 置 1；`GET /api/answer/trash` 查已删；`/restore` 恢复（`answer:restore` 或 admin），`/destroy` 物理删除（`answer:delete`）。`listAnswer` 默认过滤逻辑删除，回收站列表用 Mapper 的 `selectLogicDeleted`。

### 按班级作答与 class_id

1. 学生能不能打开/交卷，先由 `ClassResourceService#assertStudentCanAnswer` 决定（见 [project](./project.md)）：未分配 → 404，未开始/已结束/关闭分别对应业务错误；匿名、staff、管理员不受限。
2. 新建答卷时 `AnswerServiceImpl#createAnswer` 写 `t_answer.class_id`：`resolveForStudent` 先取学生主班，主班没有有效分配时按附加组顺序取任一有效分配的班；查不到/非 student/匿名 → NULL。
3. **更新答卷不重算 `class_id`**：换班后历史答卷仍算在原班。这是有意的语义，不要改成「每次保存都按当前班级覆盖」。
4. 班级资源面板的「本班答卷数」= `t_answer` 中 `project_id + class_id + temp_save=1` 的条数；上线前/无 `class_id` 的历史答卷不会计入。
5. 学情页（`TeachingMapper#listClasses`）按答题时班级聚合：新答卷用 `a.class_id`，老数据 `class_id` 为空时回退当前主组；`LEFT JOIN t_dept d ON d.id = COALESCE(a.class_id, u.dept_id) AND d.dept_type='class' AND d.is_deleted=0`，输出 `COALESCE(d.id,'')` / `COALESCE(d.name,'未分组')`，`GROUP BY COALESCE(a.class_id,u.dept_id), d.id, d.name`。只有真实 class 节点才算班级，org 组/已删班/找不到的归「未分组」。

### 按班查看与导出（P4）

1. 查询字段：`AnswerQuery.classId` / `DownloadQuery.classId`（`t_answer.class_id`，答题时所在班级）。普通 `GET /api/answer/list` 传 `classId` 时只在原有项目数据范围内再过滤班级；不改变 `listAnswer` 的行级范围。
2. 按班报表：`AnswerService#listAnswerByClass` 必须同时有 `projectId + classId`；它**不套** `canManageProject`、也不加 `create_by=当前用户`，返回该班全部已提交答卷，并批量回填 `AnswerView.createByName`。可见性由调用方 `ClassService#assertVisible` 负责。
3. 接口：`GET /api/teaching/classes/answers?projectId=&deptId=&current=&pageSize=`（`project:report` 或 admin + `assertVisible`），返回 `PaginationResponse<AnswerView>`；`deptId` 是班级 id。
4. 按班导出：`AnswerService#downloadByClass` 只导出该班 `class_id` 命中的答卷，走真源 JSON（不做 `t_answer_item` 投影优化）；只支持 `type=answer`，附件按班导出会报「按班级导出暂只支持答卷」。
5. `/api/answer/download` 分流：带 `classId` → 先 `classService.assertVisible(classId)` 再 `downloadByClass`（不套项目协作者过滤，也不再使用 `@EnableDataPerm`）；不带 `classId` → 仍按 `projectPartnerService.getProjectPerms()` 校验项目数据范围（等价原注解）。两条路都要先过导出密码/一次性 token。
6. 新端点：`POST /api/answer/export/token`（`answer:export`）用导出密码换一次性 token，返回 `{exportToken, expiresIn}`；班级答卷抽屉用它。通用数据页导出仍调用旧的 `/api/repo/export/token`（两处共用 `ExportGuardService`，行为一致，但调用路径尚未统一）。
7. **历史数据**：`t_answer.class_id` 是 P1 之后才写入；`class_id` 为空的历史答卷不会出现在按班列表/导出里（学情概览可能按主组回退显示，两个口径会不一致）。

### 匿名答卷（P6）

1. 数据：`t_answer` 新增 `anonymous_subject_id`（`t_anonymous_subject.id`，登录用户为 NULL）与 `is_anonymous`（1/0，默认 0）；新表 `t_anonymous_subject` 只有 `id / token_hash / create_at / last_seen_at / expires_at`，迁移见 `scripts/nas/migrate/33-anonymous-answer.sql`。
2. 身份：`AnonymousIdentityServiceImpl` 在公开答题页未登录且项目 `answerSetting.loginRequired != true` 时写 `sk-anon` cookie（HttpOnly、SameSite=Lax、Secure=request.isSecure、path=/、90 天）；cookie 只放 32 字节随机 token，库里只存 SHA-256，过期主体靠 `purgeExpired()` 清理。
3. 提交：`SurveyApi#loadProject` 先 ensureSubject；`AnswerServiceImpl#createAnswer` 再兜底 ensure，并写 `create_by=null`、`is_anonymous=1`、`anonymous_subject_id=<subject>`；已登录、教职工、白名单伪身份保持原 `create_by` 逻辑。`updateAnswer` 不重算匿名标识（与 `class_id` 同原则），否则第二次保存会把匿名改成非匿名。
4. 找回/认领：`GET /api/public/anonymous/answers?projectId=` 未登录按 `sk-anon` 主体、登录按 `create_by` 返回 `List<PublicAttemptView>`（`answerId / examScore / createAt`），没有身份返回空。`POST /api/public/anonymous/claim` 必须登录；把当前 cookie 主体的匿名答卷改成 `create_by=userId`、`is_anonymous=0`、`anonymous_subject_id=null`，按 `ClassResourceService#resolveForStudent` 重算 `class_id`、重新分配 `attempt_no`（避免撞唯一键），返回认领条数。
5. 报表过滤：`listAnswer` 默认 `is_anonymous=0`（管理员/项目管理者可显式 `includeAnonymous`）；`listAnswerByClass`、`listAnswersForStat`、`downloadSurvey`/`downloadAttachment` 默认排除匿名；`AnswerQuery.excludeAnonymous` 专供 `AnswerServiceImpl#count`（统计/项目 total 用，答题限次不传）；`TeachingMapper.listMyProjects/listClasses`、`ProjectServiceImpl` 两处 total、`ProjectStatisticsService`、`ReportServiceImpl`、`ClassResourceService#loadClassAnswerStats` 都已加过滤。
6. 班级/项目统计：匿名答卷 `class_id` 为 NULL，按班资源面板的答卷数/平均分、按班答卷抽屉、班级学情都不会包含；项目列表/回收站 total、项目报表、公开统计也只统计 `is_anonymous=0`。
7. 已知限制：匿名身份只靠 cookie + 前端 localStorage，**换设备/清 cookie/历史匿名数据找不回**；`claim` 只认当前 cookie 主体，不自动合并多个匿名主体；匿名答卷没有 `create_by`，数据页/通用导出看不到，需登录 claim 后才进入常规报表。
8. 保留期清理（P7）：系统设置 `SystemInfo.SystemSetting` 有 `anonymousCleanupEnabled`（默认开）、`anonymousRetentionDays`（默认 90，夹到 1~3650）与只读的 `anonymousLastCleanupAt/Count`。`AnonymousCleanupService#cleanupDaily` 每天 03:30（`@Scheduled`、`@EnableScheduling`）调用 `purgeOlderThan`；关闭时跳过。`purgeOlderThan(days)` 只删 `is_anonymous=1` 且 `create_at < cutoff` 的答卷，走 `@TableLogic` 逻辑删除；主体下没有剩余匿名答卷时物理删 `t_anonymous_subject`。管理员可在系统设置「匿名答卷」Tab 点「立即清理」，走 `POST /api/system/anonymous/cleanup`（`system:setting:update` 或 admin，返回 `{deleted:n}`）；清理后写回 last 字段并清 `commonCache`。

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
4. 如果字段参与导出，同步 `SchemaHelper.parseColumns` / `AnswerExporter#export`。

### 改导出/回收站

1. 导出权限在 `AnswerApi#download`（`answer:export`）；数据范围分流：带 `classId` 走 `classService.assertVisible` + `downloadByClass`，不带 `classId` 走 `assertProjectExportAllowed`（等价原 `@EnableDataPerm`）。密码/token 在 `ExportGuardService`，班级导出用 `POST /api/answer/export/token`。
2. 回收站恢复/彻底删除分别在 `AnswerApi#restoreAnswer` / `batchDestroyAnswer`；`batchDestroy` 是物理 DELETE，改动前确认审计与备份要求。
3. 删除/恢复整批答卷时，`assertAnswersAccess` 会按答卷所属项目逐个校验，不能只校验第一个 id。

## 权限与数据范围

| 动作 | 权限 | 数据范围 |
|---|---|---|
| 匿名提交公开问卷 | 无（`/api/public/**` permitAll） | 未登录 + 项目 `loginRequired!=true`；写 `sk-anon` 主体与 `is_anonymous=1`，不写 `create_by` |
| 匿名找回 | 无（公开） | 只按当前 `sk-anon` cookie 主体；返回 `PublicAttemptView`，不返回主体 id/token |
| 匿名 claim | 登录（无额外权限点） | 只认当前 cookie 主体；重算 `class_id`/`attempt_no`，不合并其他主体 |
| 匿名清理设置/立即清理 | `system:setting:update` 或 admin | 开关/保留天数；`POST /api/system/anonymous/cleanup` 返回删除条数；只删匿名答卷 |
| 答卷列表/回收站 | `answer:list` + `@EnableDataPerm` | 管理员/项目 OWNER/COLLABORATOR（含组授权）看全部；其他登录用户只看 `create_by=自己`；默认 `is_anonymous=0` |
| 查看单份 | `answer:detail` | `assertAnswerAccess`：本人 / 项目管理者 / admin |
| 补录 | `answer:create` + `@EnableDataPerm` | 项目管理者 |
| 修改 | `answer:update` | 本人或项目管理者；后台编辑会强制沿用原 `projectId` |
| 删除 | `answer:delete` | 项目管理者；删除进回收站 |
| 恢复 | `answer:restore` 或 admin | 项目管理者 |
| 彻底删除 | `answer:delete` | 项目管理者；物理删除 |
| 通用导出（不带 `classId`） | `answer:export` + 导出密码/token | 项目管理者（`getProjectPerms()`，等价原 `@EnableDataPerm`） |
| 按班查看答卷 | `project:report` + `classService.assertVisible(deptId)` | 班级可见即可看本班全部，不要求项目协作者 |
| 按班导出答卷 | `answer:export` + `classService.assertVisible(deptId)` | 只导出该班 `class_id` 命中的**非匿名**答卷；只支持 `type=answer` |
| 导入数据 | `answer:upload` | 项目管理者 |
| 报表 | `project:report` + `@EnableDataPerm` | 项目管理者/admin；匿名答卷不计入 |

## 坑与已知限制

- **统计有两条路径，且会自动切换**：`t_answer_item` 覆盖了该场全部答卷时走 SQL 聚合（`AnswerItemMapper` + `ProjectStatHelper.statFromProjection`），否则回退到内存算法。判断条件是 `COUNT(DISTINCT answer_id) >= COUNT(*)`，所以「未回填 / 回填中 / 已回填」三个阶段统计数字都不会变少。回填是 `AnswerItemBackfill`，用 `surveyking.answer-items.backfill=true` 触发一次（幂等，可重跑）。覆盖判断看 `t_answer.items_synced`（每份处理过就置 1），不要改成「投影表行数」——没有选项答案的答卷展开后是 0 行。
- **投影表是派生数据**：`t_answer.answer` 才是真源，`t_answer_item` 丢了可以随时重建。交卷与回填都走 `AnswerItemProjector.rebuild`，保证两条路径产出一致；投影写入失败只 warn，不让交卷失败。
- **统计接口的权限注解必须写在 Controller**：统计接口的 URL 前缀是 public（实际路径 `/api/report/statistics`），但统计暴露答卷分布。`@PreAuthorize` 写在 `SurveyServiceImpl` 上不生效（JDK 动态代理只看接口注解），已改到 `SurveyApi.statProject`。
- **导出并发受限、统计不读整卷快照**：导出走 `EXPORT_POOL`（2 并发 + 队列 4，队满返回中文错误而不是把 JVM 拖死）；统计走 `listAnswerForStat`，只 SELECT `answer` 等必要列，不再把每份答卷的整卷 `survey` 读进堆（该列有值时是整卷 JSON，100 题约 30~80KB；当前线上多数行是 NULL，写入路径见 `SurveyServiceImpl` 的随机卷快照）。给 `listAnswer` 加字段时注意：不要把 `survey` 加回统计路径，否则单场 500 份的统计会重新变成几百 MB 的临时对象。
- **报表可能把随机卷快照算进总数**：`ReportServiceImpl.getData` 按 `project_id` 取全部 `t_answer`，不过滤 `answer IS NULL`。`RandomSurveyProcessor` 创建随机卷快照时会先写一条没有 `answer` 的答卷（`saveAnswer` 会把 `tempSave` 默认成 1），因此报表总数和逐题统计可能包含这些空记录；`parseAnswer` 对 null `answer` 也没有防御，极端情况下会 500。项目列表的 `total` 也按 `temp_save=1` 计数，同样会把快照算进去。
- **数据页全量进内存**：`Data.tsx` 固定 `pageSize=-1`，筛选/排序/分页都在前端。答卷上万条后首屏会明显变慢，需要改成服务端分页 + 服务端排序。
- **彻底删除不清理附件**：`batchDestroyAnswer` 只执行 `DELETE FROM t_answer`，没有看到删除 `t_file` 或物理附件的代码；回收站提示"附件也会一起清掉"与当前实现不完全一致，需另行确认/补清理任务。
- **导出 token 在内存里**：`ExportGuardService` 的 token 存在 `ConcurrentHashMap`，60 秒过期、用一次即失效、绑定用户；后端重启或多实例部署会失效/互不认。不要把它当持久下载链接。
- **旧的 `exportPassword` 参数仍兼容**：`AnswerApi#download` 同时接受 `exportToken` 和 `exportPassword`，优先 token。密码出现在 URL 会进访问日志，前端应继续走"先换 token"。
- **匿名答卷默认不可见**：`listAnswer` / `listAnswerByClass` / `listAnswersForStat` / `downloadSurvey` / `downloadAttachment` / 班级资源统计都带 `is_anonymous=0`；只有管理员/项目管理者在 `AnswerQuery.includeAnonymous=true` 时 `listAnswer` 才放开。数据页、通用导出、按班导出、项目报表、班级报表都不会出现匿名答卷。
- **匿名身份只靠 cookie + localStorage**：`sk-anon` 只存在当前浏览器；换设备/清 cookie/隐私模式/历史匿名数据都找不回。`claim` 只处理当前 cookie 主体，不自动合并多个匿名主体；`purgeExpired()` 仍负责 cookie 主体过期清理，但未接调度；按保留天数的清理由 P7 的 `purgeOlderThan`/`AnonymousCleanupService` 负责。
- **匿名清理只做逻辑删**：`purgeOlderThan` 与 `purgeExpired` 都走 `@TableLogic`，给 `t_answer.is_deleted=1`，不物理清 `t_answer`，也不清 `t_answer_item` 投影/附件；需要释放空间要另做物理清理。
- **保留期清理的配置默认/边界**：`anonymousCleanupEnabled` 默认开启（缺省/空也视为开），`anonymousRetentionDays` 默认 90、夹到 1~3650；`anonymousLastCleanupAt/Count` 只由任务写，`mergeSysInfo` 不接收客户端值。
- **清理任务没有分批/索引保障**：`purgeOlderThan` 一次查 id/subject + 一次按 `is_anonymous/create_at` 删，量大时可能长事务/锁表；要按 id 分批或补 `(is_anonymous, create_at)` 索引。
- **定时任务是容器时区**：cron `0 30 3 * * ?` 按 JVM/容器时区，不是用户本地时区；跨时区部署要设 `TZ` 或改 cron。`runNow` 读整行再写回 last 字段，极低概率覆盖并发保存的设置。
- **`class_id` 与匿名互斥**：匿名答卷 `class_id` 为 NULL，按班报表/资源面板/班级答卷抽屉都不会包含；claim 时才按当前班级资源重算。
- **公开匿名接口没有权限注解**：`/api/public/anonymous/*` 依赖 `/api/public/**` permitAll；只校验 cookie/登录态，不要把它们当管理接口，也不要在返回体里暴露 token_hash/subject 内部字段。
- **新增 `t_answer` 统计 SQL 必须带匿名过滤**：默认 `is_anonymous=0`；答题限次/幂等统计用 `AnswerQuery.excludeAnonymous` 按需关闭，不能把默认过滤直接塞进通用 `count`。
- **按班查看/导出绕过项目协作者过滤**：`/api/teaching/classes/answers` 与 `/api/answer/download?classId=` 只要求 `project:report`/`answer:export` + 班级可见（`classService.assertVisible`），不要求项目所有者/协作者；任何能看这个班的老师都能看/导出该项目的本班答卷。
- **按班列表只认精确 `class_id`**：历史答卷 `class_id` 为空时不会出现在按班列表/导出；学情概览可能按 `COALESCE(class_id,dept_id,'')` 回退主组显示，出现「概览有数、抽屉为空」是正常现象。
- **按班导出只支持答卷**：`downloadByClass` 对 `type != answer` 报「按班级导出暂只支持答卷」；附件按班导出未实现。且它走真源 JSON，不做 `t_answer_item` 投影优化。
- **班级答卷抽屉没有导出密码输入**：`downloadClassAnswers` 调 `/api/answer/export/token` 时传空 body；系统配置导出密码后会失败，需补密码输入或改走无密码场景。
- **通用导出仍走旧 token 端点**：数据页 `Data.tsx` 仍调 `/api/repo/export/token`，班级抽屉才用新 `/api/answer/export/token`；两者共用 `ExportGuardService`，行为一致但调用路径尚未统一。
- **`AnswerQuery.classId` ≠ 按班报表**：普通 `GET /api/answer/list?classId=` 仍在原项目数据范围内过滤；只有 `listAnswerByClass` 才按班级放开到「本班全部」。
- **`tempSave=0` 的草稿不在列表里**：`listAnswer` 有 `isNotNull(Answer::getAnswer)`，未提交/仅暂存的记录不会出现在数据页；不要用答卷列表判断"有没有人打开过"。
- **`answer:attach` 没有接到接口**：答题页附件走公开 `POST /api/public/upload`，管理侧导入走 `answer:upload`；权限目录里的 `answer:attach` 目前只是注释约定，改附件权限时要一起确认。
- **成绩单逐题对错是前端预览**：`ExamResult.tsx` 用 `utils/scoring.ts` 自行比对，最终分数以服务端 `exam_score` 为准；`manual` 模式会标"待人工评分"，不会假装判过。
- **公开查询与普通答卷共用 `t_answer`**：`PublicQuery` 的修改走 `validateAndMergeAnswer`，字段权限由 `ProjectSetting.PublicQuery.fieldPermission` 控制；改答卷结构时要同时看 `PublicQueryService#getQueryResult` / `filterAnswerByFieldPermission`。
- **导出读投影（S2-4）**：`downloadSurvey` 先判断 `t_answer_item` 是否覆盖全部答卷（按 `items_synced`），覆盖时只查瘦列并用 `AnswerItemAnswerRebuilder` 重建 `answer`，未覆盖自动回退 `t_answer.answer` JSON。新增答案字段时 `AnswerItemProjector` 要同步写 `value_json`，否则导出会缺值。
- **交卷幂等靠数据库唯一键（S1-3）**：`(project_id, create_by, attempt_no)` 唯一，`AnswerAttemptAllocator` 分配序号，`DuplicateKeyException` 时回读赢家；`create_by` 为 NULL 的纯匿名提交不受约束（仍靠设备限频）。
- **`class_id` 只在新答卷写入**：更新答卷不重算；匿名/教职工/练习伪项目为 NULL。用 `class_id` 做统计时只能覆盖新数据，历史数据要回填或明确排除。
- **学情改成 class_id 优先、老数据回退主组且只认真实班级**：`TeachingMapper#listClasses` 用 `COALESCE(a.class_id, u.dept_id)` 做 JOIN 条件，但 SELECT 只取 `COALESCE(d.id,'')`；`d.dept_type='class' AND d.is_deleted=0` 不满足时归「未分组」。新答卷换班后仍算原班，老数据算到当前主组（若主组是 org 或已删，归未分组）。
- **班级资源面板答卷数 ≠ 班级全部答卷数**：只算 `temp_save=1` 且 `class_id` 命中的新答卷；与学情页按 `class_id` 聚合的数字对新数据基本一致，但老数据回退主组、历史 `class_id` 为空时仍可能对不上。
- **公开链接上的 projectId 不可信**：`PublicQueryService#loadQuery` / `getQueryResult` 与 `PublicSurveyExtrasService#loadExamResult` 拿到不存在的项目时，2026-11-09 之前会直接解引用 `project` 抛 NPE、被全局兜底成 500；现在统一回 7000（查询链接失效）与 4004（项目不存在）。新增公开端点时第一件事也是判 `project == null`。

## 验证

```bash
cd server && ./gradlew :shared:test   # 9 个单元测试：统计两路径一致、权限目录、扁平化
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
6. 学生 A 在班级 X 交一份新答卷后查库：`SELECT id, project_id, class_id, temp_save FROM t_answer WHERE id='<answerId>';` 的 `class_id` 应等于 X；把 A 换到班级 Y 后再更新同一份答卷，`class_id` 仍应是 X。
7. 学情接口按答题时班级分组：新答卷跟随 `class_id`，`class_id` 为空的老答卷回退答题人当前主组；只有真实 `dept_type='class'` 节点才显示为班级，org 组/已删/找不到的归「未分组」。同一场考试有老数据时，班级分布可能同时出现「原班」与「当前主班」两行。
8. 学情 Tab 的班级资源行点「查看答卷」：`GET /api/teaching/classes/answers` 返回该班 `class_id` 精确命中的答卷，学员姓名通过 `createByName` 回填；历史 `class_id` 为空的记录不出现。
9. 资源行点「导出」：无导出密码时应下载 xlsx；配置导出密码时当前抽屉会报错（没有密码输入）。只支持 `type=answer`，附件导出会提示不支持。
10. 不带 `classId` 的 `/api/answer/download` 仍按项目协作者范围校验；用非协作者账号导出应 403，带 `classId` 且班级可见的账号可以导出本班答卷。
11. 未登录打开一个 `loginRequired=false` 的问卷并交卷：响应应写 `sk-anon` cookie；刷新后 `GET /api/public/anonymous/answers?projectId=` 能看到这次答卷（`answerId/examScore/createAt`），`/api/public/attempts` 同样能看到。清 cookie 或换浏览器后列表为空。
12. 同一浏览器登录后点「绑定到我的账号」：`POST /api/public/anonymous/claim` 返回认领条数；随后 `/api/public/anonymous/answers` 按 `create_by` 返回，数据页/报表仍默认看不到匿名（claim 后 `is_anonymous=0` 才可见）。
13. 匿名答卷不进入班级报表：学情资源面板的交卷/平均分、班级答卷抽屉、项目列表/回收站 total、`/api/report/{shortId}` 都不应包含它；管理员显式 `includeAnonymous=true` 时 `/answer/list` 才可看到。
14. 构造过期 `t_anonymous_subject` 后调用 `purgeExpired()`：主体和其匿名答卷应被清理（答卷逻辑删）；`purgeExpired` 当前没有调度，需手工触发。
15. 系统设置「匿名答卷」Tab：改开关/保留天数后保存；点「立即清理」应调用 `POST /api/system/anonymous/cleanup` 并提示删除条数；`GET /api/system` 的 `anonymousLastCleanupAt/Count` 应更新（只读字段客户端改不动）。
16. 把保留天数设为 1，构造一条 2 天前的 `is_anonymous=1` 答卷和一条登录用户答卷：手动/定时清理只删匿名那条（`is_deleted=1`），登录答卷不受影响；主体下无剩余匿名答卷时应被物理删除。

## 相关文档

- [考试与问卷（项目）](./project.md)
- [考试编辑器与题型](./survey.md)
- [任务中心、练习与错题本](./exercise.md)
- [登录与会话](../flows/login-auth.md)
- [数据模型](../architecture/data-model.md)
