---
title: "AI 与开发者的文档入口"
description: "先读这一页：任务路由、模块索引、文档维护规则"
---

# 先读这一页

这份文档面向两类读者：

- **AI/自动化代理**：先读本页，再读 `docs/ai/modules.yaml` 或对应模块页；不要从根目录开始盲搜。
- **人**：从 `docs/index.md` 进入站点；本页也是站点的“任务路由表”。

## AI 的三步工作流

1. **定位模块**：运行 `npm run docs:where -- "关键词"`，或直接 grep `docs/ai/modules.yaml`。
2. **读模块页**：模块页有代码地图、关键流程、修改指南、权限与数据范围、验证命令。
3. **改代码并更新文档**：改完运行 `npm run docs:impact`；按提示更新模块页/生成参考，再跑 `npm run docs:check`。

> 不要先读整个仓库；也不要只读旧审计文档。`docs/ops/**` 里只有 [版本与发版](ops/版本与发版.md) 是当前事实，其余是内部运维/历史快照；`docs/archive/**` 是已过期基线。

## 任务 → 文档 → 代码

| 我要改什么 | 先读 | 主要代码入口 |
|---|---|---|
| 考试/问卷的创建、编辑、发布、协作者 | [modules/project.md](modules/project.md) | `client/src/pages/project/**`、`server/api/.../ProjectApi.java` |
| 编辑器、题型、规则、预览 | [modules/survey.md](modules/survey.md) | `client/src/designer/**`、`client/src/renderer/**`、`server/api/.../SurveyApi.java` |
| 答卷、评分、导出、报表、回收站 | [modules/answer.md](modules/answer.md) | `client/src/pages/answer/**`、`server/api/.../AnswerApi.java` |
| 任务中心、练习、错题本 | [modules/exercise.md](modules/exercise.md) | `client/src/pages/exercise/**`、`client/src/pages/tasks/**` |
| 题库、题目、导入导出、组卷、授权 | [modules/repo.md](modules/repo.md) | `client/src/pages/repo/**`、`server/api/.../RepoApi.java` |
| 班级树、成员、老师分配、学情 | [modules/teaching.md](modules/teaching.md) | `client/src/pages/teaching/**`、`server/api/.../TeachingApi.java` |
| 权限点、角色、用户组、数据范围 | [modules/permissions.md](modules/permissions.md) | `PermissionEnum.java`、`client/src/auth/permissions.ts`、`SystemApi.java` |
| 上传、附件、导入模板 | [modules/files.md](modules/files.md) | `server/api/.../FileApi.java`、`server/rdbms/.../FileServiceImpl.java` |
| 首页、统计、Dashboard | [modules/dashboard.md](modules/dashboard.md) | `client/src/pages/home/**`、`server/api/.../DashboardApi.java` |
| 登录、注册、账号设置、会话 | [modules/auth.md](modules/auth.md) | `client/src/pages/user/**`、`UserApi.java`、`OAuthApi.java` |
| 数据库结构/新增表字段 | [architecture/data-model.md](architecture/data-model.md)、[reference/db-schema.md](reference/db-schema.md) | `init-mysql.sql`、`scripts/nas/migrate/**` |
| 部署安装、版本发版（Windows / Linux / Docker、VERSION、tag、产物） | [版本与发版](ops/版本与发版.md)（维护者）、[部署文档](deploy/index.md)（用户） | `scripts/release/Release.ps1`、`scripts/release/release.py`、`.github/workflows/release.yml` |
| 部署、回滚、NAS 工作流 | `docs/ops/NAS-开发工作流.md`（内部） | `scripts/nas/Deploy-Nas.ps1` |

## 常用命令

~~~bash
npm run docs:where -- "老师删除考试"   # 关键词定位模块
npm run docs:impact                  # 本次改动影响哪些模块文档
npm run docs:gen                     # 生成路由/接口/权限/数据库/模块索引
npm run docs:check                   # 校验 frontmatter、路径、链接、覆盖率
npm run docs:mark -- repo            # 核对完模块后刷新 last_verified
npm run docs:build                   # 构建 VitePress 站点
npm run docs:dev                     # 本地预览
~~~

## 文档分层

| 层 | 位置 | 规则 |
|---|---|---|
| 入口 | `AGENTS.md`、本页 | 短、稳定、只放路由和红线 |
| 模块 | `docs/modules/*.md` | 手写；必须带 frontmatter；150~300 行 |
| 流程 | `docs/flows/*.md` | 跨模块的端到端链路 |
| 参考 | `docs/reference/*.md` | **生成**，不要手改（`routes/api/permissions/db-schema`） |
| 决策 | `docs/decisions/ADR-*.md` | 只记“为什么”，不重复实现细节 |
| 运维 | `docs/ops/版本与发版.md` | 三端安装包与发版流程的事实来源（不在公开站） |
| 历史 | `docs/archive/**`、`docs/ops/**`（除 `版本与发版.md`） | 不作为当前事实；新会话不要先读 |

## 修改代码后的文档规则

1. 任何行为/接口/权限/数据结构变化，都要更新对应模块页的“代码地图/修改指南/坑”。
2. 至少把模块 frontmatter 的 `last_verified` 改成当天、`verified_against` 改成当前 HEAD：

   ~~~bash
   npm run docs:mark -- <module-id>
   ~~~

3. 改了路由、接口、权限枚举、建表 SQL，先跑 `npm run docs:gen`，再提交生成文件。
4. 提交前跑：

   ~~~bash
   npm run docs:gen -- --check
   npm run docs:check
   npm run docs:build
   ~~~

5. CI 会检查生成文件是否漂移；`docs:impact --strict` 会提示哪个模块文档没更新。

## 模块索引与 AI 上下文

- 机器索引：[ai/modules.yaml](ai/modules.yaml)（由各模块 frontmatter 生成）
- 常见改动配方：[ai/task-recipes.md](ai/task-recipes.md)
- 导航自测题：[ai/eval.md](ai/eval.md)
- 模块页模板：[ai/module-template.md](ai/module-template.md)

## 维护边界

- 公开站点不包含 `docs/ops/**`、`docs/archive/**`、`docs/ai/**`；这些目录只给仓库内 AI/运维看。
- 不要把 NAS IP、SSH、密码、Token 写进 `start/`、`architecture/`、`modules/`。
- 不要让生成文件手改；改来源代码，再跑 `docs:gen`。

