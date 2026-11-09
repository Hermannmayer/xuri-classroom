---
title: "常见改动配方"
description: "新增页面/接口/权限/迁移/流程改动时，按这些清单做"
---

# 常见改动配方

> 这些是“从任务到文件”的检查清单；具体模块细节以对应 `modules/*.md` 为准。

## 1. 新增一个页面/路由

1. 在 `client/src/pages/<域>/` 建页面组件。
2. `client/src/router.tsx` 加路由：页面级权限用 `guard(...)`，不要只靠菜单隐藏。
3. `client/src/layout/BasicLayout.tsx` / `MobileTabBar.tsx` 加菜单（条件与路由守卫一致）。
4. 在对应 `docs/modules/*.md` 的代码地图/修改指南登记；运行 `npm run docs:gen`。
5. 验证：`cd client && npm run check`，再用对应角色点一遍。

## 2. 新增/修改接口

1. Controller 放 `server/api/.../api/*Api.java`，加 `@GetMapping`/`@PostMapping`。
2. 功能权限用 `@PreAuthorize("hasAuthority('code')")`；数据范围需要时加 `@EnableDataPerm(key = "#...")`。
3. Service 接口在 `server/shared/**/service`，实现在 `server/rdbms/**/impl`。
4. 前端 `client/src/api/index.ts` 加封装/类型。
5. 更新模块页的代码地图/权限表；运行 `npm run docs:gen` 生成 `reference/api.md`。

## 3. 新增权限点

1. `server/shared/.../PermissionEnum.java` 加枚举（code/name/group/desc/studentOnly）。
2. 需要给现有角色时，新增 `scripts/nas/migrate/NN-*.sql`（幂等），并同步 `init-mysql.sql`。
3. 前端 `client/src/auth/permissions.ts` 的 `STUDENT_ONLY_PERMISSIONS`（如果 studentOnly）。
4. 页面/路由/按钮用 `can()`；后端用 `@PreAuthorize`。
5. 更新 `modules/permissions.md`；`npm run docs:gen` 生成权限目录。
6. 验证：管理员/老师/学员三角色各登录一次；`/api/currentUser` 的 authorityList 符合预期。

## 4. 数据库结构变更

1. 改实体/DTO/Mapper。
2. 更新 `server/rdbms/src/main/resources/scripts/init-mysql.sql`（新库）。
3. 新增 `scripts/nas/migrate/NN-*.sql`（现网、幂等）。
4. 更新 `architecture/data-model.md`；运行 `npm run docs:gen` 生成 `reference/db-schema.md`。
5. 先在事务里试跑迁移并回滚，再正式执行；备份先行。

## 5. 改考试/答题流程

1. 先读 `modules/project.md`、`modules/answer.md`、`flows/exam-publish-answer.md`。
2. 前端页面 + `client/src/schema`/`renderer`（如果涉及题目）。
3. 后端 `ProjectApi`/`AnswerApi` + Service。
4. 注意发布状态走 `/api/project/status`（`project:publish`），整包保存走 `/api/project/update`。
5. 跑 `npm run test:rules` + 手工答题链路。

## 6. 改部署/脚本

1. 脚本在 `scripts/nas/`；发布入口 `Deploy-Nas.ps1`。
2. 更新 `docs/ops/NAS-开发工作流.md`（内部）或 `start/dev-setup.md`。
3. 不要改飞牛系统层、不要动旧 `surveyking` 数据。
4. 发布后跑冒烟；回滚用 `git revert`。

## 7. 只改注释/格式

如果确认无行为变化，提交信息加：

~~~text
Docs-Impact: none
~~~

否则请更新对应模块页。

