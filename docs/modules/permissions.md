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
  - 按班答卷
  - 按班导出
  - 匿名答卷
  - sk-anon
  - is_anonymous
  - 匿名清理
  - 保留天数
  - 三级授权
  - 教师组
  - project:partner
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
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnonymousCleanupService.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/SystemInfo.java
  - client/src/pages/system/Setting.tsx
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
  - server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java
  - server/api/src/main/java/cn/surveyking/server/api/RepoApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectPartnerServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectPartnerRequest.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectPartnerView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/RepoPartnerRequest.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/RepoPartnerView.java
  - scripts/nas/migrate/35-repo-category.sql
  - scripts/nas/migrate/36-partner-access-level.sql
  - server/api/src/main/java/cn/surveyking/server/api/AnswerApi.java
  - server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnonymousIdentityServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/AnonymousSubject.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/AnswerQuery.java
  - client/src/pages/teaching/ClassAnswersDrawer.tsx
  - client/src/pages/answer/AnonymousAnswersDrawer.tsx
  - client/src/pages/survey/PartnerPanel.tsx
  - client/src/pages/repo/GrantModal.tsx
  - scripts/nas/migrate/33-anonymous-answer.sql
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
  - client/src/pages/survey/PartnerPanel.tsx
  - client/src/pages/repo/GrantModal.tsx
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
  - GET /api/teaching/classes/answers
  - GET /api/answer/download
  - POST /api/answer/export/token
  - GET /api/public/anonymous/answers
  - POST /api/public/anonymous/claim
  - GET /api/project/tree
  - POST /api/project/partner/update
  - POST /api/repo/partner/update
  - GET /api/repo/categories
  - POST /api/repo/categories/create
  - POST /api/system/anonymous/cleanup
  - GET /api/system
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
  - t_project_partner
  - t_repo_partner
  - t_repo_category
  - t_answer
  - t_anonymous_subject
  - t_sys_info
  - t_audit_log
tests:
  - client:npm run check
  - docs:npm run docs:check
last_verified: 2026-11-10
verified_against: d6dc54f68daad66f319455a951f620bc8f809560
---

# 权限、角色与用户组

## 30 秒摘要

权限点只有一个来源：代码里的 `PermissionEnum`（当前 77 条、11 个分组），数据库 `t_role.authority` 只记录「某个角色勾了哪些串」。用户最终权限 = 直挂角色（`t_user_role`）∪ 主组/附加组及其祖先链绑定角色（`t_dept_role`）的并集；`code=admin` 的角色在运行时还会注入目录里全部**非学员专属**权限。当前三个内置角色：管理员 71、老师 33、学员 14（含 6 个学员专属）。组织树从本轮起分成两类节点：`dept_type=org` 是**用户组**（只放 staff、可绑角色），`dept_type=class` 是**班级**（只放 student、不绑角色）。前端用 `can()` + `RequirePerm` 决定菜单、路由与按钮，后端用 `@PreAuthorize` 兜底，数据可见范围另由 `@EnableDataPerm`、项目/题库协作者表的 access_level（1/2/3）与班级资源分配控制。所有写操作落 `t_audit_log`，列表会补中文动作名、目标名与操作人姓名。

## 什么时候看这篇

