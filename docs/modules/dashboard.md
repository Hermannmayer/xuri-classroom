---
id: module-dashboard
title: "首页与统计"
status: current
keywords:
  - 首页
  - 仪表盘
  - 统计
  - 视角
  - dashboard
  - 我的成绩
source_globs:
  - client/src/pages/Home.tsx
  - client/src/pages/home/**
  - client/src/layout/BasicLayout.tsx
  - client/src/router.tsx
  - server/api/src/main/java/cn/surveyking/server/api/DashboardApi.java
  - server/api/src/main/java/cn/surveyking/server/api/MyReportApi.java
  - server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/DashboardServiceImpl.java
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
  - server/api/src/main/java/cn/surveyking/server/api/DashboardApi.java
  - server/api/src/main/java/cn/surveyking/server/api/MyReportApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/TeachingMapper.java
apis:
  - GET /api/my-report/list
  - GET /api/teaching/projects
  - GET /api/dashboard/list
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
last_verified: "2026-11-09"
verified_against: "765fc89"
---

# 首页与统计

## 30 秒摘要

登录后的 `/home` 按**视角权限**渲染三种首页：`portal:admin` → 系统概览，`portal:teacher` + `project:report` → 我的教学，其余 → 我的学习。页面本身不做聚合计算，所有数字都来自现成列表接口：学员用 `GET /api/project/list` + `GET /api/my-report/list`，老师用 `GET /api/teaching/projects`，管理员用四个列表接口的 `total` 相加。`/api/dashboard/list` 与 `t_dashboard` 是上游遗留的「可配置仪表盘」组件，当前前端**完全没有调用**。首页不替代报表页，也不做跨项目全量统计。

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
| 菜单 | `client/src/layout/BasicLayout.tsx` | 教学管理要 `portal:teacher` + `project:list`；班级学情要 `portal:teacher` + `project:report` |
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

第 2 步必须两个权限一起判：`TeacherHome` 会请求 `/api/teaching/projects`，该接口要 `project:report`；而学员预设也带 `project:report`，只看它会把学员误判成老师。

### 2. 学员首页数据

1. `listProjects({ current: 1, pageSize: 50 })` → `GET /api/project/list`，过滤掉 `mode === 'folder'`。
2. `GET /api/my-report/list` → `MyReportService#listMine`，返回按项目聚合的 `attempts` / `bestScore` / `lastSubmitAt`。
3. 四张卡：待考/进行中 = 列表里 `status === 1` 的条数；我已交卷 = `report.length`；最高分平均 = 非空 `bestScore` 的平均；练习记录是跳 `/tasks?tab=practice` 的入口。
4. 考试安排表只展示前 5 条；「开始答题」链接仅在 `project:answer` 命中时渲染（学员专属，管理员不会命中）。

### 3. 教师首页数据

`GET /api/teaching/projects` → `TeachingMapper#listMyProjects`：`t_project` 里 `create_by = 我` 或 `t_project_partner` 里 `type IN (1,2)`，子查询算 `answerCount`（`temp_save=1` 且未删）与 `avgScore`。前端再算：已发布 = `status === 1` 的场次；累计答卷 = 各场 `answerCount` 求和；平均分 = **有答卷场次**的 `avgScore` 算术平均（不是按答卷数加权）。

### 4. 管理员首页数据

`Promise.all` 并发四个请求，各自 `.catch` 成 0 / 空数组：

| 卡片 | 接口 | 取值 |
|---|---|---|
| 用户 | `GET /api/system/user/list`（`pageSize=1`） | `total` |
| 题库 | `GET /api/repo/list`（`pageSize=1`） | `total` |
| 考试 / 问卷 | `GET /api/project/list`（`pageSize=1`） | `total` |
| 累计答卷 | `GET /api/teaching/projects` | 各场 `answerCount` 求和 |

常用入口是纯前端跳转（权限配置、用户管理、用户组、系统设置、操作日志、教学管理），不额外校验权限，点进去由路由守卫兜底。

### 5. 与任务中心、报表页的边界

- 「我的任务」（`/tasks`，要 `project:answer`）是学员作答入口，首页只做汇总与跳转，不重复列表逻辑。
- 报表（`/survey/:id/report`，要 `project:report`）是单场考试的题目级统计；首页的「平均分/答卷数」是场次级近似，两者口径不同。
- 教学管理的班级学情（`/teaching`）按班级聚合，数据源是 `TeachingMapper#listClasses`，首页只给一个入口链接。

### 6. 遗留：`/api/dashboard/list`

`DashboardServiceImpl#listDashboard` 按 `DashboardQuery.type` + 可选 `projectId` 查 `t_dashboard`，返回 `{ id, setting }` 列表。`t_dashboard` 在 `init-mysql.sql` 里只有表结构、没有数据；`saveDashboard` 是空方法。前端没有任何调用方——如果要做「可配置首页」，这是半成品起点，不是现有能力。

## 修改指南

### 加一张卡片

1. 在对应视角组件里加 `Card`；数据优先复用已有接口（`/api/my-report/list`、`/api/teaching/projects` 或某列表接口的 `total`），不要为此新增聚合接口。
2. 卡片上的数字必须给出「近似口径」说明：`/api/project/list` 只取 50 条、`pageSize=1` 只取 `total`。
3. 需要新权限时按[权限变更流程](../flows/permission-change.md)加权限点，并同时改菜单与路由守卫。

### 加一种视角

1. 在 `PermissionEnum` 的 `Group.PORTAL` 下加 `portal:xxx`（非学员专属时管理员会自动注入）。
2. 在 `Dashboard` 的分发链里插到合适位置（越靠前优先级越高），并确认它依赖的接口权限也一起判。
3. 同步 `BasicLayout` 的菜单项与 `MobileTabBar`（移动端底栏单独判 `portal:teacher` / `portal:admin`）。
4. 补迁移脚本给老师/学员角色授权，别只改管理员。

### 改统计口径

改前端计算 = 只影响展示；改 `TeachingMapper` 的 SQL = 同时影响教学管理与首页。改 SQL 时注意：只统计 `temp_save=1`（已交卷）且 `is_deleted=0`，练习记录（`exam_exercise_type` 非空）不能混进考试答卷数。

### 启用 `t_dashboard`

先解决三件事：建表脚本补 `is_deleted`（`scripts/dev/add-dashboard-is-deleted.sql`）、写种子数据、给前端加渲染组件。`key` 是 MySQL 8 保留字、`type` 曾被错映射成 `category`，动模型前先看 `Dashboard.java` 的注释。

## 权限与数据范围

| 视角 | 判定 | 数据来源 | 数据范围 |
|---|---|---|---|
| 系统概览 | `portal:admin`（或 `ROLE_admin`） | 用户/题库/考试列表 `total` + `/api/teaching/projects` | 各接口自身范围；管理员看全量 |
| 我的教学 | `portal:teacher` **且** `project:report` | `/api/teaching/projects` | 我创建的 + 我是协作者（`type 1/2`）的考试 |
| 我的学习 | 默认分支（无需门户权限） | `/api/project/list` + `/api/my-report/list` | 我可见的考试；`my-report` 只查本人答卷 |
| 遗留仪表盘 | `project:detail` | `t_dashboard` | 无项目过滤时返回全部 `type` 匹配行 |

## 坑与已知限制

- `AdminHome` 的四个数字来自四个不同接口，每个都 `.catch` 成 0：任一接口 403/500 时页面显示 0，而不是报错。排查「数字对不上」先看网络面板。
- 学员首页的「待考/进行中」只基于前 50 条考试；超过 50 场时是抽样值，不是全量。
- `StudentHome` 的平均分算法是 `sum(bestScore) / 非空条数 || 0`：当 `report` 非空但全部 `bestScore` 为 null 时，除法结果是 `NaN`，被 `|| 0` 兜成 0；这是展示兜底，不是真实均分。
- `TeacherHome` 的「平均分」是各场平均分的算术平均，场次之间不等权；要「按答卷加权」得改前端公式或让 SQL 直接返回总分/总人数。
- 视角分发混用两套判定：`has()` 对 `portal:admin` 放行 `ROLE_admin`，`can()` 对学员专属不放行。新增门户权限时别在这两个函数之间随便挑。
- 首页没有路由守卫：`/home` 登录即可进，所以「没有 portal:student 的账号」也会落到 `StudentHome`。这是设计，不是漏配。
- `AdminHome` 的「累计答卷」来自 `/api/teaching/projects`，只统计「我创建/协作」的考试；换管理员账号数字会变，不是全站总量。
- `/api/teaching/projects` 的 SQL 直接读 `t_answer` / `t_project`，绕过 `@EnableDataPerm`；协作者范围就靠那条 `EXISTS` 子查询，改它等于改数据边界。
- `t_dashboard` 在 `init-mysql.sql` 里没有 `is_deleted` 列，而 `Dashboard` 继承 `BaseModel`（`@TableLogic` 会自动拼 `is_deleted = 0`）。老库不改表，`/api/dashboard/list` 稳定 500；补列脚本是 `scripts/dev/add-dashboard-is-deleted.sql`。
- `Dashboard` 的 `key` 字段必须把列名写成 MySQL 的反引号转义形式（见 `Dashboard.java` 里 `@TableField` 上的注释），`type` 也不能映射成别的字段名，否则 SELECT 直接语法/未知列错误——这两个坑都修过一次。
- 前端从未调用 `/api/dashboard/*`，所以这套接口目前没有回归覆盖；改它只能靠手工请求验证。
- 移动端底栏（`MobileTabBar`）与侧栏菜单各判一套条件，改门户权限时两处都要改，否则手机上会少入口或多入口。

## 验证

```bash
# 前端类型检查（三种视角组件与分发函数）
cd client && npm run check

# 文档与生成物
npm run docs:gen -- --check
npm run docs:check
```

手工探针（分别用管理员 / 老师 / 学员账号登录后）：

1. 打开 `/home`，确认视角正确：管理员四张卡、老师「我的教学」、学员「我的学习」。
2. 浏览器网络面板确认首页数据请求数量（不含 `/api/system` 与 `/api/currentUser`）：管理员 4 个、老师 1 个、学员 2 个。
3. 用学员账号直接访问 `/api/teaching/projects` 应 403；用老师账号访问 `/api/system/user/list` 应 403。
4. 遗留接口：

```bash
# 要 project:detail；表没补 is_deleted 时会 500
curl -s -b cookie.txt "https://<host>/api/dashboard/list?type=1" | head -c 400
```

预期：1/2/3 与上表一致；4 返回 `{"code":200,"data":[...]}`（空数组也算正常，表里本来没数据），若是「服务器内部错误」先查 `t_dashboard.is_deleted`。

## 相关文档

- [权限、角色与用户组](./permissions.md)
- [文件、附件与导入模板](./files.md)
- [权限变更流程（新增权限点/改角色/缓存/迁移）](../flows/permission-change.md)
- [后端架构](../architecture/backend.md)
- [数据模型](../architecture/data-model.md)
- [模块页模板](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/ai/module-template.md)
