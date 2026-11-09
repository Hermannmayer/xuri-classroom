---
id: module-permissions
title: 权限、角色与用户组
status: current
keywords:
  - 权限
  - 角色
  - 用户组
  - 权限矩阵
  - 数据范围
  - 审计
source_globs:
  - client/src/pages/system/**
  - client/src/auth/permissions.ts
  - client/src/components/RequirePerm.tsx
  - client/src/layout/BasicLayout.tsx
  - client/src/router.tsx
  - server/shared/src/main/java/cn/surveyking/server/core/constant/PermissionEnum.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/SecurityContextUtils.java
  - server/shared/src/main/java/cn/surveyking/server/core/aop/DataPermAspect.java
  - server/api/src/main/java/cn/surveyking/server/api/SystemApi.java
  - server/api/src/main/java/cn/surveyking/server/api/SystemProtectionApi.java
  - server/api/src/main/java/cn/surveyking/server/api/AuditApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/SystemServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserAuthService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserPermissionGuard.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserDeptMembershipService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/DeptServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/UserDeptScopeService.java
  - server/rdbms/src/main/java/cn/surveyking/server/core/audit/**
  - server/rdbms/src/main/java/cn/surveyking/server/service/ExportGuardService.java
  - server/rdbms/src/main/resources/scripts/init-mysql.sql
  - scripts/nas/migrate/**
entrypoints:
  - client/src/pages/system/Permissions.tsx
  - client/src/auth/permissions.ts
  - server/shared/src/main/java/cn/surveyking/server/core/constant/PermissionEnum.java
  - server/api/src/main/java/cn/surveyking/server/api/SystemApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/core/audit/AuditAspect.java
  - scripts/nas/migrate/23-permission-cleanup.sql
apis:
  - GET /api/currentUser
  - GET /api/system/permission/list
  - GET /api/system/role/list
  - POST /api/system/role/create
  - POST /api/system/role/update
  - POST /api/system/role/delete
  - POST /api/system/protection
  - GET /api/system/audit/list
tables:
  - t_role
  - t_user_role
  - t_dept_role
  - t_dept
  - t_user
  - t_audit_log
tests:
  - client:npm run check
  - docs:npm run docs:check
last_verified: 2026-11-09
verified_against: 6c14ecfdf35a6c2610f436152c616e25e525c5b6
---

# 权限、角色与用户组

## 30 秒摘要

权限点只有一个来源：代码里的 `PermissionEnum`（当前 77 条、11 个分组），数据库 `t_role.authority` 只记录「某个角色勾了哪些串」。用户最终权限 = 直挂角色（`t_user_role`）∪ 主组/附加组及其祖先链绑定角色（`t_dept_role`）的并集；`code=admin` 的角色在运行时还会注入目录里全部**非学员专属**权限。当前三个内置角色：管理员 71、老师 33、学员 14（含 6 个学员专属）。前端用 `can()` + `RequirePerm` 决定菜单、路由与按钮，后端用 `@PreAuthorize` 兜底，数据可见范围另由 `@EnableDataPerm` 与协作者表控制。所有写操作落 `t_audit_log`。

## 什么时候看这篇

- 菜单不出现、点进去 403、按钮消失，要判断是前端判定还是后端注解。
- 要给老师/学员加减能力，或要新增一个权限点。
- 管理员看不到某个新接口，但权限矩阵里显示「全部勾选」。
- 改完角色或用户组，怀疑「权限没生效」。
- 要查谁导出了题库/答卷，或要把审计接到新接口上。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 权限目录（唯一来源） | `server/shared/src/main/java/cn/surveyking/server/core/constant/PermissionEnum.java` | 77 条权限串 + 中文名 + 分组 + `suggested` / `studentOnly`；`grouped()` 供目录接口 |
| 权限装配 | `server/rdbms/src/main/java/cn/surveyking/server/impl/UserAuthService.java` | `buildUserInfo`（原 `loadUserById` 方法体；`userCache` 注解仍在门面 `UserServiceImpl#loadUserById` 上）、`resolveUserAuthorities`、`toAuthorityNames`（admin 注入）；组链解析在 `UserDeptMembershipService#resolveDeptChainIds` |
| 角色写操作 | `server/rdbms/src/main/java/cn/surveyking/server/impl/SystemServiceImpl.java` | `getRoles` / `createRole` / `updateRole` / `deleteRole` / `getPermissionCatalog`；`assertRoleMutationAllowed`、`assertBuiltinAdminAuthorityKept` |
| 用户组绑角色 | `server/rdbms/src/main/java/cn/surveyking/server/impl/DeptServiceImpl.java` | 写 `t_dept_role` 后清 `userCache` / `deptCache` |
| 后端接口 | `server/api/src/main/java/cn/surveyking/server/api/SystemApi.java` | `/system/role/*`、`/system/permission/list`、用户/组/字典接口的 `@PreAuthorize` |
| 内容保护接口 | `server/api/src/main/java/cn/surveyking/server/api/SystemProtectionApi.java` | `POST /api/system/protection`，`content:protect` 只改水印/防复制三项 |
| 审计查询 | `server/api/src/main/java/cn/surveyking/server/api/AuditApi.java` | `GET /api/system/audit/list`，要 `system:log:list` |
| 审计写入 | `server/rdbms/src/main/java/cn/surveyking/server/core/audit/AuditAspect.java`、`AuditRecorder.java` | 环绕 `cn.surveyking.server.api` 下所有写映射 |
| 导出审计 | `server/rdbms/src/main/java/cn/surveyking/server/service/ExportGuardService.java` | 导出密码、一次性 token、`EXPORT_REPO` / `EXPORT_ANSWER` / `IMPORT_REPO` |
| 数据范围切面 | `server/shared/src/main/java/cn/surveyking/server/core/aop/DataPermAspect.java` | `@EnableDataPerm` 校验 `projectPartnerService.getProjectPerms()`，管理员直接放行 |
| 可见组解析 | `server/rdbms/src/main/java/cn/surveyking/server/service/UserDeptScopeService.java` | 主组 ∪ 附加组 ∪ 各自祖先链；`DEPT_SCOPE_SQL` 与 `resolveDeptScope` 两种用法 |
| 前端判定 | `client/src/auth/permissions.ts` | `can()` / `isAdmin()` / `STUDENT_ONLY_PERMISSIONS` / `loadAuthorities()` / `notifyAuthChanged()` |
| 页面守卫 | `client/src/components/RequirePerm.tsx` | 无权限直接整页 403，而不是进去后逐页吃 403 |
| 菜单与路由 | `client/src/layout/BasicLayout.tsx`、`client/src/router.tsx` | 菜单用 `can()` 过滤；路由用 `guard(perm)` |
| 权限矩阵页 | `client/src/pages/system/Permissions.tsx` | 角色卡 + 左树 + 右侧已选 + 草稿保存；路由 `/system/permissions` |
| 数据表 | `t_role`、`t_user_role`、`t_dept_role`、`t_dept`、`t_user`、`t_audit_log` | 建表见 `server/rdbms/src/main/resources/scripts/init-mysql.sql` |

## 关键流程

### 1. 一次请求上的权限装配

1. `JwtTokenFilter` 从 Cookie 解出用户 id，调 `UserService#loadUserById`（命中 `userCache`，TTL 见 `custom-cache.entries`：开发 1 小时、生产 1 天）。
2. `resolveUserAuthorities` 取 `t_user_role` 的角色 + 组链（主组 ∪ 附加组 ∪ 各自祖先）上的 `t_dept_role`，停用角色被忽略。
3. `toAuthorityNames` 把 `authority` 按逗号拆开，并加上 `ROLE_<code>`；当角色 `code=admin` 时追加 `PermissionEnum` 中 `studentOnly=false` 的全部权限串。
4. `GET /api/currentUser` 把 `authorityList` 交给前端；前端 `loadAuthorities()` 模块级缓存一次，登录/登出调 `notifyAuthChanged()` 清缓存并广播到其它标签页。

### 2. 权限矩阵保存

1. 页面并发拉 `GET /api/system/permission/list`（目录）与 `GET /api/system/role/list`（角色 + `authorities`）。
2. 勾选只改本地草稿 `draft`；目录外的历史串原样保留，避免保存时误删。
3. `POST /api/system/role/update`，body 只带 `{ id, authorities }`。
4. 服务端 `assertRoleMutationAllowed`（禁止 `ROLE_`、禁止越权授予、空数组等于收回全部）、`assertBuiltinAdminAuthorityKept`（内置管理员权限不可改）后写库。
5. 事务提交后（`afterCommit`）清空 `userCache` 与 `deptCache`；同一 JWT 的下一次请求就会拿到新权限，不需要重新登录。

### 3. 四道判定

1. 菜单：`BasicLayout` 用 `can(authorities, perm)` 过滤，和路由守卫同一套判定。
2. 路由：`router.tsx` 的 `guard(perm)` 包 `RequirePerm`，命中数组里任一权限即放行（如题目页 `repo:detail` / `repo:questions:read` / `template:list`）。
3. 按钮：页面里逐项 `can()` 渲染而不是 disabled。
4. 后端：接口 `@PreAuthorize` 是第一道闸；需要「同一动作、不同档位」时再在服务层二次校验（`assertRoleGrantScope`、`assertGrantableRoles`、`assertManageableUser`、`ClassServiceImpl` 里的 `class:grant` 判定）。

### 4. 数据范围

`@EnableDataPerm` + `DataPermAspect` 在方法执行前取 `getProjectPerms()`，不在集合里就 403；管理员短路放行。考试走 `t_project_partner`，题库走 `t_repo_partner`，班级走 `t_class_partner`，与功能权限是两条线。

### 5. 审计

`AuditAspect` 拦截 `cn.surveyking.server.api` 下带 `@PostMapping` / `@PutMapping` / `@DeleteMapping` / `@PatchMapping` 的方法，跳过 `/api/public/**` 与 `/api/captcha/**`；`AuditRecorder` 由 URI 生成动作码（如 `/api/system/role/update` → `SYSTEM_ROLE_UPDATE`），失败也记一条。导出另由 `ExportGuardService` 记 `EXPORT_REPO` / `EXPORT_ANSWER` / `IMPORT_REPO`，带目标名称。

## 修改指南

### 新增权限点

1. 在 `PermissionEnum` 加条目：`code` 用「域:对象:动作」，给中文名、`Group`、一句话说明；学员专属再加 `studentOnly=true`。
2. 把接口改成 `@PreAuthorize("hasAuthority('新串') or hasRole('admin')")`；管理动作优先用「目标权限 or admin」，避免管理员被自己新建的串挡住。
3. 同步 `init-mysql.sql` 的 `t_role` 种子；线上另写幂等迁移脚本（见[权限变更流程](../flows/permission-change.md)）。
4. 前端：在用到的地方改 `can()`；若是学员专属，必须同时改 `STUDENT_ONLY_PERMISSIONS`（两处必须一致，否则管理员会重新看到学员入口）。
5. 若它决定菜单，补 `client/src/pages/system/permissionPresets.ts` 的 `PERMISSION_MENU`；若它是页面入口，补 `router.tsx` 的 `guard`。
6. 跑 `npm run docs:gen` 让 `docs/reference/permissions.md` 跟上，再 `npm run docs:check`。

### 调整内置角色

改 `init-mysql.sql` 种子 + 新增 `scripts/nas/migrate/` 脚本，两者必须同口径；数量核对见文末「验证」。老师目前保留 `project:delete`（只能删自己创建/协作的考试），`answer:delete` / `answer:restore` 归管理员，题库写入（`repo:create/update/delete`）不授予。

### 改菜单 / 路由 / 按钮

先确认权限串已经存在且有接口消费方，再改前端；否则会出现「勾了不生效」的死权限。历史上 `answer:audit`、`template:export`、`exercise:manage`、`system:log:export`、`system:backup`、`system:restore`、`answer:attach` 都是这样被删掉的。

### 改数据范围

改 `ProjectPartnerServiceImpl#getProjectPerms` 或对应 Mapper 的过滤条件，同时检查 `@EnableDataPerm` 的 SpEL key 是否还指向正确的参数名；`projectPermissionCache` 的 key 是用户 id、TTL 10 分钟，协作者变更必须显式失效。

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
| 看题库列表/题目 | `repo:list` + `repo:detail` 或 `repo:questions:read` | 成员/协作者；管理员全量 |
| 看考试与答卷 | `project:list`、`answer:list` | 所有者、协作者（`t_project_partner`，含组）或本人答卷 |
| 删考试 | `project:delete` | 仅自己创建/协作的考试（老师同样受此约束） |
| 改系统设置 | `system:setting:update` | 全局 |
| 改水印/防复制 | `content:protect` | 全局，只接受三个字段 |
| 看操作日志 | `system:log:list` | 全局 |
| 管理用户/组/角色 | `system:user:*`、`system:dept:*`、`system:role:*` | 全局，且受「不能授予高于自己」二次校验 |

## 坑与已知限制

- `PermissionEnum` 里的 `suggested` 语义已过期：现在只剩 `project:publish` 与 `content:protect` 还标着 `true`，但两者都已接上 `ProjectApi` 的 `/status` 与 `SystemProtectionApi` 的 `/protection`。别再把它当「未接线」判断。
- 有 5 个目录条目后端没有注解：`project:answer`、`repo:practice`、`portal:student`、`portal:teacher`、`portal:admin`。它们只影响前端菜单、路由与首页视角，接口层另有权限（例如 `/api/teaching/*` 要 `project:report`）。
- 管理员在库里和运行时不是同一份：运行时注入 71 条全集，库里缺的串由 `23-permission-cleanup.sql` 补齐；改目录后若只在代码里加，权限矩阵会显示「全勾选」而接口 403。
- 前端保存角色权限时必须保留目录外的历史串（`t_role.authority` 里可能有 `answer`、`system:role` 这类早期前缀），否则会把库里的脏串删掉一半；页面用 `catalogCodes` 过滤只影响显示。
- 「全部取消勾选」提交空数组 = 收回全部权限，后端会显式写空串；非管理员只能对自己权限覆盖得了的角色这么做。
- 角色/组变更后**不需要重新登录**，但权限矩阵页保存成功的提示仍写着「相关用户需重新登录才生效」，这句话已经不准。
- `userCache` TTL 开发 1 小时 / 生产 1 天（`custom-cache.entries`），`deptCache` 1 天、`projectPermissionCache` 10 分钟；角色/组写操作会在 `afterCommit` 清缓存，直接改库（不经服务层）则最多等一个 TTL——生产上就是「改完当天没生效」。
- 前端 `loadAuthorities()` 是模块级缓存，登录成功/登出必须调 `notifyAuthChanged()`；否则同标签页「管理员登出 → 学员登录」会继续沿用上一人的权限。
- `router.tsx` 里 `/system/permissions` 的注释还写着「用 `system:user:update` 守卫」，实际守卫是 `system:role:list`；以代码为准，注释待修。
- 管理员判定有两套：后端 `SecurityContextUtils#isAdmin` 看 `ROLE_admin` 权限；前端权限矩阵页按 `role.code === 'admin'` 锁编辑，后端还额外按名称「超级管理员」兜底。
- 学员角色的 code 可能是 `student` 也可能是 `xueyuan`（历史数据），迁移脚本与 `ClassStudentService` 都同时接受两者；新脚本别只写一个。
- 职务权限已下线：`system:position:*`、`system:user:updatePosition` 不在目录里，对应接口仍是 `hasRole('admin')`，改它们不会经过权限矩阵。
- 数据范围已经按「主组 ∪ 附加组 ∪ 各自祖先链」解析（`UserDeptScopeService#resolveDeptScope` / `DEPT_SCOPE_SQL`），不要再退回只读 `t_user.dept_id`；但按组聚合的 SQL（如 `TeachingMapper#listClasses` 的 `GROUP BY u.dept_id`）仍只认主组，附加组成员会落到主组那一行。
- 用户管理只显示 `user_type=staff`（前端固定传 `userType: 'staff'`），学员在「班级管理」里按组维护；`ClassServiceImpl` 的成员接口还会硬校验 `user_type=student`，两边不是同一批人。
- 用户组有效期只在登录时校验（`UserDeptMembershipService#assertDeptValid`）：已登录用户不会因为组到期被踢，最长可以用到 JWT 过期（`sk.security.jwt.expiration-seconds`，默认 8 小时）。
- 审计只覆盖写操作，读接口不落日志；`/api/public/**` 全部排除，匿名答题与登录失败只能在应用日志里查。

## 验证

```bash
# 前端类型检查（会检查 can()/RequirePerm 的用法）
cd client && npm run check

# 文档与生成物是否一致
npm run docs:gen -- --check
npm run docs:check
```

预期：`npm run check` 无输出即通过；`docs:check` 对本模块无错误（缺生成文件、其它模块未写完的报错不算本页问题）。

线上探针（登录后带 Cookie）：

```bash
# 管理员：71 条，且不含学员专属
curl -s -b cookie.txt https://<host>/api/currentUser \
  | python -c "import json,sys; a=json.load(sys.stdin)['data']['authorityList']; print(len(a)); print([x for x in a if x in {'project:answer','repo:practice','repo:book','repo:questions:read','exercise:list','portal:student'}])"
# 期望：71，第二行是 []

# 角色点数（在库里核对）
docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking -e "
  SELECT code, LENGTH(authority)-LENGTH(REPLACE(authority,',',''))+1 AS n
  FROM t_role WHERE is_deleted=0 ORDER BY n DESC;"
# 期望：admin 71 / teacher 33 / student(xueyuan) 14

# 老师删答卷应 403，删自己创建的考试应 200
curl -s -o /dev/null -w '%{http_code}\n' -b teacher.txt -X POST https://<host>/api/answer/delete -d '{"ids":["x"]}'
```

## 相关文档

- [权限设计基线（部分结论已过期，仅看历史推导）](./permissions.md)
- [用户·用户组·角色·权限的联动设计](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/archive/2026-11-permissions-ia.md)
- [权限与角色审计 2026-11-08](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/ops/权限审计-2026-11-08.md)
- [权限变更流程（新增权限点/改角色/缓存/迁移）](../flows/permission-change.md)
- [文件、附件与导入模板](./files.md)
- [首页与统计](./dashboard.md)
- [登录与账号](./auth.md)
- [模块页模板](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/ai/module-template.md)
