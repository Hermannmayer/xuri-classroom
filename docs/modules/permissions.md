---
id: module-permissions
title: 权限、角色与用户组
status: current
keywords:
  - 权限
  - 角色
  - 用户组
  - 班级
  - dept_type
  - access_level
  - 权限矩阵
  - 数据范围
  - 题库分配
  - repo:detail
  - 审计
  - 403
source_globs:
  - client/src/pages/system/**
  - client/src/pages/teaching/**
  - client/src/auth/permissions.ts
  - client/src/components/RequirePerm.tsx
  - client/src/layout/BasicLayout.tsx
  - client/src/router.tsx
  - server/shared/src/main/java/cn/surveyking/server/core/constant/PermissionEnum.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/SecurityContextUtils.java
  - server/shared/src/main/java/cn/surveyking/server/core/aop/DataPermAspect.java
  - server/shared/src/main/java/cn/surveyking/server/core/mvc/advice/GlobalExceptionHandler.java
  - server/api/src/main/java/cn/surveyking/server/api/SystemApi.java
  - server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java
  - server/api/src/main/java/cn/surveyking/server/api/SystemProtectionApi.java
  - server/api/src/main/java/cn/surveyking/server/api/AuditApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/SystemServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserAdminService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserAuthService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserPermissionGuard.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserDeptMembershipService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/DeptServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/TemplateServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RepoPartnerServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/UserDeptScopeService.java
  - server/rdbms/src/main/java/cn/surveyking/server/core/audit/**
  - server/rdbms/src/main/java/cn/surveyking/server/service/AuditLogService.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ExportGuardService.java
  - server/rdbms/src/main/resources/scripts/init-mysql.sql
  - scripts/nas/migrate/**
entrypoints:
  - client/src/pages/system/Permissions.tsx
  - client/src/pages/system/Group.tsx
  - client/src/auth/permissions.ts
  - server/shared/src/main/java/cn/surveyking/server/core/constant/PermissionEnum.java
  - server/api/src/main/java/cn/surveyking/server/api/SystemApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/core/audit/AuditAspect.java
  - server/rdbms/src/main/java/cn/surveyking/server/core/audit/AuditTargetResolver.java
  - scripts/nas/migrate/23-permission-cleanup.sql
apis:
  - GET /api/currentUser
  - GET /api/system/permission/list
  - GET /api/system/role/list
  - POST /api/system/role/create
  - POST /api/system/role/update
  - POST /api/system/role/delete
  - POST /api/system/protection
  - GET /api/system/dept/list
  - GET /api/system/dept/delete-check
  - POST /api/system/dept/delete
  - POST /api/teaching/classes/create
  - POST /api/teaching/classes/update
  - POST /api/teaching/classes/partner/update
  - GET /api/system/audit/list
  - GET /api/system/audit/actions
tables:
  - t_role
  - t_user_role
  - t_dept_role
  - t_dept
  - t_user
  - t_class_partner
  - t_class_resource
  - t_audit_log
tests:
  - client:npm run check
  - docs:npm run docs:check
last_verified: 2026-11-10
verified_against: a14784b16e026ee8f8e48f9876533b98e5623806
---

# 权限、角色与用户组

## 30 秒摘要

权限点只有一个来源：代码里的 `PermissionEnum`（当前 77 条、11 个分组），数据库 `t_role.authority` 只记录「某个角色勾了哪些串」。用户最终权限 = 直挂角色（`t_user_role`）∪ 主组/附加组及其祖先链绑定角色（`t_dept_role`）的并集；`code=admin` 的角色在运行时还会注入目录里全部**非学员专属**权限。当前三个内置角色：管理员 71、老师 33、学员 14（含 6 个学员专属）。组织树从本轮起分成两类节点：`dept_type=org` 是**用户组**（只放 staff、可绑角色），`dept_type=class` 是**班级**（只放 student、不绑角色）。前端用 `can()` + `RequirePerm` 决定菜单、路由与按钮，后端用 `@PreAuthorize` 兜底，数据可见范围另由 `@EnableDataPerm`、协作者表与班级资源分配控制。所有写操作落 `t_audit_log`，列表会补中文动作名、目标名与操作人姓名。

## 什么时候看这篇

- 菜单不出现、点进去 403、按钮消失，要判断是前端判定还是后端注解。
- 要给老师/学员加减能力，或要新增一个权限点。
- 管理员看不到某个新接口，但权限矩阵里显示「全部勾选」。
- 改完角色或用户组，怀疑「权限没生效」。
- 用户组页/班级页互相看不到对方的数据，或「老师能不能自己建班」说不清。
- 班级分配了题库，学员仍打不开详情/题目，要确认是缺 `repo:detail` 还是窗口未开放。
- 要查谁导出了题库/答卷、谁改了权限，或要把审计接到新接口上。
- 403 只看到英文 / 不知道是权限不足还是业务拒绝。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 权限目录（唯一来源） | `server/shared/src/main/java/cn/surveyking/server/core/constant/PermissionEnum.java` | 77 条权限串 + 中文名 + 分组 + `suggested` / `studentOnly`；`grouped()` 供目录接口 |
| 权限装配 | `server/rdbms/src/main/java/cn/surveyking/server/impl/UserAuthService.java` | `buildUserInfo`、`resolveUserAuthorities`、`toAuthorityNames`（admin 注入）；组链解析在 `UserDeptMembershipService#resolveDeptChainIds` |
| 角色写操作 | `server/rdbms/src/main/java/cn/surveyking/server/impl/SystemServiceImpl.java` | `getRoles` / `createRole` / `updateRole` / `deleteRole` / `getPermissionCatalog`；`assertRoleMutationAllowed`、`assertBuiltinAdminAuthorityKept` |
| 组织节点类型 | `server/rdbms/src/main/java/cn/surveyking/server/domain/model/Dept.java`、`DeptServiceImpl.java` | `TYPE_ORG`/`TYPE_CLASS`、`dept_type` 校验、用户组绑角色与缓存失效 |
| 用户组成员约束 | `server/rdbms/src/main/java/cn/surveyking/server/impl/UserAdminService.java` | staff 只能进 org、student 只能进 class；建号/改号 |
| 班级授权级别 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java` | `assertClassManage`、`t_class_partner.access_level`（1 只读 / 2 可管理）、`ClassNodeView.manageable` |
| 后端接口 | `server/api/src/main/java/cn/surveyking/server/api/SystemApi.java` | `/system/role/*`、`/system/permission/list`、用户/组/字典接口的 `@PreAuthorize`；`/system/dept/list?deptType=` |
| 班级接口 | `server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java` | 建班/改班、成员、导入、老师授权、班级资源 |
| 内容保护接口 | `server/api/src/main/java/cn/surveyking/server/api/SystemProtectionApi.java` | `POST /api/system/protection`，`content:protect` 只改三项 |
| 403 文案 | `server/shared/src/main/java/cn/surveyking/server/core/mvc/advice/GlobalExceptionHandler.java` | `AccessDeniedException` 的 message 原样放进响应体，前端直接展示中文原因 |
| 审计查询 | `server/api/src/main/java/cn/surveyking/server/api/AuditApi.java`、`service/AuditLogService.java` | `/api/system/audit/list` 返回 `AuditLogView`；`/api/system/audit/actions` 给筛选下拉 |
| 审计写入 | `server/rdbms/src/main/java/cn/surveyking/server/core/audit/AuditAspect.java`、`AuditRecorder.java`、`AuditTargetResolver.java`、`AuditActionCatalog.java` | 环绕写映射；解析目标名、动作中文名、操作人 |
| 导出审计 | `server/rdbms/src/main/java/cn/surveyking/server/service/ExportGuardService.java` | 导出密码、一次性 token、`EXPORT_REPO` / `EXPORT_ANSWER` / `IMPORT_REPO` |
| 数据范围切面 | `server/shared/src/main/java/cn/surveyking/server/core/aop/DataPermAspect.java` | `@EnableDataPerm` 校验 `projectPartnerService.getProjectPerms()`，管理员直接放行 |
| 可见组解析 | `server/rdbms/src/main/java/cn/surveyking/server/service/UserDeptScopeService.java` | 主组 ∪ 附加组 ∪ 各自祖先链；`DEPT_SCOPE_SQL` 与 `resolveDeptScope` 两种用法 |
| 前端判定 | `client/src/auth/permissions.ts` | `can()` / `isAdmin()` / `STUDENT_ONLY_PERMISSIONS` / `loadAuthorities()` / `notifyAuthChanged()` |
| 页面守卫 | `client/src/components/RequirePerm.tsx` | 无权限直接整页 403，而不是进去后逐页吃 403 |
| 菜单与路由 | `client/src/layout/BasicLayout.tsx`、`client/src/router.tsx` | 菜单用 `can()` 过滤；路由用 `guard(perm)` |
| 权限矩阵页 | `client/src/pages/system/Permissions.tsx` | 角色卡 + 左树 + 右侧已选 + 草稿保存；路由 `/system/permissions` |
| 数据表 | `t_role`、`t_user_role`、`t_dept_role`、`t_dept`、`t_user`、`t_class_partner`、`t_audit_log` | 建表见 `server/rdbms/src/main/resources/scripts/init-mysql.sql` |

## 关键流程

### 1. 一次请求上的权限装配

1. `JwtTokenFilter` 从 Cookie 解出用户 id，调 `UserService#loadUserById`（命中 `userCache`，TTL 见 `custom-cache.entries`：开发 1 小时、生产 1 天）。
2. `resolveUserAuthorities` 取 `t_user_role` 的角色 + 组链（主组 ∪ 附加组 ∪ 各自祖先）上的 `t_dept_role`，停用角色被忽略。
3. `toAuthorityNames` 把 `authority` 按逗号拆开，并加上 `ROLE_<code>`；当角色 `code=admin` 时追加 `PermissionEnum` 中 `studentOnly=false` 的全部权限串。
4. `GET /api/currentUser` 把 `authorityList` 交给前端；前端 `loadAuthorities()` 模块级缓存一次，登录/登出调 `notifyAuthChanged()` 清缓存并广播到其它标签页。

### 2. 组织树：用户组（org）与班级（class）

1. 同一张 `t_dept` 用 `dept_type` 分两类：`org` 是教职工组织（用户组页维护，可绑角色），`class` 是学员教学单位（班级页维护，不绑角色）。历史数据 `dept_type` 为空按 `org` 解释。
2. `GET /api/system/dept/list?deptType=org|class` 按类型筛选；不带参数返回全量组织树。用户组页只传 `org`，班级树只查 `class`。
3. 新建节点默认 `org`；上级必须同类型；`dept_type` 是节点身份，不能通过更新互转。老师建班走 `POST /api/teaching/classes/create`（`class:list`），服务端强制 `class` 且 `roleIds=null`；用户组仍走 `/api/system/dept/create`（`system:dept:create`）。
4. 成员类型也被约束：staff 只能进 org，student 只能进 class（`UserAdminService#assertUserDeptTypes`）；`/api/system/dept/list` 的用户筛选只列 staff，班级成员只列 student。
5. 用户管理页的「用户组管理 / 新建用户组」固定跳 `/system/group`，不再重定向到班级页；班级页入口是 `/teaching/classes`（`class:list`）。

### 3. 权限矩阵保存

1. 页面并发拉 `GET /api/system/permission/list`（目录）与 `GET /api/system/role/list`（角色 + `authorities`）。
2. 勾选只改本地草稿 `draft`；目录外的历史串原样保留，避免保存时误删。
3. `POST /api/system/role/update`，body 只带 `{ id, authorities }`。
4. 服务端 `assertRoleMutationAllowed`（禁止 `ROLE_`、禁止越权授予、空数组等于收回全部）、`assertBuiltinAdminAuthorityKept`（内置管理员权限不可改）后写库。
5. 事务提交后（`afterCommit`）清空 `userCache` 与 `deptCache`；同一 JWT 的下一次请求就会拿到新权限，不需要重新登录。

### 4. 四道判定与 403 文案

1. 菜单：`BasicLayout` 用 `can(authorities, perm)` 过滤，和路由守卫同一套判定。
2. 路由：`router.tsx` 的 `guard(perm)` 包 `RequirePerm`，命中数组里任一权限即放行。
3. 按钮：页面里逐项 `can()` 渲染而不是 disabled。
4. 后端：接口 `@PreAuthorize` 是第一道闸；需要「同一动作、不同档位」时再在服务层二次校验（`assertRoleGrantScope`、`assertGrantableRoles`、`assertManageableUser`、`ClassServiceImpl#assertClassManage`）。
5. 业务 403 会带中文原因：`GlobalExceptionHandler#handleAccessDeniedException` 把 `AccessDeniedException#getMessage()` 原样放进响应体（如「你对该班级只有查看权限，不能修改」「只有项目所有者可以管理成员」），前端直接展示；不要把它统一改写成英文 `Authentication failed`。

### 5. 班级授权级别（access_level）

1. `t_class_partner.access_level`：1=只读（看班级与成员），2=可管理（增删改本班/下级班学员、批量导入）。历史数据/空值按只读。
2. `POST /api/teaching/classes/partner/create` 支持 `accessLevel`；对已存在的 `(dept_id,user_id)` 是 upsert（显式传才改级别）。`partner/update` 单独改一条授权的级别，`id` 必须属于该班。
3. `ClassNodeView.manageable` 与 `ClassServiceImpl#assertClassManage` 同一口径：管理员 / `class:grant`；本班或祖先班是自己创建/负责；本班或祖先班有 `access_level=2` 授权。
4. 成员写操作（create/update/delete/import）与班级资源写操作都要求 `assertClassManage`；只读授权能看不能改。
5. 班级资源支持 `project` 与 `repo` 两类。题库分配只放宽「可见/读题/练习」：`RepoServiceImpl#listRepo`、`TemplateServiceImpl#isReadableRepo`、`RepoPartnerServiceImpl#hasPracticePermission` 认班级分配；**`/api/repo/detail` 仍要求 `repo:detail`**，学员没有这个权限，不能直接调详情。题库也没有全局窗口，读闸门只看班级开关 + 本班窗口。

### 6. 审计：动作、目标、操作人都可读

1. `AuditAspect` 拦截 `cn.surveyking.server.api` 下带 `@PostMapping` / `@PutMapping` / `@DeleteMapping` / `@PatchMapping` 的方法，跳过 `/api/public/**` 与 `/api/captcha/**`；失败也记一条。
2. `AuditRecorder` 由 URI 生成动作码（如 `/api/system/role/update` → `SYSTEM_ROLE_UPDATE`），写入 `action` / `target_id` / `target_name` / `ip` / `create_by`；登录成功由 `UserApi` 手写 `AUTH_LOGIN` 并显式传操作人 id（此时 SecurityContext 还没有用户）。
3. `AuditTargetResolver` 在业务执行前解析目标名称：`/system/dept/*` 与 `/teaching/classes/*` → `t_dept.name`；`/system/user/*` → `t_user.name`；`/system/role/*` → `t_role.name`；`/project/*` → `t_project.name`；`/repo/*` → `t_repo.name`；班级成员动作优先取学员姓名。创建类取请求 DTO 的 `name`；批量 id 最多拼 3 个。解析用反射 `getXxx`，失败吞掉不影响业务。
4. `GET /api/system/audit/list` 返回 `PaginationResponse<AuditLogView>`，`AuditLogService` 批量查 `t_user` 填 `operatorName`，用 `AuditActionCatalog` 填 `actionName`（83 个精确动作 + token 兜底；未收录回退原码）。旧记录 `target_name` 为空时前端回退 `targetId`。
5. `GET /api/system/audit/actions`（`system:log:list`）返回库里实际出现过的动作 `[{code,name}]`，前端筛选下拉不再硬编码。
6. 导出另由 `ExportGuardService` 记 `EXPORT_REPO` / `EXPORT_ANSWER` / `IMPORT_REPO`，带目标名称。

## 修改指南

### 新增权限点

1. 在 `PermissionEnum` 加条目：`code` 用「域:对象:动作」，给中文名、`Group`、一句话说明；学员专属再加 `studentOnly=true`。
2. 把接口改成 `@PreAuthorize("hasAuthority('新串') or hasRole('admin')")`；管理动作优先用「目标权限 or admin」，避免管理员被自己新建的串挡住。
3. 同步 `init-mysql.sql` 的 `t_role` 种子；线上另写幂等迁移脚本（见[权限变更流程](../flows/permission-change.md)）。
4. 前端：在用到的地方改 `can()`；若是学员专属，必须同时改 `STUDENT_ONLY_PERMISSIONS`（两处必须一致，否则管理员会重新看到学员入口）。
5. 若它决定菜单，补 `client/src/pages/system/permissionPresets.ts` 的 `PERMISSION_MENU`；若它是页面入口，补 `router.tsx` 的 `guard`。
6. 跑 `npm run docs:gen` 让 `docs/reference/permissions.md` 跟上，再跑 `npm run docs:check`。

### 调整内置角色

改 `init-mysql.sql` 种子 + 新增 `scripts/nas/migrate/` 脚本，两者必须同口径；老师目前保留 `project:delete`（只能删自己创建/协作的考试），`answer:delete` / `answer:restore` 归管理员，题库写入（`repo:create/update/delete`）不授予。

### 改用户组 / 班级

1. 用户组（org）：写 `t_dept_role` 后清 `userCache` / `deptCache`；非管理员只能绑自己权限子集的角色。
2. 班级（class）：建班/改班走 `TeachingApi` + `ClassServiceImpl`，**不要**在班级上绑角色；管理员直接调 `/api/system/dept/update` 仍可写 `t_dept_role`，但页面不提供。
3. 改成员范围/授权级别时同步 `ClassServiceImpl#assertClassVisible`（看）、`assertClassManage`（改）、`manageableDeptIds`（树上可管理标记）与 `t_class_partner.access_level`。
4. 改组织类型/成员约束时同步 `DeptServiceImpl#normalizeDeptType`、`assertParentDeptType` 与 `UserAdminService#assertUserDeptTypes`。

### 改审计

1. 新动作优先补 `AuditActionCatalog` 的精确中文名；漏了也能 token 兜底，但会显示成「系统用户组删除」这种拼接词。
2. 新接口的目标实体如果不在 dept/user/role/project/repo 里，在 `AuditTargetResolver` 加分支或让请求 DTO 带可读 `name`；删除类必须在 `proceed` 前解析。
3. 新字段要同步 `AuditLogView` / `AuditLogService#toView` / 前端 `Audit.tsx`；改 `target_name` 长度时同步 `t_audit_log`。

## 权限与数据范围

| 角色 | code | 权限点数 | 学员专属 | `system:*` | 定位 |
|---|---|---:|---|---|---|
| 超级管理员 | `admin` | 71 | 不注入 | 有 | 管理权限全集（= 目录 77 条减去 6 条学员专属） |
| 老师 | `teacher` | 33 | 无 | 无 | 建/编/发/删自己创建的考试，题库只读 + 导入，答卷补录/批改，班级管理 |
| 学员 | `student` / `xueyuan` | 14 | 6 条全有 | 无 | 答题、练习、错题本、题目只读、我的成绩 |

学员专属权限（`PermissionEnum.studentOnly=true`，前端 `STUDENT_ONLY_PERMISSIONS` 必须逐条对应）：

- `project:answer` 开始答题
- `repo:questions:read` 查看题库题目
- `repo:book` 错题本/练习册
- `repo:practice` 开始练习
- `exercise:list` 练习记录/练习页
- `portal:student` 学员视角

判定细则：`can()` 先看精确命中，再对学员专属直接返回 false（不走 `ROLE_admin` 兜底），最后才允许 `ROLE_admin` 或同域通配符（`repo:*`）放行。后端学员能力没有专属注解，靠「只有学员角色持有这些串」来区分。

| 动作 | 权限 | 数据范围 |
|---|---|---|
| 看题库列表/题目 | `repo:list` + `repo:detail` 或 `repo:questions:read` | 成员/协作者/所属组授权/本班题库分配；管理员全量。列表与 `/api/template/list` 认班级分配，`/api/repo/detail` 仍只认 `repo:detail` |
| 看考试与答卷 | `project:list`、`answer:list` | 所有者、协作者（`t_project_partner`，含组）、班级资源分配或本人答卷 |
| 删考试 | `project:delete` | 仅自己创建/协作的考试（老师同样受此约束） |
| 改系统设置 | `system:setting:update` | 全局 |
| 改水印/防复制 | `content:protect` | 全局，只接受三个字段 |
| 看操作日志 | `system:log:list` | 全局 |
| 管理用户/组/角色 | `system:user:*`、`system:dept:*`、`system:role:*` | 全局，且受「不能授予高于自己」二次校验 |
| 新建/修改班级 | `class:list` + `assertClassManage`（修改） | 老师建班后是自己创建；修改还要求本班/祖先班可管理 |
| 班级成员写 | `class:member:create/update/delete` + `assertClassManage` | 只读授权（access_level=1）403 |
| 分配班级老师 | `class:grant` 或 admin | 全部班级；级别 1 只读 / 2 可管理 |
| 用户组管理 | `system:dept:create/update/delete` | 全局；仅 org 节点可在页面绑角色 |

## 坑与已知限制

- `PermissionEnum` 里的 `suggested` 语义已过期：现在只剩 `project:publish` 与 `content:protect` 还标着 `true`，但两者都已接上 `ProjectApi` 的 `/status` 与 `SystemProtectionApi` 的 `/protection`。别再把它当「未接线」判断。
- 有 5 个目录条目后端没有注解：`project:answer`、`repo:practice`、`portal:student`、`portal:teacher`、`portal:admin`。它们只影响前端菜单、路由与首页视角，接口层另有权限（例如 `/api/teaching/*` 要 `project:report`）。
- 管理员在库里和运行时不是同一份：运行时注入 71 条全集，库里缺的串由 `23-permission-cleanup.sql` 补齐；改目录后若只在代码里加，权限矩阵会显示「全勾选」而接口 403。
- 前端保存角色权限时必须保留目录外的历史串（`t_role.authority` 里可能有 `answer`、`system:role` 这类早期前缀），否则会把库里的脏串删掉一半；页面用 `catalogCodes` 过滤只影响显示。
- 「全部取消勾选」提交空数组 = 收回全部权限，后端会显式写空串；非管理员只能对自己权限覆盖得了的角色这么做。
- 角色/组变更后**不需要重新登录**，但权限矩阵页保存成功的提示仍写着「相关用户需重新登录才生效」，这句话已经不准。
- `userCache` TTL 开发 1 小时 / 生产 1 天（`custom-cache.entries`），`deptCache` 1 天、`projectPermissionCache` 10 分钟；角色/组写操作会在 `afterCommit` 清缓存，直接改库（不经服务层）则最多等一个 TTL——生产上就是「改完当天没生效」。
- 前端 `loadAuthorities()` 是模块级缓存，登录成功/登出必须调 `notifyAuthChanged()`；否则同标签页「管理员登出 → 学员登录」会继续沿用上一人的权限。
- 管理员判定有两套：后端 `SecurityContextUtils#isAdmin` 看 `ROLE_admin` 权限；前端权限矩阵页按 `role.code === 'admin'` 锁编辑，后端还额外按名称「超级管理员」兜底。
- 学员角色的 code 可能是 `student` 也可能是 `xueyuan`（历史数据），迁移脚本与 `ClassStudentService` 都同时接受两者；新脚本别只写一个。
- 职务权限已下线：`system:position:*`、`system:user:updatePosition` 不在目录里，对应接口仍是 `hasRole('admin')`，改它们不会经过权限矩阵。
- 数据范围已经按「主组 ∪ 附加组 ∪ 各自祖先链」解析（`UserDeptScopeService#resolveDeptScope` / `DEPT_SCOPE_SQL`），不要再退回只读 `t_user.dept_id`；但按组聚合的 SQL（如 `TeachingMapper#listClasses` 的 `GROUP BY u.dept_id`）仍只认主组，附加组成员会落到主组那一行。
- 用户管理只显示 `user_type=staff`（前端固定传 `userType: 'staff'`），学员在「班级管理」里按班维护；`ClassServiceImpl` 的成员接口还会硬校验 `user_type=student`，两边不是同一批人。
- 用户组有效期只在登录时校验（`UserDeptMembershipService#assertDeptValid`）：已登录用户不会因为组到期被踢，最长可以用到 JWT 过期（`sk.security.jwt.expiration-seconds`，默认 8 小时）。
- **org/class 是页面与成员约束，不是数据库强约束**：管理员直接调 `/api/system/dept/update` 仍可给 class 节点写 `t_dept_role`；不要让新代码绕过 `TeachingApi` 给班级绑角色。
- **历史 `dept_type` 为空按 org**：存量学员若还在 org 组，会因为没有班级分配而看不到按班考试；迁移脚本 `30-dept-type.sql` 只加列/默认值，数据搬迁要按实际组织手工处理。
- **老师能建班但不能删班**：删除班级仍要求 `system:dept:delete`（默认只有管理员）；`class:list` 只负责入口与建班/改班。
- **403 文案依赖异常 message**：业务代码抛 `AccessDeniedException` 时请写可读中文；改成无 message 会让前端只看到 `Authentication failed`。
- **审计只覆盖写操作**，读接口不落日志；`/api/public/**` 全部排除，匿名答题与登录失败只能在应用日志里查。`targetName` 是尽力解析，实体已删/账号已删/参数里没有 id 时为 null，前端回退 `targetId`。
- **审计动作名是展示层**：`AuditActionCatalog` 未收录的动作会按 token 拼接或回退原码；新增接口后补一条精确名，别指望兜底永远读得通。
- **题库班级分配不等于 `repo:detail`**：班级分配只让学员在列表看到、通过 `/api/template/list` 看题、通过 `/api/repo/pick`/旧练习入口练习；直接调 `/api/repo/detail` 仍会 403。排查「能看到题库但打不开详情」时先看这条。
- **题库列表不按窗口过滤**：班级开关关闭/未开始/已结束时题库仍可能出现在列表里，打开/练习才被 `canStudentReadRepo` 拒绝；与项目列表同一套「列表宽、打开严」的取舍。

## 验证

```bash
# 前端类型检查（会检查 can()/RequirePerm 的用法）
cd client && npm run check

# 文档与生成物是否一致
npm run docs:gen -- --check
npm run docs:check
```

预期：`npm run check` 无输出即通过；`docs:check` 对本模块无错误。

线上探针（登录后带 Cookie）：

```bash
# 管理员：71 条，且不含学员专属
curl -s -b cookie.txt https://<host>/api/currentUser \
  | python -c "import json,sys; a=json.load(sys.stdin)['data']['authorityList']; print(len(a)); print([x for x in a if x in {'project:answer','repo:practice','repo:book','repo:questions:read','exercise:list','portal:student'}])"
# 期望：71，第二行是 []

# 组织树类型筛选：用户组只回 org，班级只回 class
curl -s -b cookie.txt "https://<host>/api/system/dept/list?deptType=org"
curl -s -b cookie.txt "https://<host>/api/system/dept/list?deptType=class"

# 审计筛选下拉：返回 [{code,name}]
curl -s -b cookie.txt https://<host>/api/system/audit/actions

# 角色点数（在库里核对）
docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking -e "
  SELECT code, LENGTH(authority)-LENGTH(REPLACE(authority,',',''))+1 AS n
  FROM t_role WHERE is_deleted=0 ORDER BY n DESC;"
# 期望：admin 71 / teacher 33 / student(xueyuan) 14

# 老师删答卷应 403，body.message 是可读中文（不是 Authentication failed）
curl -s -b teacher.txt -X POST https://<host>/api/answer/delete -d '{"ids":["x"]}'
```

## 相关文档

- [班级与教学工作台](./teaching.md)
- [建班与授权](../flows/class-grant.md)
- [文件、附件与导入模板](./files.md)
- [权限变更流程（新增权限点/改角色/缓存/迁移）](../flows/permission-change.md)
- [权限设计基线（历史推导，部分已过期）](./permissions.md)
- [模块页模板](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/ai/module-template.md)
