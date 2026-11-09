---
id: module-exercise
title: 任务中心、练习与错题本
status: current
keywords:
  - 我的任务
  - 练习记录
  - 题库练习
  - 错题本
  - 学习进度
  - 我的成绩
  - t_user_book
  - examExerciseType
source_globs:
  - client/src/pages/exercise/**
  - client/src/pages/tasks/**
  - client/src/pages/repo/Book.tsx
  - client/src/pages/repo/BookPractice.tsx
  - server/api/src/main/java/cn/surveyking/server/api/ExerciseApi.java
  - server/api/src/main/java/cn/surveyking/server/api/MyReportApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ExerciseAnswerService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserBookServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/MyReportService.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ExerciseView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/HistoryExerciseQuery.java
entrypoints:
  - client/src/pages/tasks/TaskCenter.tsx
  - client/src/pages/tasks/MyReport.tsx
  - client/src/pages/exercise/List.tsx
  - client/src/pages/exercise/Practice.tsx
  - client/src/pages/repo/Book.tsx
  - client/src/pages/repo/BookPractice.tsx
  - server/api/src/main/java/cn/surveyking/server/api/ExerciseApi.java
  - server/api/src/main/java/cn/surveyking/server/api/MyReportApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserBookServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/MyReportService.java
apis:
  - GET /api/exercise/list
  - POST /api/exercise/delete
  - GET /api/my-report/list
  - GET /api/template/list
  - POST /api/repo/pick
  - POST /api/public/saveAnswer
  - GET /api/repo/book/list
  - GET /api/repo/book/question
  - POST /api/repo/book/update
  - POST /api/repo/book/delete
tables:
  - t_answer
  - t_user_book
  - t_repo
  - t_template
tests:
  - client:npm run check
  - docs:npm run docs:check
  - nas:python scripts/nas/smoke-test.py
last_verified: 2026-11-09
verified_against: 6c14ecfdf35a6c2610f436152c616e25e525c5b6
---

# 任务中心、练习与错题本

## 30 秒摘要

学员侧的"我的任务"把三件事收进一个页面：考试安排（复用项目列表）、练习记录（`t_answer` 里 `exam_exercise_type` 非空的记录）、我的成绩（按考试聚合）。练习本身从题库发起，题目按 `/api/template/list` 分页加载，随机练习走 `/api/repo/pick`，进度只存在浏览器 `localStorage`；错题本落在 `t_user_book`，由考试交卷时异步收集。后端入口是 `ExerciseApi`、`MyReportApi` 和 `UserBookServiceImpl`。

## 什么时候看这篇

- 学员说"练习记录里没有我刚才做的练习"。
- 要改"我的任务"的页签、练习进度、错题本筛选/标记。
- 要确认"我的成绩"为什么没有某场考试，或分数/次数不对。
- 要让错题本按考试拆分、按错误次数筛选，或改"已掌握/重点"状态。
- 要改练习页的加载方式（分页/随机/继续上次）。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 我的任务 | `client/src/pages/tasks/TaskCenter.tsx` | 三个 Tab：考试安排 / 练习记录 / 我的成绩，按权限动态出现 |
| 我的成绩 | `client/src/pages/tasks/MyReport.tsx` | `GET /api/my-report/list`，表格展示次数/最高分/最近交卷 |
| 练习记录 | `client/src/pages/exercise/List.tsx` | `GET /api/exercise/list`，状态筛选、进入练习、删除记录 |
| 练习作答 | `client/src/pages/exercise/Practice.tsx` | 顺序/随机/继续上次；分页加载、瀑布流、本地进度、提交 |
| 错题本列表 | `client/src/pages/repo/Book.tsx` | `/api/repo/book/list`，筛选、笔记、重点/已掌握、批量删除、开始练习 |
| 错题本练习 | `client/src/pages/repo/BookPractice.tsx` | 逐题取完整 schema、前端判分、本地进度、标记已掌握 |
| 练习接口 | `server/api/src/main/java/cn/surveyking/server/api/ExerciseApi.java` | `exercise:list`；删除只允许本人记录 |
| 成绩接口 | `server/api/src/main/java/cn/surveyking/server/api/MyReportApi.java` | `project:report` 或 admin；只查当前用户 |
| 成绩实现 | `server/rdbms/src/main/java/cn/surveyking/server/service/MyReportService.java` | 按 `projectId` 聚合 `temp_save=1` 的答卷 |
| 错题实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/UserBookServiceImpl.java` | `saveWrongQuestion`：收题、去重、累加错误次数 |
| 练习记录实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ExerciseAnswerService.java` | `historyExercise` / `deleteExercise` |
| 题库练习建卷 | `server/rdbms/src/main/java/cn/surveyking/server/impl/PublicProjectLoader.java` | `loadProject` 的 `repoId` 分支：O/R/W 三种练习 |
| 数据表 | `t_answer`、`t_user_book`、`t_repo`、`t_template` | 练习记录、错题/收藏、题库、题目 |

## 关键流程

1. **进入任务中心**：路由 `/tasks` 的前端守卫是 `project:answer`。`TaskCenter` 先拉 `loadAuthorities()`：如果账号同时有 `portal:teacher` + `project:report`（教学视角）或 `portal:admin`，直接重定向到 `/project` 或 `/teaching`，不显示学员页签。页签按 `project:list` / `exercise:list` / `project:report` 分别出现，URL 用 `?tab=practice` 记忆。
2. **练习记录**：`ExerciseList` 调 `GET /api/exercise/list?current=&pageSize=&tempSave=`。后端 `AnswerServiceImpl.historyExercise` 只查 `createBy=当前用户`、`examExerciseType IS NOT NULL`，并且满足"已交卷 `temp_save=1` 或暂存答案非空"——点一下"开始练习"就建的空记录会被过滤掉。进度百分比 = 已答题数 / 快照里的题目数。
3. **开始练习**：题库列表/错题本把用户带到 `/exercise/practice/:repoId?mode=full|random|resume`。`Practice` 的逻辑：
   - `full`：`GET /api/template/list?repoId=&current=1&pageSize=10` 先取一页，滚到底/点"加载更多"再追加；提交前把剩余页补齐，保证快照是整份题库。
   - `random`：把 `counts`（题型:数量）转成 `ProjectSetting.RandomSurveyCondition`，调 `POST /api/repo/pick`，一次拿全，不再分页。
   - `resume`：从 `localStorage` 的 `practice:<repoId>` 恢复 `root/values/index/layout/total/paged`；旧进度没有 `total/paged` 时按"已全部加载"处理。
4. **本地进度**：每次答题/切题/追加题目都写回 `practice:<repoId>`；提交成功删除。进度只在本机，换设备/清缓存就没了。提交走 `POST /api/public/saveAnswer`，`projectId='exercise'`，`survey` 是整份题卷，`answer` 是答案，`tempSave=1`。
5. **后端练习建卷（另一条路径）**：`SurveyServiceImpl.loadProject` 在请求带 `repoId` 时走练习分支：校验题库可见且 `isPractice=true`，按 `examExerciseType` 取题——`O` 顺序（按模板 id 顺序）、`R` 随机（`Collections.shuffle`）、`W` 错题（`t_user_book.wrong_times>0`）；创建一条 `project_id='exercise'`、带 `examExerciseType` 的 `t_answer`。当前 `Practice.tsx` 没有走这条路径（它直接读模板/抽题），所以这条路径主要供旧客户端或接口调用。
6. **错题收集**：考试交卷时 `SurveyServiceImpl.saveAnswer` 调 `UserBookServiceImpl.saveWrongQuestion(questionScore, answer, survey, projectId, null)`。只收"本题得分 0 且确实作答"的题；未作答也 0 分但不收。去重键是 `(create_by, type=1, project_id, template_id)`：同一场考试再次错同题累加 `wrong_times`，不同考试各留一条；题库练习/历史数据 `project_id` 为空。题干兜底顺序：模板名 → schema 题干（截断 200 字）→ "题目 <id 前 8 位>"。
7. **错题本**：`Book.tsx` 调 `GET /api/repo/book/list`，支持 `type`（1 错题/2 收藏）、日期、`wrongTimesMin`、`status`（2 重点）、`projectId`；`note` 后端 DTO 没有，前端拉全量后自己过滤。行内操作：改笔记 `/api/repo/book/update`、切换重点（status 2/0）、标记已掌握（status 1）、删除 `/api/repo/book/delete`。
8. **错题练习**：`BookPractice.tsx` 按列表筛选条件逐题 `GET /api/repo/book/question?id=` 取完整 schema，前端 `gradeAnswer` 判对错。题库题的标准答案常记在选项子节点 `attribute.examCorrectAnswer`；如果接口把答案过滤掉，`gradeAnswer` 返回 `unknown`，结果页提示"自评"，不臆造对错。进度存在 `book-practice:<key>`，不写后端练习记录。
9. **我的成绩**：`GET /api/my-report/list`（`project:report` 或 admin）→ `MyReportService.listMine`：查当前用户 `temp_save=1` 的答卷，按 `projectId` 分组，返回考试名、状态、交卷次数、最高分、最近交卷时间。`projectId='exercise'` 的练习答卷在 `t_project` 里找不到项目，会被跳过。

## 修改指南

### 让练习记录真正出现在"练习记录"

1. `Practice.tsx` 提交 `/api/public/saveAnswer` 时补 `examExerciseType`（`O`/`R`/`W`）并确保后端保存到 `t_answer.exam_exercise_type`。当前 `AnswerRequest` 已有该字段，主要是前端没传。
2. 如果希望"开始练习"就出现进行中记录，需要后端在创建记录时就写 `exam_exercise_type`，并决定是否放宽 `historyExercise` 里"暂存答案非空"的过滤。
3. 改完后验证：顺序练习提交 → `/api/exercise/list` 出现一条 `tempSave=1` 的记录；删除后列表消失。

### 改错题收集口径

1. `UserBookServiceImpl.saveWrongQuestion` 决定"收哪些题、怎么去重、题干怎么取"；改 0 分判定/是否排除未作答时只改这里。
2. 如果要收"部分得分"的题，需要先把 `questionScore` 的语义从"本题得分"改成"本题失分比例"或传原始 `AnswerScoreEvaluator` 结果，否则会把半对题误收。
3. 去重键包含 `project_id`；如果希望"同一道题跨考试只一条"，要同时改查询条件与数据库唯一性/迁移，否则历史数据会分裂。

### 改练习页加载方式

1. `Practice.tsx` 的 `PAGE_SIZE`、`fetchPage`、`loadMore`、`ensureLoaded` 是一组；改分页大小要确认"跳题补加载"和"提交前补齐"仍然成立。
2. 随机练习的 `counts` 来自题库列表页的 URL；改参数名要同步 `repo/List.tsx`。
3. 进度结构变了要兼容旧 `localStorage`（当前代码对旧进度做了 `total/paged` 缺省处理）。

## 权限与数据范围

| 动作 | 权限 | 数据范围 |
|---|---|---|
| 我的任务页 | `project:answer`（路由守卫） | 学员；教师/管理员被重定向 |
| 考试安排 Tab | `project:list` | 复用项目列表的授权口径（OWNER/COLLABORATOR/RESPONDENT + 组链） |
| 练习记录 Tab/进入练习 | `exercise:list` | 只查/只删 `create_by=当前用户` |
| 我的成绩 Tab | `project:report` 或 admin | 只查当前用户的答卷 |
| 顺序/随机题目 | `template:list` 或 `repo:detail` 或 `repo:questions:read`；抽题要 `repo:detail`/`repo:book`/admin | 题库必须可读 |
| 错题本列表/练习 | `repo:book` | 只查当前用户的 `t_user_book` |
| 错题标记/删除 | `repo:book` | 本人记录（后端 `create_by` 限制） |

## 坑与已知限制

- **练习记录缺口**：`Practice.tsx` 提交时没有传 `examExerciseType`，而 `historyExercise` 以该字段非空为前提，所以"练习记录"里看不到从当前练习页提交的记录。`Practice.tsx` 里的注释说"AnswerRequest 没有 examExerciseType 字段"已经过期——DTO 现在有该字段，是前端漏传。
- **两条练习建卷路径并存**：`SurveyServiceImpl.loadProject(repoId)` 会创建带 `examExerciseType` 的答卷；`Practice.tsx` 走模板/抽题 + 公开交卷。排障时先确认用户走的是哪条，不要只盯一个入口。
- **练习进度只在 localStorage**：换设备、清缓存、换浏览器都会丢；"继续上次练习"不是服务端能力。
- **错题本只收 0 分**：部分得分（例如多选选对一半但 `selectCorrect` 给了部分分）不会进错题本；未作答也不收。要改口径先改 `saveWrongQuestion`。
- **错题按考试拆条**：同一道题在两场考试各错一次会有两条 `t_user_book` 记录；这是为了"只练本场错题"不串场，不是重复 bug。
- **`note` 只能前端过滤**：`UserBookQuery` 没有 `note` 字段，`Book.tsx` 用到笔记筛选时会拉全量再过滤；错题很多时性能会下降。
- **错题练习不写练习记录**：`BookPractice` 是纯前端自测，不调 `/api/exercise/*`，也不会更新 `wrong_times`/`correct_times`；"标记已掌握"只改 `status`，不删记录。
- **`MyReportService` 不含练习**：`projectId='exercise'` 在 `t_project` 里查不到，练习答卷不会出现在"我的成绩"；练习成绩看练习记录页。
- **练习记录删除是物理删除**：`deleteExercise` 用 `remove`（不是逻辑删除），删完不可恢复；前端提示"删除后不可恢复"与实现一致。

## 验证

```bash
cd client && npm run check
python scripts/nas/smoke-test.py
npm run docs:check
```

手工回归：

1. 学员从题库开始顺序练习，答几题后刷新页面，点"继续练习"能回到原题号与答案。
2. 随机练习按题型配数量，抽到的题数与配置一致；提交后提示"练习已完成"。
3. 考试交卷时故意做错一道已作答题，错题本出现该题、`wrong_times=1`；再做错一次变 2。
4. 错题本按"错过 2 次以上"筛选、按"来源考试"筛选，结果与列表一致。
5. 我的成绩里能看到刚交卷的考试，次数 +1，最高分取历次最大值。

## 相关文档

- [答卷、判分与报表](./answer.md)
- [题库与题目](./repo.md)
- [考试与问卷（项目）](./project.md)
- [权限、角色与用户组](./permissions.md)
- [功能范围](../architecture/scope.md)