- 菜单不出现、点进去 403、按钮消失，要判断是前端判定还是后端注解。
- 要给老师/学员加减能力，或要新增一个权限点。
- 管理员看不到某个新接口，但权限矩阵里显示「全部勾选」。
- 改完角色或用户组，怀疑「权限没生效」。
- 用户组页/班级页互相看不到对方的数据，或「老师能不能自己建班」说不清。
- 班级分配了题库，学员仍打不开详情/题目，要确认是缺 `repo:detail`/`repo:questions:read`，还是题库全局期/本班窗口未开放。
- 匿名答卷能提交但找不回、登录后认领不到，或班级/项目报表里匿名数据混进来。
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
| 班级授权级别 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java` | `assertClassVisible`（看）/`assertClassManage`（改）、`t_class_partner.access_level`（1 只读 / 2 可管理）、`ClassNodeView.manageable` |
| 项目/题库三级授权 | `ProjectPartnerServiceImpl`、`RepoPartnerServiceImpl`、`t_project_partner`、`t_repo_partner` | `access_level` 1 查看 / 2 编辑 / 3 授权；owner/admin 全权；项目写 `>=2`、成员管理 `>=3`；题库写 `>=2`、成员管理 `>=3`；教师组/用户组按组链继承 |
| 后端接口 | `server/api/src/main/java/cn/surveyking/server/api/SystemApi.java` | `/system/role/*`、`/system/permission/list`、用户/组/字典接口的 `@PreAuthorize`；`/system/dept/list?deptType=` |
| 班级接口 | `server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java` | 建班/改班、成员、导入、老师授权、班级资源、按班答卷 `/classes/answers` |
| 按班答卷/导出 | `server/api/src/main/java/cn/surveyking/server/api/AnswerApi.java`、`server/rdbms/.../impl/AnswerServiceImpl.java` | `classService.assertVisible` + `listAnswerByClass`/`downloadByClass`；`/answer/download?classId=` 与 `POST /answer/export/token`；默认 `is_anonymous=0` |
| 匿名答卷/主体 | `server/api/.../SurveyApi.java`、`server/rdbms/.../impl/AnonymousIdentityServiceImpl.java`、`t_anonymous_subject` | `sk-anon` cookie（HttpOnly/Lax/90d/SHA-256）；`/public/anonymous/answers`、`/claim`；匿名答卷不写 `create_by` |
| 匿名清理 | `server/rdbms/.../impl/AnonymousCleanupService.java`、`AnonymousIdentityService#purgeOlderThan` | `t_sys_info.setting` 的开关/天数；每日 03:30 `@Scheduled`；`POST /api/system/anonymous/cleanup` 手动触发 |
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
| 数据表 | `t_role`、`t_user_role`、`t_dept_role`、`t_dept`、`t_user`、`t_class_partner`、`t_project_partner`、`t_repo_partner`、`t_repo_category`、`t_answer`、`t_anonymous_subject`、`t_audit_log` | 建表见 init-mysql；匿名主体见迁移 33；项目/题库 access_level 见迁移 36；题库分类见迁移 35 |

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
5. 班级资源支持 `project` 与 `repo` 两类。题库分配放宽「可见/读题/练习/详情」：`RepoServiceImpl#listRepo`、`TemplateServiceImpl#isReadableRepo`、`RepoPartnerServiceImpl#hasPracticePermission` 认班级分配；`/api/repo/detail` 允许 `repo:detail` 或 `repo:questions:read`，但仍走 `RepoServiceImpl#assertReadableRepo`（管理员/创建者/共享/partner/班级分配）。
6. 题库有全局开放期（`t_repo.open_start_at/open_end_at`，NULL=不限）：班级窗口非空端必须落在全局期内，越界 400「题库开放时间必须在全局开放时间内」；读闸门按「班级开关 → 题库全局期 → 本班窗口」判断。已经存在的班级窗口如果超出后来新设的全局期，不会自动修正，学生侧按硬上限判，需要老师重设。
7. **班级可见性也决定「按班看答卷/导出」**：`GET /api/teaching/classes/answers` 要 `project:report` + `classService.assertVisible(deptId)`；`GET /api/answer/download?classId=` 要 `answer:export` + `assertVisible`。两者都不要求项目所有者/协作者：任何能看这个班的老师（含只读授权）都能看/导出该项目的本班答卷。不带 `classId` 的通用 `/answer/download` 仍按项目协作者范围（`assertProjectExportAllowed`）。
8. **匿名答卷不是一个权限主体**：`/api/public/**` 全部 permitAll；`loadProject` 在未登录且项目不要求登录时写 `sk-anon`，`saveAnswer` 写 `is_anonymous=1`/`create_by=null`。`GET /public/anonymous/answers` 只按当前 cookie 主体（或登录用户）返回摘要；`POST /public/anonymous/claim` 只要求已登录（没有额外权限点），claim 后重算 `class_id`/`attempt_no`。匿名数据默认 `is_anonymous=0` 过滤，班级可见老师也看不到；管理员/项目管理者显式 `includeAnonymous` 才能在答卷列表看到。

### 5.1 系统设置：匿名答卷清理

1. 字段：`SystemInfo.SystemSetting` 增加 `anonymousCleanupEnabled`（默认开启）、`anonymousRetentionDays`（默认 90，夹到 1~3650）、`anonymousLastCleanupAt`/`anonymousLastCleanupCount`（只读，清理任务写）。`SystemServiceImpl#mergeSysInfo` 只复制开关与天数并 clamp；客户端传 last 字段不会生效。
2. 入口：系统设置页「匿名答卷」Tab（`client/src/pages/system/Setting.tsx`）有自动清理 Switch、保留天数 InputNumber、立即清理按钮、上次清理时间/条数；保存走 `POST /api/system/update {setting:{anonymousCleanupEnabled,anonymousRetentionDays}}`。
3. 手动清理：`POST /api/system/anonymous/cleanup`，权限 `hasRole('admin')` 或 `hasAuthority('system:setting:update')`，返回 `{deleted:n}`；前端立即清理按钮同样按 `system:setting:update`/admin 渲染。
4. 自动清理：`AnonymousCleanupService#cleanupDaily` 用 `@Scheduled(cron="0 30 3 * * ?")` 每日 03:30 跑；`SurveyServerApplication` 已加 `@EnableScheduling`；关闭时跳过，异常只记日志。cron 按容器时区解释，不是浏览器时区。
5. 清理口径：`AnonymousIdentityService#purgeOlderThan(days)` 只删 `is_anonymous=1` 且 `create_at < cutoff` 的答卷（`@TableLogic` 逻辑删除）；主体下没有剩余匿名答卷时物理删 `t_anonymous_subject`。登录用户/班级成绩/非匿名答卷不碰；`purgeExpired()` 仍负责 cookie 主体过期清理，两者不是同一条。
6. 写回：`AnonymousCleanupService#runNow` 更新 last 字段并清 `commonCache`，否则 `GET /api/system` 可能读到旧设置；更新是读整行再写回，极低概率覆盖并发保存的设置。

### 5.2 项目/题库三级授权（P12）

1. 字段：`t_project_partner.access_level` / `t_repo_partner.access_level`（tinyint，1 查看 / 2 编辑（含查看，默认）/ 3 授权（含编辑/查看）），迁移 `scripts/nas/migrate/36-partner-access-level.sql`。两边 Request/View/Model 都有 `accessLevel`；项目 `partner/update`、题库 `partner/update` 用来改级别。
2. 项目类型：owner（type=1）固定 3；协作者/教师组（type=2）按请求级别；班级/学员答卷人（type=3）与外部导入答卷人（type=4）固定 1。新建项目 owner 由 `addProjectPartner` 写 3；迁移回填 type=1→3、type=3/4→1，其余默认 2。教师组是一条 `group_id` 记录，组员按主组+附加组+祖先链继承级别。
3. 题库：`t_repo_partner` 的 user/dept 记录都带级别；owner 记录迁移/新建写 3；组授权一条 `dept_id` 记录，组员按组链继承。共享题库（`shared=1`）是另一条可见性，不受 level 限制。
4. 判定链：项目 `ProjectPartnerService#accessLevel` 返回 0/1/2/3；`assertCanGrant` 允许 owner/admin/level3 改成员；`ProjectServiceImpl#assertCanEditProject` 对 updateProject/updateProjectStatus/deleteProject 要求 level>=2。题库 `RepoServiceImpl#assertManageRepo` 对题库内容写要求 level>=2；`RepoPartnerServiceImpl#assertManagePermission` 对成员/级别管理要求 owner/创建者/admin/level3。
5. 接口：`POST /api/project/partner/update {projectId?, id, accessLevel}`、`POST /api/repo/partner/update {repoId?, id, accessLevel}`；注解只要求 `project:partner`/`repo:grant`（或 admin），真正级别校验在 Service。`partner/create|delete` 同样从 owner-only 放宽到 owner/admin/level3。
6. UI：`PartnerPanel`/`GrantModal` 显示级别 Tag（可查看/可编辑/可授权）并允许有权限者改；班级/答卷人只读。`ProjectView`/`RepoView` 当前不返回 `myAccessLevel`，level1/2 仍可能看到全局授权/编辑按钮，点击由后端 403 兜底；要彻底隐藏需补 View 字段。
7. 已知：level2 能编辑内容但不能改成员/继续授权；level3 才能转授；level1 只读；owner/admin 不受级别限制；项目 owner 记录如果手工插入漏 level，`accessLevel()` 仍按 type=OWNER 返回 3，但库里可能显示默认 2。

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
| 看题库列表/题目 | `repo:list` + `repo:detail` 或 `repo:questions:read` | 成员/协作者/所属组授权/本班题库分配；管理员全量。列表、`/api/template/list`、`/api/repo/detail` 均认班级分配；详情仍受 `assertReadableRepo` 与题库全局期/本班窗口约束 |
| 看考试与答卷 | `project:list`、`answer:list` | 所有者、协作者（`t_project_partner`，含组）、班级资源分配或本人答卷 |
| 删考试 | `project:delete` + `assertCanEditProject` | owner/admin 或 access_level>=2；level1 只读 |
| 编辑/发布考试 | `project:update`/`project:publish` + `assertCanEditProject` | owner/admin 或 level>=2；level1 后端 403 |
| 项目成员/级别 | `project:partner` + `assertCanGrant` | owner/admin/access_level=3；level1/2 只读；`partner/update` 只能改 type=2 |
| 编辑题库/导入 | `repo:update`/`template:update`/`template:import` + `assertManageRepo` | admin/创建者或 access_level>=2；level1 只读 |
| 题库成员/级别 | `repo:grant` + `assertManagePermission` | admin/创建者或 access_level=3；level1/2 不能改成员 |
| 改系统设置 | `system:setting:update` | 全局 |
| 改匿名清理设置/立即清理 | `system:setting:update` 或 admin | 匿名答卷保留开关/天数；手动清理 `POST /api/system/anonymous/cleanup` |
| 改水印/防复制 | `content:protect` | 全局，只接受三个字段 |
| 看操作日志 | `system:log:list` | 全局 |
| 管理用户/组/角色 | `system:user:*`、`system:dept:*`、`system:role:*` | 全局，且受「不能授予高于自己」二次校验 |
| 新建/修改班级 | `class:list` + `assertClassManage`（修改） | 老师建班后是自己创建；修改还要求本班/祖先班可管理 |
| 班级成员写 | `class:member:create/update/delete` + `assertClassManage` | 只读授权（access_level=1）403 |
| 按班查看答卷 | `project:report` + `classService.assertVisible(deptId)` | 班级可见即可看本班全部（默认 `is_anonymous=0`），不要求项目协作者 |
| 按班导出答卷 | `answer:export` + `classService.assertVisible(deptId)` | 只导出该班 `class_id` 命中的非匿名答卷；只支持 `type=answer` |
| 通用导出答卷（不带 classId） | `answer:export` + 项目数据权限 | 仍是项目所有者/协作者范围（`getProjectPerms`）；匿名默认排除 |
| 匿名提交/找回 | 无（`/api/public/**`） | 只认 `sk-anon` cookie；匿名 `is_anonymous=1`、`create_by=null` |
| 匿名 claim | 登录（无额外权限点） | 只认当前 cookie 主体；重算 `class_id`/`attempt_no`，不合并其他主体 |
| 匿名数据可见性 | 管理员/项目管理者 `includeAnonymous` | 默认 `is_anonymous=0`；班级报表、项目 total、导出、公开统计都不含匿名 |
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
- **题库班级分配可以读详情，但不绕过数据边界**：`/api/repo/detail` 允许 `repo:detail` 或 `repo:questions:read`，班级分配的学生可以打开本班可见题库；但仍受 `assertReadableRepo`、题库全局开放期与本班窗口约束。排查「能看到题库但打不开详情」时先看这条。
- **题库列表不按窗口过滤**：班级开关关闭/未开始/已结束时题库仍可能出现在列表里，打开/练习才被 `canStudentReadRepo` 拒绝；与项目列表同一套「列表宽、打开严」的取舍。
- **按班答卷绕过项目协作者过滤**：`/api/teaching/classes/answers`、`/api/answer/download?classId=` 只校验 `project:report`/`answer:export` + 班级可见；只读班级授权也能看/导出本班全部答卷，不要再以为必须先是项目协作者。
- **历史 `class_id` 为空不进按班报表**：按班列表/导出只认精确 `t_answer.class_id`；学情概览会按 `COALESCE(class_id,dept_id,'')` 回退主组，出现「概览有数、抽屉为空」是正常现象。
- **班级答卷导出 UI 没有密码输入**：`ClassAnswersDrawer` 调 `/api/answer/export/token` 时传空 body；系统配置导出密码后会失败，需要补密码输入或走无密码场景。
- **`AnswerQuery.classId` 不改变普通列表的项目范围**：`GET /api/answer/list?classId=` 仍在原项目数据权限内过滤；只有 `listAnswerByClass` 才按班级放开到本班全部。
- **匿名不是角色/权限点**：公开提交与找回都走 `/api/public/**`，没有 `answer:*` 权限要求；`claim` 只检查登录。匿名主体的 `token_hash` 只在库里，响应只返回答卷摘要，不要把 subject id/token 暴露给前端。
- **匿名数据默认被报表过滤**：`is_anonymous=1` 的答卷不进入班级报表/项目 total/公开统计/导出；管理员在 `/answer/list` 显式 `includeAnonymous=true` 才放开。班级可见老师也不能通过按班接口看到匿名答卷（`listAnswerByClass` 固定 `is_anonymous=false`）。
- **匿名只靠 cookie**：清 cookie、换设备、历史 P1 前数据都找不回；claim 不自动合并多个匿名主体；`purgeExpired()` 未接调度。
- **项目树不是班级分配树**：`/api/project/tree` 只认创建者/partner type 1/2，不含 `t_class_resource` 分配与 type 3；学生端不用树，别把它当班级可见性接口。
- **匿名清理是逻辑删，不是物理删**：`purgeOlderThan` 只把 `t_answer.is_deleted` 置 1，`t_answer_item` 投影与附件不清理；需要彻底释放空间要另做物理清理/分批任务。
- **匿名清理的权限是系统设置权限**：手动接口与设置页保存都要求 `system:setting:update`（或 admin），不是 `answer:delete`；不要把它挂到答卷删除入口。
- **last 字段只读**：`anonymousLastCleanupAt/Count` 由清理任务写，`mergeSysInfo` 不接收客户端值；设置页保存时只提交开关/天数。
- **清理任务未分批**：`purgeOlderThan` 一次 `select id/subject` + 一次按条件删；匿名答卷很多时可能长事务/锁表，需要按 id 分批或加合适索引（`is_anonymous,create_at`）。
- **cron 按容器时区**：每日 03:30 是 JVM/容器时区，不是用户本地时区；跨时区部署要显式设置 `TZ` 或改 cron。
- **项目/题库 access_level 是行级数据，不是权限串**：`project:update`/`repo:grant` 只决定「能不能进这个功能」，level 决定「对这个项目/题库能做什么」。level2 可编辑内容但不能改成员，level3 才能转授；owner/admin 例外。
- **level1/2 的 UI 仍显示全局按钮**：`ProjectView`/`RepoView` 没有 `myAccessLevel`，列表/面板只能按功能权限渲染；level1/2 点「授权/编辑」由后端 `assertCanEditProject`/`assertManagePermission` 403 兜底，不要把按钮可见当权限。
- **项目文件夹重名只在前端校验**：`ProjectTree` 只比较当前父级同层 folder；后端 `createProject` 不拦重名，直接调接口可建同名文件夹。
- **题库分类 registry 全局可见、path 不写回 t_repo.category**：`t_repo_category` 只登记目录，空文件夹所有人可见；`t_repo.category` 是 varchar64，registry path 是 255，深层目录可能建得了但挂不进题库；`listRepo` 的 category 过滤是原始精确值。

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

# 班级可见的老师（非项目协作者）：按班看答卷应 200，通用导出应 403
curl -s -o /dev/null -w '%{http_code}\n' -b teacher.txt \
  "https://<host>/api/teaching/classes/answers?projectId=<projectId>&deptId=<classId>&current=1&pageSize=20"
curl -s -o /dev/null -w '%{http_code}\n' -b teacher.txt \
  "https://<host>/api/answer/download?projectId=<projectId>&type=answer"
# 匿名：未登录先拿 sk-anon（访问 /public/loadProject 后 cookie jar 会变），再查自己的答卷摘要
curl -s -c anon.txt -b anon.txt -X POST https://<host>/api/public/loadProject \
  -H 'Content-Type: application/json' -d '{"id":"<projectId>"}'
curl -s -b anon.txt "https://<host>/api/public/anonymous/answers?projectId=<projectId>"
# 登录后认领：返回数字（认领条数）
curl -s -b teacher.txt -X POST https://<host>/api/public/anonymous/claim
# 项目分类树：只认创建者/partner type 1/2，不是班级分配树
curl -s -b teacher.txt https://<host>/api/project/tree
# 手动清理匿名答卷：admin 或 system:setting:update；返回 {deleted:n}
curl -s -b admin.txt -X POST https://<host>/api/system/anonymous/cleanup
# 设置里确认 last 字段（只读）与开关/天数
curl -s -b admin.txt https://<host>/api/system | python -c \
  "import json,sys; s=json.load(sys.stdin)['data']['setting']; print({k:s.get(k) for k in ['anonymousCleanupEnabled','anonymousRetentionDays','anonymousLastCleanupAt','anonymousLastCleanupCount']})"
# 项目/题库三级授权：level1 写应 403，level2 可编辑但管成员 403，level3 可继续授权
curl -s -o /dev/null -w '%{http_code}\n' -b level1.txt -X POST https://<host>/api/project/update \
  -H 'Content-Type: application/json' -d '{"id":"<projectId>","name":"x"}'
curl -s -o /dev/null -w '%{http_code}\n' -b level2.txt -X POST https://<host>/api/project/partner/update \
  -H 'Content-Type: application/json' -d '{"projectId":"<projectId>","id":"<partnerId>","accessLevel":3}'
curl -s -b admin.txt -X POST https://<host>/api/project/partner/update \
  -H 'Content-Type: application/json' -d '{"projectId":"<projectId>","id":"<partnerId>","accessLevel":3}'
# 迁移 36 自检：项目 owner/答卷人级别；题库 partner 默认级别
docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking -e "
  SELECT type, access_level, COUNT(*) FROM t_project_partner GROUP BY type, access_level ORDER BY type;
  SELECT COALESCE(access_level, -1) AS lvl, COUNT(*) FROM t_repo_partner GROUP BY access_level;"
```

## 相关文档

- [班级与教学工作台](./teaching.md)
- [建班与授权](../flows/class-grant.md)
- [文件、附件与导入模板](./files.md)
- [权限变更流程（新增权限点/改角色/缓存/迁移）](../flows/permission-change.md)
- [权限设计基线（历史推导，部分已过期）](./permissions.md)
- [模块页模板](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/ai/module-template.md)
