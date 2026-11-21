---
id: module-dashboard
title: 首页与统计
status: current
keywords:
  - 首页
  - 仪表盘
  - 统计
  - 视角
  - 教学页
  - 入口跳转
  - dashboard
  - 我的成绩
source_globs:
  - client/src/pages/Home.tsx
  - client/src/pages/home/**
  - client/src/components/charts/**
  - client/src/api/dashboard.ts
  - client/src/layout/BasicLayout.tsx
  - client/src/router.tsx
  - server/api/src/main/java/cn/surveyking/server/api/DashboardApi.java
  - server/api/src/main/java/cn/surveyking/server/api/MyReportApi.java
  - server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/DashboardServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/DashboardStatsServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/service/DashboardStatsService.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/MyReportService.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/TeachingMapper.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/Dashboard.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/DashboardQuery.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/DashboardView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/DashboardSetting.java
  - server/rdbms/src/main/resources/scripts/init-mysql.sql
entrypoints:
  - client/src/pages/Home.tsx
  - client/src/pages/home/Dashboards.tsx
  - client/src/components/charts/index.ts
  - server/rdbms/src/main/java/cn/surveyking/server/impl/DashboardStatsServiceImpl.java
  - server/api/src/main/java/cn/surveyking/server/api/DashboardApi.java
  - server/api/src/main/java/cn/surveyking/server/api/MyReportApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/TeachingMapper.java
apis:
  - GET /api/my-report/list
  - GET /api/teaching/projects
  - GET /api/dashboard/list
  - GET /api/dashboard/overview
  - GET /api/dashboard/trend
  - GET /api/dashboard/teacher
  - GET /api/dashboard/teacher/trend
  - GET /api/dashboard/student
  - GET /api/project/list
  - GET /api/repo/list
  - GET /api/system/user/list
tables:
  - t_dashboard
  - t_answer
  - t_project
tests:
  - client:npm run check
  - docs:npm run docs:check
last_verified: 2026-11-17
verified_against: fb6206b64d7bc1e157df14c943c985a562477a81
---

# 首页与统计

## 30 秒摘要

登录后的 `/home` 按**视角权限**渲染三种首页：`portal:admin` → 系统概览，`portal:teacher` + `project:report` → 我的教学，其余 → 我的学习。

2026-11 起首页不再用「列表接口 total 相加」凑数字，改由专门的统计接口供数（同一个 `/api/dashboard` 前缀，都是 GET，权限 `project:detail or admin`）：

| 接口 | 用途 | 主要口径 |
|---|---|---|
| `GET /api/dashboard/overview?days=14` | 管理员总览 | 用户三类互斥（管理员先从 staff 里扣除）；答卷排除练习伪项目；分数只算 `temp_save=1` 且有分；`graded` = 有分数且不在 `pending`（覆盖 `none`/空/`graded` 三种历史值），否则批改进度会恒为 0% |
| `GET /api/dashboard/trend?days=14` | 近 N 天趋势 | 自然日补空：缺日 0，`avgScores` 无样本给 null（折线断开，不画成 0 分） |
| `GET /api/dashboard/teacher` | 老师视角 | 班级走可见性（accessible），项目=自建 ∪ 协作者 ∪ 可见班级上分配过的资源 |
| `GET /api/dashboard/teacher/trend?days=14` | 老师视角趋势 | 结构与 `/trend` 相同，但**只统计上面那批可见项目**：老师首页画的是自己的数据，不是全站 |
| `GET /api/dashboard/student` | 学员视角 | 答卷/均分排除练习；`todoExams`=班级资源已发布且在窗口内、本人未交 |

页面侧全部用手写 SVG 图表（`client/src/components/charts/`：StatTile / Donut / BarSeries / AreaTrend / ProgressRing），**没有引入图表库**；颜色只取 `--bp-*` CSS 变量（写在 style 里，SVG 呈现属性不解析 var）。每个请求独立降级：某块失败只让那块显示「—」+ 原因，整页不白屏。
`AreaTrend` 的 y 轴下界在数据非负时贴 0（分数不会是负的，`-50` 这种刻度既把曲线压扁又误导），负值数据才按区间留白。

`/api/dashboard/list` 与 `t_dashboard` 是上游遗留的「可配置仪表盘」组件，当前前端**完全没有调用**。首页不替代报表页：全站指标用绝对 60 分算及格率，逐卷的及格率仍走报表。

## 什么时候看这篇

- 首页空白、卡片全是 0，或某个角色进来看到不该看的视角。
- 要加一张首页卡片、改统计口径、加第四种视角。
- 想让首页数字和「报表 / 教学管理」页对齐。
- 要启用（或删除）`t_dashboard` 那套组件化仪表盘。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 路由 | `client/src/router.tsx` | `/home` 无守卫（登录即可进）；`/tasks` 要 `project:answer` |
| 页面外壳 | `client/src/pages/Home.tsx` | 从 `BasicLayout` 的 `outlet context` 取 `user.authorityList`，交给 `Dashboards` |
| 三种视角 | `client/src/pages/home/Dashboards.tsx` | `StudentHome` / `TeacherHome` / `AdminHome` + 默认导出的分发函数 `Dashboard` |
| 统计接口 | `server/rdbms/.../impl/DashboardStatsServiceImpl.java` | `/api/dashboard/{overview,trend,teacher,teacher/trend,student}` 的口径；每块单独 catch，某块算不出来退化成 0 / null 并记 warn，不让首页 500 |
| 前端图表 | `client/src/components/charts/**` | 手写 SVG：`StatTile` / `Donut` / `BarSeries` / `AreaTrend` / `ProgressRing`，**没有引入图表库** |
| 前端请求 | `client/src/api/dashboard.ts` | 五个统计接口的类型与 fetch；页面里不再直接拼 URL |
| 菜单 | `client/src/layout/BasicLayout.tsx` | 「教学」`/teaching` 一个入口（`project:list` 或 `class:list`），页面内分「考试/问卷」「班级」两个 Tab；原来的独立「班级管理」菜单已并入 |
| 我的成绩接口 | `server/api/src/main/java/cn/surveyking/server/api/MyReportApi.java` | `GET /api/my-report/list`，`project:report or admin` |
| 我的成绩实现 | `server/rdbms/src/main/java/cn/surveyking/server/service/MyReportService.java` | 只查 `create_by = 当前用户` 且 `temp_save=1` 的答卷，按项目聚合成 `MyReportView` |
| 教学接口 | `server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java` | `GET /api/teaching/projects`、`/teaching/classes`，都要 `project:report` |
| 教学统计 SQL | `server/rdbms/src/main/java/cn/surveyking/server/mapper/TeachingMapper.java` | `listMyProjects`（我创建或协作者）、`listClasses`（按组聚合） |
| 列表接口 | `client/src/api/index.ts`（`listProjects`）、`server/api/.../ProjectApi.java` | `/api/project/list`，`project:list or exercise:list` |
| 遗留仪表盘接口 | `server/api/src/main/java/cn/surveyking/server/api/DashboardApi.java` | `GET /api/dashboard/list`，`project:detail` |
| 遗留实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/DashboardServiceImpl.java` | 按 `type`（+ `projectId`）查 `t_dashboard`；`saveDashboard` 是空实现 |
| 遗留模型 | `server/rdbms/.../domain/model/Dashboard.java`、`dto/DashboardQuery.java`、`DashboardView.java`、`DashboardSetting.java` | `key` 是 MySQL 保留字、要反引号转义，`type` 列曾被错映射成 `category`；`setting` 是 Jackson JSON |
| 数据表 | `t_dashboard`、`t_answer`、`t_project` | `t_dashboard` 无种子数据；`t_answer.temp_save=1` 表示已交卷 |

## 关键流程

### 1. 视角分发

`Dashboard` 的判定顺序（`client/src/pages/home/Dashboards.tsx`）：

1. `has('portal:admin')`（`authorities` 里有该串或 `ROLE_admin`）→ `AdminHome`。
2. `can(authorities, 'portal:teacher') && can(authorities, 'project:report')` → `TeacherHome`。
3. 其余一律 `StudentHome`（**不需要** `portal:student`，首页永远有内容）。

第 2 步必须两个权限一起判：`portal:teacher` 是门户身份，`project:report` 是「能看别人答卷」的能力；
学员预设也带 `project:report`，只看它会把学员误判成老师。
`TeacherHome` 现在请求的是 `/api/dashboard/teacher`（注解 `project:detail or admin`），与这里的判定已不完全对应——
缺 `project:detail` 的账号四张卡会降级成「—」+ 原因（分块降级），但视角仍按这两个权限分。

### 2. 学员首页数据

1. `GET /api/dashboard/student`（`DashboardStatsServiceImpl#student`）一次返回：`answers`（正式答卷数，排除练习伪项目）、
   `avgScore` / `bestScore`、`practiceCount` / `practiceQuestions`、`classes`（所在班级数）、`todoExams`、
   `recent`（最近 **20** 次正式答卷与分数；首页只画趋势，再多就该去「我的任务 / 我的成绩」翻了）。
2. 四张卡：待考/进行中 = `todoExams`（班级资源已发布 + 窗口内 + 本人未交）；我已交卷 = `answers`；平均分 = `avgScore`；
   练习做题数 = `practiceQuestions`（去重题数，来自 `t_answer_item` 投影，历史练习没投影的会偏小）。
3. 「考试安排」表仍走 `listProjects({ current: 1, pageSize: 50, flat: true })`：班级分配的考试可能在文件夹里，
   必须拉全层级再过滤 `mode === 'folder'`；卡片上那句「已发布 N 场」就是这张表的 `status === 1` 条数（只覆盖前 50 条）。
4. 成绩走势取 `recent` 的分数（最多 20 次，`client/src/api/dashboard.ts` 的 `STUDENT_RECENT_LIMIT` 与后端条数对齐），
   没有分数的记录断开；超过 12 个点时 x 轴日期自动抽稀（`AreaTrend` 里 `labelStep` + 至少隔一个画一个，
   并从最后一个点往回数，保证「最新的一次」一定有日期）；「开始答题」链接仅在 `project:answer` 命中时渲染（学员专属，管理员不会命中）。

### 3. 教师首页数据

`GET /api/dashboard/teacher`（`DashboardStatsServiceImpl#teacher`）：

- **班级**：直接复用 `ClassService#listClassTree`，只数 `accessible=true` 的节点（自己创建/负责 + 被授权，管理员全量）；
  `students` 是这些班里的去重学员。与班级管理页看到的是同一套可见性，首页不再另写判定。
- **项目**：自己创建 ∪ 所有者/协作者（`t_project_partner`，含按用户组授权）∪ 可见班级上分配过的资源；
  文件夹不算项目，`projects` / `published` 都先排除 `mode=folder`。
- **答卷**：`answers` / `pendingGrading` / `avgScore` 只统计这些项目下的正式答卷（`temp_save=1`，排除练习）；
  `graded7d` 是**人工批改**口径（`grade_status='graded'` 且 `graded_at` 在近 7 天），机器判分不算。
- **页面**：四张卡「我的班级 / 在册学员（+平均分）/ 待批改（+累计答卷）/ 近 7 天批改」；
  下方趋势图走 `/api/dashboard/teacher/trend`（与 `/teacher` **同一批可见项目**，卡片副标题写「我的可见范围」）；
  最近考试表来自 `recent`（项目名/状态/答卷/平均分/待批改/最近交卷），点考试名去 `/survey/{id}`。

老师趋势（`DashboardStatsServiceImpl#teacherTrend`）与全站趋势共用同一段骨架（`buildTrend`：一条 SQL 出四个序列、日期轴逐日补齐），
差别只在统计范围：全站是 `formalAnswers()`，老师是 `formalAnswers().in(project_id, 可见项目)`。
可见项目与 `/teacher` 共用 `visibleProjectIds` + `visibleProjectRows`（文件夹不算项目），所以卡片上的项目数和趋势里的卷子永远是一批。
没有任何可见项目时**不查库**，直接返回「整段 0 值」的完整窗口——前端按等长数组画图，空数组会把日期轴也一起弄空。

### 4. 管理员首页数据

`GET /api/dashboard/overview?days=14` 一次返回七块，页面按块渲染（`fetchOverview`）：

| 块 | 卡片 / 图表 | 口径 |
|---|---|---|
| `users` | 学员 / 老师 / 管理员三张卡 + 用户构成环图 | **三类互斥**：管理员先从 staff 里扣除；另有 `total`、`active7d` |
| `classes` | 班级概览表 | 班级数、开班中（教学班 + 有在册学员 + 有已发布项目资源，三个条件缺一不算）、在册学员（按主班去重）、平均班额 |
| `projects` | 进行中考试卡 + 概览表 | 按 `exam/survey/folder` 拆；`published` = 已发布份数，`running` 按时间窗算（未设窗口按长期开放） |
| `answers` | 批改进度环图 + 概览表 | 累计/今日/近 7 天/近 30 天；`graded` = 有分数且 `grade_status <> pending`，`pending` = `grade_status = pending` |
| `questions` | 题库 / 题目 | `t_template` 走 `@TableLogic`；`t_repo` **没有软删列**（删除是物理删），必须直接 `selectCount(null)` |
| `scores` | 及格率环图 + 平均/最高/最低 | 只算 `exam_score` 非空的正式答卷；及格线是**绝对 60 分**，无样本时 null（显示「—」） |
| `ai` | 概览表最后两行 | 近 7 天调用次数与 token 合计 |

`days` 对 `overview` 没有实际作用（内部窗口固定为今天 / 7 天 / 30 天，只做 1~90 的夹取），
留着只为和 `trend` 用同一套调用签名。

`GET /api/dashboard/trend?days=14` 另给五个等长数组（`days` / `answers` / `graded` / `avgScores` / `activeUsers`），
按自然日分组、含今天；缺日补 0，`avgScores` 当天没有带分数的答卷为 null（折线断开，不画成 0 分）。
趋势的 `graded` 按**交卷日**归类（「这批卷子里已批完的数量」），不是按批改时间——与老师视角的 `graded7d` 口径不同，别对账。
`/teacher/trend` 返回同一套结构（五个等长数组），只是范围换成老师可见项目；两者的补空规则完全一致。

常用入口是纯前端跳转（权限配置、用户管理、用户组、系统设置、操作日志、教学管理），不额外校验权限，点进去由路由守卫兜底：

- 「进行中考试」统计卡 → `/teaching?tab=exam`
- 「教学管理」快捷入口 → `/teaching?tab=exam`

### 5. 与任务中心、报表页的边界

- 「我的任务」（`/tasks`，要 `project:answer`）是学员作答入口，首页只做汇总与跳转，不重复列表逻辑。
- 报表（`/survey/:id/report`，要 `project:report`）是单场考试的题目级统计；首页是跨场聚合（全站或按可见范围），
  及格率还用绝对 60 分而不是逐卷满分，两者口径不同，不应对账。
- 教学页的「班级」Tab（`/teaching?tab=classes`）按班级聚合，数据源是班级树与班级资源面板；`TeachingMapper#listClasses` 只剩旧接口在用（见 [teaching](./teaching.md)）。首页只给一个入口链接，不直接请求班级分布。

### 6. 遗留：`/api/dashboard/list`

`DashboardServiceImpl#listDashboard` 按 `DashboardQuery.type` + 可选 `projectId` 查 `t_dashboard`，返回 `{ id, setting }` 列表。`t_dashboard` 在 `init-mysql.sql` 里只有表结构、没有数据；`saveDashboard` 是空方法。前端没有任何调用方——如果要做「可配置首页」，这是半成品起点，不是现有能力。

## 修改指南

### 加一张卡片

1. 在对应视角组件里加 `Card`；首页已有四个聚合接口，新指标优先往对应 View 里加字段
   （`DashboardOverviewView` / `DashboardTrendView` / `TeacherDashboardView` / `StudentDashboardView`），
   不要再回到「拉列表接口的 total 相加」——那是 2026-11 之前的做法，跨项目/跨文件夹都会算错。
2. 新字段的算法要放在 `DashboardStatsServiceImpl` 里用 SQL 聚合（`selectCount` / `selectMaps`），不要把这批数据拉进内存循环；
   每块外面套 `safe(...)`，算不出来退回 0 / null 并打 warn。
3. 卡片上的数字必须给出「口径说明」：如「开班中」是近似口径、「及格率」是绝对 60 分；前端写进 `hint` 或「说明」列。
4. 需要新权限时按[权限变更流程](../flows/permission-change.md)加权限点，并同时改菜单与路由守卫。

### 加一种视角

1. 在 `PermissionEnum` 的 `Group.PORTAL` 下加 `portal:xxx`（非学员专属时管理员会自动注入）。
2. 在 `Dashboard` 的分发链里插到合适位置（越靠前优先级越高），并确认它依赖的接口权限也一起判。
3. 同步 `BasicLayout` 的菜单项与 `MobileTabBar`（移动端底栏单独判 `portal:teacher` / `portal:admin`）。
4. 补迁移脚本给老师/学员角色授权，别只改管理员。

### 改统计口径

改 `DashboardStatsServiceImpl` = 只影响首页（`TeachingMapper` 的 SQL 仍服务教学管理与旧接口，两套口径各自演进，不要指望改一处两边都对）。
改统计 SQL 时注意三条：只统计 `temp_save=1`（已交卷）且 `is_deleted=0`；练习记录（`project_id` = 练习伪项目）必须排除；
`t_repo` 没有软删列，别给它加 `is_deleted` 条件。

### 启用 `t_dashboard`

先解决三件事：建表脚本补 `is_deleted`（`scripts/dev/add-dashboard-is-deleted.sql`）、写种子数据、给前端加渲染组件。`key` 是 MySQL 8 保留字、`type` 曾被错映射成 `category`，动模型前先看 `Dashboard.java` 的注释。

## 权限与数据范围

| 视角 | 判定 | 数据来源 | 数据范围 |
|---|---|---|---|
| 系统概览 | `portal:admin`（或 `ROLE_admin`） | `/api/dashboard/overview` + `/trend`（`project:detail or admin`） | 全站；统计接口本身不做数据权限裁剪 |
| 我的教学 | `portal:teacher` **且** `project:report` | `/api/dashboard/teacher` + `/api/dashboard/teacher/trend`（都是 `project:detail or admin`） | 可见班级（班级树 accessible）+ 自建/协作者/可见班级上分配过资源的项目；趋势与卡片同一批项目 |
| 我的学习 | 默认分支（无需门户权限） | `/api/dashboard/student` + `/api/project/list` | `student` 只查本人答卷/练习；`project/list` 只给「考试安排」表用 |
| 遗留仪表盘 | `project:detail` | `t_dashboard` | 无项目过滤时返回全部 `type` 匹配行 |

## 坑与已知限制

- **分块降级，不是整页兜底**：`AdminHome` 只用 `overview` + `trend` 两块，任何一块失败只让那一块显示「—」+ 原因（`useSection`），
  不会把整页打成 0 或白屏。排查「某个数字是 —」先看网络面板里对应的那一个请求。
- 学员首页的「待考/进行中」来自后端 `todoExams`（班级资源全量，不是前 50 条）；只有卡片提示里的「已发布 N 场」来自
  `/api/project/list` 的前 50 条，超过 50 场时那是抽样值。
- `avgScore` / `passRate` 无样本时后端给 null，前端显示「—」而不是 0：0 分是真实分数，0 均值会被误读成「全班 0 分」。
- `TeacherHome` 的「平均分」是 SQL 的 `AVG(exam_score)`（按答卷加权，`exam_score` 为空的答卷不进分母），
  不再是各场平均分的算术平均。
- `/api/dashboard/teacher/trend` 对管理员也按「他自己可见的项目」算（自己建 + 协作者 + 可见班级资源），
  不是全站口径：管理员要看全站趋势用 `/api/dashboard/trend`。老师首页不会出现这种混用（管理员走 `AdminHome`），
  但直接调接口时会看到「管理员只统计自己的项目」，这是有意的，别当 bug 修。
- **`t_repo` 没有 `is_deleted`，统计不能套通用条件**：`Repo` 实体的删除是物理删，给 `selectCount` 拼 `is_deleted=0`
  会 1054 Unknown column，被 `safe()` 吞成 0——首页题库数变 0 却不报错。所以 `questions.repos` 是 `repoMapper.selectCount(null)`，
  只有 `t_template` 走 `@TableLogic` 自动补条件。
- 视角分发混用两套判定：`has()` 对 `portal:admin` 放行 `ROLE_admin`，`can()` 对学员专属不放行。新增门户权限时别在这两个函数之间随便挑。
- 首页没有路由守卫：`/home` 登录即可进，所以「没有 portal:student 的账号」也会落到 `StudentHome`。这是设计，不是漏配。
- `AdminHome` 的「累计答卷」现在来自 `/api/dashboard/overview`，是**全站**口径（只排除练习伪项目）；`/api/teaching/projects` 仍只统计「我创建/协作」的考试，两者数字本来就不一样，别拿来对账。
- `/api/teaching/projects` 的 SQL 直接读 `t_answer` / `t_project`，绕过 `@EnableDataPerm`；协作者范围就靠那条 `EXISTS` 子查询，改它等于改数据边界。
- `t_dashboard` 在 `init-mysql.sql` 里没有 `is_deleted` 列，而 `Dashboard` 继承 `BaseModel`（`@TableLogic` 会自动拼 `is_deleted = 0`）。老库不改表，`/api/dashboard/list` 稳定 500；补列脚本是 `scripts/dev/add-dashboard-is-deleted.sql`。
- `Dashboard` 的 `key` 字段必须把列名写成 MySQL 的反引号转义形式（见 `Dashboard.java` 里 `@TableField` 上的注释），`type` 也不能映射成别的字段名，否则 SELECT 直接语法/未知列错误——这两个坑都修过一次。
- 前端只调用五个统计接口（`overview/trend/teacher/teacher/trend/student`），**从未调用遗留的 `/api/dashboard/list`**；
  统计接口有 `DashboardStatsServiceImplTest`（趋势补空、窗口夹取、及格率与待批改、无分数时 null、老师最近 8 条、
  老师趋势只算可见项目 / 无项目时整段 0、学员 recent 20 条、学员匿名全 0、响应结构契约），遗留 `/list` 仍只有手工验证。
- 移动端底栏（`MobileTabBar`）与侧栏菜单各判一套条件，改门户权限时两处都要改，否则手机上会少入口或多入口。系统底栏现在统一指向 `/system` 系统首页（`SystemHome`），不再按权限挑一个深链；教学、班级合并后两处都只有一个「教学」入口。
- 首页/快捷入口的 `?tab=exam|classes` 只是前端状态：直接访问 `/teaching` 默认取第一个可用 Tab；没有 `class:list` 的账号访问 `?tab=classes` 会被 `TeachingHome` 归一回去，不要把该 URL 当权限校验（旧值 `insight`/`class`/`survey` 也会归一）。

## 验证

```bash
# 前端类型检查（三种视角组件与分发函数）
cd client && npm run check

# 文档与生成物
npm run docs:gen -- --check
npm run docs:check
```

手工探针（分别用管理员 / 老师 / 学员账号登录后）：

1. 打开 `/home`，确认视角正确：管理员四张统计卡 + 用户构成/答卷量/平均分/及格率/批改进度五块面板、老师「我的教学」、学员「我的学习」。
2. 浏览器网络面板确认首页请求（不含 `/api/system` 与 `/api/currentUser`）：管理员 `overview` + `trend` 两个；
   老师 `teacher` + `teacher/trend` 两个（不再是全站的 `trend`）；学员 `student` + `project/list` 两个。
3. 用学员账号直接访问 `/api/dashboard/overview` 应 403（没有 `project:detail`）；用老师账号访问 `/api/system/user/list` 应 403。
4. 老师首页「我的班级 / 在册学员 / 待批改」应跳 `/teaching?tab=classes`；管理员「进行中考试」与「教学管理」快捷都跳 `/teaching?tab=exam`。
5. 遗留接口：

```bash
# 要 project:detail；表没补 is_deleted 时会 500
curl -s -b cookie.txt "https://<host>/api/dashboard/list?type=1" | head -c 400
```

预期：1/2/3/4 与上表/跳转一致；5 返回 `{"code":200,"data":[...]}`（空数组也算正常，表里本来没数据），若是「服务器内部错误」先查 `t_dashboard.is_deleted`。

## 相关文档

- [权限、角色与用户组](./permissions.md)
- [文件、附件与导入模板](./files.md)
- [权限变更流程（新增权限点/改角色/缓存/迁移）](../flows/permission-change.md)
- [后端架构](../architecture/backend.md)
- [数据模型](../architecture/data-model.md)
- [模块页模板](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/ai/module-template.md)
