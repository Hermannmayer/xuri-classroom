# 权限模型审计（只读）

> 审计对象：`权限 = 角色（用户直挂 ∪ 用户组链绑定）` 这一套模型的**全链路**——server 鉴权、client 页面、数据库表。
>
> 方法：① 静态扫描（controller 上的 `@PreAuthorize`、`PermissionEnum`、前端 `can()/guard()/RequirePerm`）；
> ② 代码走查（`WebSecurityConfig`、`JwtTokenFilter`、`UserServiceImpl` / `SystemServiceImpl` / `DeptServiceImpl` 里的提权守卫）；
> ③ 表结构核对（init-mysql.sql 与实体映射）。
>
> **未发起任何 HTTP 请求、未改任何代码、未重启服务。** 文中「能否真正提权」是**代码路径判断**，不是实际利用验证。

---

## 0. 结论摘要

| # | 结论 | 级别 |
|---|---|---|
| 1 | `@PreAuthorize` 里 59 个真实权限串**全部**能在 `PermissionEnum` 里找到，没有拼写错位（不会出现「永远拒绝」或「永远放行」的哑权限） | ✅ 通过 |
| 2 | 73 项目录里 59 项已被接口使用；14 项未使用，且全部是 `suggested=true`（符合「先入目录、后接注解」的设计） | ✅ 通过 |
| 3 | 但 `repo:export` / `repo:import` / `system:log:list` **已经接到注解上了**，目录里仍标 `suggested=true`（前端会显示「新增」标签） | 🟡 P2 元数据漂移 |
| 4 | 150 个映射方法中 100 个带 `@PreAuthorize`；48 个没有（其中 11 个属于**没打进 jar** 的 flow 模块 → 线上 37 个）。37 个里 2 个需要处理：`ProjectApi.selectUser`、`DashboardApi.listDashboard` | 🟠 P1 |
| 5 | **提权：2 条 P0 + 2 条 P1**，全部围绕「组成员资格没人校验」；角色侧的守卫（直挂角色 / 组绑角色 / admin 角色）是有效的 | 🔴 P0/P1 |
| 6 | admin 角色保护在 API 面**不可绕过**（改 code、改 authority、删除、绑到组、声明 ROLE_ 全被拒） | ✅ 通过 |
| 7 | 缓存：组角色变更 / 用户变更清得干净；**改「角色权限」时不会清组继承者**，最长 1 小时内旧权限仍然生效 | 🟠 P1 |

---

## 1. 审计口径

- 扫描脚本遍历 `server/**/*Api.java`，按 `@XxxMapping` + 方法签名提取端点；`api` 模块共 **150 个映射**、**100 处 `@PreAuthorize`**（脚本按方法聚合后得到 147 个方法、99 个带注解，差异来自 3 个类级 `@RequestMapping`，不影响结论）。
- 「公开」判定依据 `WebSecurityConfig.java:76-78`：
  `/api/public/**` → `permitAll`；`/api/system`（仅该路径本身）→ `permitAll`；`/api/**` → `authenticated()`。
  **即：任何不在 `/api/public/` 下、又没写 `@PreAuthorize` 的接口，任何已登录用户（包括学员）都能调用。**
- 鉴权链路：`JwtTokenFilter.java:65` **每个请求**都会 `userService.loadUserById(userId)` 重新解析权限（结果走 `userCache`，TTL 1h），所以权限变更是否即时生效，取决于缓存失效是否正确——这也是第 6 节的重点。

---

## 2. 完整性：目录 ↔ 注解 ↔ 前端

### 2.1 目录 ↔ 注解（无错位）

| 指标 | 数值 |
|---|---|
| `PermissionEnum` 权限点 | 73（其中 `suggested=true` 17） |
| 注解里出现的真实权限串 | 59（另有 1 个是扫描器把 `PermissionEnum.java:16` 的 Javadoc 示例 `hasAuthority('...')` 误当成了真实注解） |
| **注解里用到但目录没有** | **0**（不存在拼错的权限串） |
| 目录有但没有任何接口使用 | 14（**全部 `suggested=true`**） |

未使用的 14 项（都是设计上「只进目录、还没接注解」的新增建议）：
`project:publish`、`project:partner`、`answer:audit`、`answer:restore`、`repo:grant`、`template:export`、`exercise:manage`、`user:import`、`user:export`、`system:setting:update`、`system:log:export`、`system:backup`、`system:restore`、`content:protect`。

**🟡 P2-1 目录元数据漂移**：以下 3 项已经被接口使用，但仍标 `suggested=true`，前端权限矩阵会给它们打「新增」标签，容易误导管理员以为「勾了也不生效」：
- `repo:export` → `RepoApi.java:173`、`RepoApi.java:192`
- `repo:import` → `RepoApi.java:112`
- `system:log:list` → `AuditApi.java:27`

修复：把 `PermissionEnum.java` 里这 3 项的第 5 个参数（suggested）改成 `false`。

### 2.2 前端 ↔ 后端（对得上，但守卫比动作粗）

前端 16 个权限串（`can()` / `guard()` / `RequirePerm`）**全部**同时存在于目录与后端注解，没有「前端显示按钮、点了一直 403」的错位串。明细：`project:list/detail/create/update`、`answer:list/export`、`repo:list/export/import`、`template:update/delete`、`exercise:list`、`system:user:list`、`system:dept:list`、`system:role:list`、`system:log:list`。

但有三类**语义差异**（不构成越权，只是体验与预期问题）：

| # | 现象 | 位置 | 影响 |
|---|---|---|---|
| 🟡 P2-2 | 前端 `can()` 支持 `domain:*` 通配（`client/src/auth/permissions.ts:31-36`），后端只有精确 `hasAuthority` | 同名文件 | 若有人真给角色写 `repo:*`，前端会放行、后端 403 |
| 🟡 P2-3 | `/system/setting` 路由守卫是 `system:role:list`，但保存接口 `/api/system/update` 要求 `hasRole('admin')`（`SystemApi.java:100`） | `client/src/router.tsx:69` vs `SystemApi.java:100` | 非管理员能看到设置页、保存才 403；页面里 AI/第三方登录等接口同样 admin-only（`SystemApi.java:55/81/90`） |
| 🟡 P2-4 | `/system/permissions` 守卫 `system:role:list`，但保存需要 `system:role:update`，页面**没有**按钮级判断（`Permissions.tsx:224` 的 save 没检查） | `client/src/pages/system/Permissions.tsx:224` | 只给「查看角色」的人看到保存按钮，点了 403 |

---

## 3. 覆盖：没有 `@PreAuthorize` 的 controller 方法

统计：**48 个**（线上 37 个 + flow 模块 11 个）。

### 3.1 属于「设计如此」的公开接口（不处理）

| 接口 | 依据 |
|---|---|
| `SurveyApi` 全部（`loadProject` / `projectOutline` / `question` / `saveAnswer` / `upload` / `statistics` / `loadExamResult` …） | 类级 `@RequestMapping("${api.prefix}/public")`（`SurveyApi.java:23`），匿名答题必须公开 |
| `UserApi.login/logout/register/listRegisterRole` | `/api/public/**`（`UserApi.java:49/78/84/109`） |
| `OAuthApi` 5 个 public 端点 | `/api/public/oauth/**`（`OAuthApi.java:51/68/76/99/104`） |
| `SystemApi.getSystemInfo` | `/api/system` 白名单（`SystemApi.java:46`，登录页需要公钥） |
| `UserApi.myHistoryTask` | 无注解，但服务层按 `create_by = 当前用户` 过滤（`UserServiceImpl.java:1016`），不越权 |

### 3.2 需要关注的「已登录即可调用」接口

| # | 接口 | 位置 | 实际风险 | 级别 |
|---|---|---|---|---|
| 🟠 P1-5 | `POST /api/project/selectUser` → `userService.selectUsers` | `ProjectApi.java:207` | 不带 `collaboratorOnly` 时返回**全部用户**，`simpleMode()` 会把 `phone/email` 一起吐出来（`UserServiceImpl.java:658`、`UserInfo.java:117-121`）→ 任何学员可枚举全校用户手机号 | 🟠 P1（数据泄露，非提权） |
| 🟠 P1-6 | `GET /api/dashboard/list` | `DashboardApi.java:24-27` | 服务层**没有任何归属/权限过滤**（`DashboardServiceImpl.java:29-33`），任何登录用户可按 type/projectId 读任意项目的看板配置 | 🟠 P1 |
| 🟡 P2-5 | `GET /api/system/checkUsernameExist` | `SystemApi.java:252` | 账号枚举（注册页需要，但登录后仍可用；无频率限制以外的限制） | 🟡 P2 |
| 🟡 P2-6 | `POST /api/project/selectRepo` / `selectTemplate` | `ProjectApi.java:265` / `:255` | 自助范围是 `create_by = 我 OR shared=1`（`RepoServiceImpl.java:456-459`），会暴露「共享题库」的名称/统计；不含题目正文 | 🟡 P2 |
| 🟡 P2-7 | `selectDept/selectRole/selectPosition/selectDict/selectTag` | `ProjectApi.java:216/226/236/245/275` | 组织架构、角色名、字典等元数据对任何登录用户可见 | 🟡 P2 |
| 🟡 P2-8 | `FlowApi` 全 11 个端点无注解 | `server/flow/.../FlowApi.java:24-81` | **当前不可利用**：`:api` 只依赖 shared/rdbms/ai（`server/api/build.gradle:24-29`），打出来的 jar 里没有 flow 模块。将来若打包，这批端点会裸奔 | 🟡 P2（预防） |

修复建议：`selectUser` 要么加 `@PreAuthorize("hasAuthority('project:create')")`（与「谁可以当协作者」口径一致），要么强制 `collaboratorOnly=true` 并在服务层按当前用户的数据范围收敛；`listDashboard` 加 `home` 或 `project:detail` 并在服务层补 projectId 归属校验。

---

## 4. 提权路径（逐条判断「能否真正提权」）

> 前提：这些路径都需要先拿到某个 `system:*` 权限。现在的权限矩阵允许管理员把 `system:user:update` / `system:dept:update` 这类权限授予自定义角色（例如「校区管理员」），所以「非管理员持有这些权限」是**设计内**的，不能假设只有超级管理员会用。

### 🔴 P0-1：`system:user:create` 可以在「高权限组」里直接开账号

- 位置：`SystemApi.java:192` → `UserServiceImpl.createSystemUser:439` → `createUser:416`。
- 守卫现状：`createSystemUser` 只校验密码强度和**直挂角色**（`assertGrantableRoles:887`），**完全不校验 `deptId` / `deptIds`**；`createUser:416-435` 直接把 `deptId` 写进 `t_user`，`saveUserDepts:205` 写附加组。
- 危害：攻击者知道某个组绑了 `teacher`（或任何高权限角色）→ 在该组下建一个新账号（密码自己定）→ 登录后 `loadUserById` 沿组链拿到该角色权限。
- **能否真正提权：能**（拿到目标组的角色权限，不是 ROLE_admin，但足以越权）。
- 修复：把「目标组链上绑定的角色」纳入 `assertGrantableRoles` 的口径——即：非管理员创建/修改用户时，先解析目标组链绑定的角色，逐个执行与 `assertGrantableDeptRoles` 相同的「不能授予自己没有的权限」检查。

### 🔴 P0-2：`system:user:update` 可以改「所属组」，把任何人（含自己）挪进高权限组

- 位置：`SystemApi.java:202` → `UserServiceImpl.updateUser:469`；`assertManageableUser:877` + `assertGrantableRoles:887` 只覆盖**角色**，`deptId`（`updateById:478-479`）与 `deptIds`（`517-525`）**没有任何校验**。
- 危害：① 把自己从低权限组挪到绑了高权限角色的组 → 立即提权；② 把高权限用户挪到低权限组 → 降权（破坏性）。
- **能否真正提权：能**（同上，拿到组角色权限）。
- 修复：与 P0-1 同一处统一处理；另外建议对「修改自己的 deptId」单独禁止（管理员改自己所属组也应走审批/二次确认）。

### 🔴 P0-3：`assertManageableUser` 只看直挂角色 → 可接管「靠组继承高权限」的账号

- 位置：`UserServiceImpl.java:877-885`，`loadAuthorityNames:910-917` **只查 `t_user_role`**，不查 `t_dept_role`。
- 危害：一个只拿到 `system:user:update` 的人，面对「没有任何直挂角色、但所在组绑了 teacher 角色」的老师账号时，会判定「权限低于我」→ 可以：
  - 重置该账号密码（`updateUser:481-503`，改他人密码不校验 `oldPassword`）；
  - 直接删除该账号（`deleteUser:564-565`）；
  - 把该账号挪组、清空其角色。
- **能否真正提权：能**（账号接管 = 以对方身份登录 = 拿到对方全部权限）。
- 修复：`loadAuthorityNames` 改为「直挂角色 ∪ 组链绑定角色」——直接复用 `loadUserById(userId).getAuthorities()`（它已经算好了并集，且有缓存），或抽一个 `resolveUserAuthorities` 共用。

### 🟠 P1-4：`system:dept:update` 改「上级组」即可继承高权限祖先的角色

- 位置：`DeptServiceImpl.updateDept:130-135`（`updateById(deptDtoMapper.fromRequest(request))`），`parentId` 没有任何校验。
- 已有守卫：`assertGrantableDeptRoles:168-205` 只校验**直接绑定的角色**（且非管理员不能绑高权限角色 / 不能绑 admin 角色）——但**改组父子关系不受它约束**。
- 危害：把自己所在组挂到「绑了 teacher 的祖先组」下面 → 组内所有成员（含攻击者）沿祖先链继承 teacher 权限。这是对 P1 守卫的**旁路**。
- **能否真正提权：能**。
- 修复：`updateDept` 变更 `parentId` 时，解析「新祖先链上绑定的角色」，按 `assertGrantableDeptRoles` 的同一口径校验；或限制非管理员不能修改 `parentId`（推荐，成本最低）。

### 🟠 P1-5：非管理员可清空高权限角色的 authority（破坏，不提权）

- 位置：`SystemServiceImpl.assertRoleMutationAllowed:214-249`。非管理员提交 `authorities: []` 时，`effectiveAuthorities` 为空 → `callerAuthorities.containsAll(空集)` 恒真（`:245-248`），所以**不需要自己拥有该角色的权限**就能把它的权限清空。
- 危害：把 teacher 角色的权限清空 → 全体老师失去后台能力（可用性攻击 / 误操作）。
- **能否真正提权：不能**（只会减权限）。
- 修复：非管理员修改「自己不具备」的角色时，要求提交的 authorities 必须是角色原有 authorities 的**子集**，并记录审计日志；或只允许管理员改内置角色。

### 🟠 P1-6：改角色权限不会清「组继承者」的缓存

- 位置：`SystemServiceImpl.updateRole:129-161` → `evictCache:184-186` → `getRoleUserIds:188-191`，**只查 `t_user_role`**。
- 危害：把 teacher 角色的 `repo:export` 去掉后，通过组绑定拿到 teacher 的用户在 `userCache` 到期前（TTL 1h）**仍然拥有** `repo:export`；反过来加权限也要等 1h。`JwtTokenFilter.java:65` 每个请求都读缓存，所以这不是「下次登录才生效」，而是「1 小时内一直用旧权限」。
- **能否真正提权：间接能**（被撤销的权限最长 1 小时内仍可用）。
- 修复：`updateRole` / `deleteRole` 改为清空 `userCache` 全量（`userCache.clear()`，和 `DeptServiceImpl.evictAllUserCache:203` 一样）；或按 `t_dept_role` 反查受影响的用户再精确清。

### 🟡 P2-9：删除角色不清理 `t_dept_role` 孤儿绑定

- 位置：`SystemServiceImpl.deleteRole:165-178` 只删 `t_role` 与 `t_user_role`，没有删 `t_dept_role`（该类也没注入 `DeptRoleMapper`）。
- 后果：`t_dept_role` 留下指向已删角色的行；`loadUserById` 用 `listByIds` 取不到 → 被过滤，**不报错**，但绑定残留、界面回显会少一个角色、后续排查困惑。
- 修复：`deleteRole` 里一并 `deptRoleMapper.deleteByRoleId(...)`（给 `DeptRoleMapper` 加一个物理删除方法）。

### 🟡 P2-10：`t_user_role` 没有唯一键

- 位置：`init-mysql.sql:569-580` 只有 `KEY idx_t_user_role (user_type,user_id)`，没有 `(user_id, role_id)` 唯一键（`t_dept_role`/`t_user_dept` 都有唯一键）。
- 后果：`updateUser` 的「先删后插」（`UserServiceImpl.java:507-510`）在并发/重复提交时可能产生重复行；重复行不会放大权限（都是并集），但会让「这是谁的角色」难以统计。
- **能否提权：不能**。
- 修复：加唯一索引 `uk_user_role (user_id, role_id)`（注意 `t_user_role` 的 `deleted` 字段被 `UserRole.java:25-27` 标了 `@TableField(exist=false)`，实际是**物理删除**，所以加唯一键不会踩「逻辑删除 + 唯一键」的坑）。

### 4.1 已验证「防护有效」的路径（重点确认，不是漏洞）

| 尝试 | 结果 | 依据 |
|---|---|---|
| 给自己直挂 admin 角色 | ❌ 拒绝 | `assertGrantableRoles:904`（`ROLE_admin` 命中即抛） |
| 给自己直挂「权限高于自己」的角色 | ❌ 拒绝 | `assertGrantableRoles:901-906` |
| 把角色 `code` 改成 `admin` / 新建 code=admin 的角色 | ❌ 拒绝 | `assertRoleMutationAllowed:217-219` |
| 改 admin 角色的 authority（任何调用者，含管理员） | ❌ 拒绝 | `assertBuiltinAdminAuthorityKept:256-263` |
| 改 admin 角色的 code / 停用 admin 角色 | ❌ 拒绝 | `assertRoleMutationAllowed:220-228` |
| 删除 admin 角色 | ❌ 拒绝 | `deleteRole:170-172` |
| 在角色权限里声明 `ROLE_xxx` | ❌ 拒绝（对所有调用者） | `assertRoleMutationAllowed:232-234` |
| 非管理员把 admin 角色绑到用户组 | ❌ 拒绝 | `DeptServiceImpl.assertGrantableDeptRoles:192-203`（`ROLE_admin` 命中即抛） |
| 非管理员把「高于自己」的角色绑到组 | ❌ 拒绝 | 同上 `:201-203` |
| 普通用户调管理接口（如 `system:role:update`） | ❌ 拒绝 | `@PreAuthorize` + `/api/**` authenticated |

---

## 5. admin 保护能否绕过（结论：API 面不能）

逐一验证的入口与结论见 4.1 表格。补充两点：

1. **`role.code` 不可变**：admin 角色的 code 被锁死（`:224-227`），非 admin 角色也不能把 code 改成 `admin`（`:217-219`），因此 `isBuiltinAdminRole`（按 code 或名称判定，`:265-267`）不会因为「改名」失效——即使管理员把「超级管理员」这个 **name** 改掉，code 仍是 `admin`，保护照旧。
2. **真正的绕过面不经过角色**：P0-1/P0-2/P1-4 拿到的都不是 `ROLE_admin`，而是「目标组绑定的普通角色」。也就是说：**admin 的护城河是完整的，但「谁属于哪个组」这道门没有锁。**

---

## 6. 缓存失效可靠性

| 变更动作 | 是否清缓存 | 依据 | 结论 |
|---|---|---|---|
| 用户角色变更（`t_user_role`） | ✅ 该用户 | `updateUser:468`（`@CacheEvict`）+ `evictUserAfterCommit:526` | 正确 |
| 用户所属组变更（`t_user` / `t_user_dept`） | ✅ 该用户 | 同上 | 正确 |
| 组绑定角色变更（`t_dept_role`） | ✅ **全量** | `DeptServiceImpl.saveDeptRoles:146-166` → `evictAllUserCache:203`（afterCommit） | 正确，且是精确必要的（影响全组） |
| 组本身增删改/排序 | ✅ 全量 | `addDept/updateDept/deleteDept/sortDept` 上的 `@Caching`（`DeptServiceImpl.java:111 / 128 / 224 / 234`） | 正确（这是 task-17 修的） |
| **角色权限变更（`t_role.authority`）** | ⚠️ **只清直挂该角色的用户** | `SystemServiceImpl.evictCache:184-191` | **缺口**：组继承者不清（P1-6） |
| 删除角色 | ⚠️ 同上 + 不清 `t_dept_role` | `deleteRole:174-177` | 缺口（P1-6 / P2-9） |

另外：`userCache` TTL 1h（`server/api/src/main/resources/application-dev.yml:20`），`JwtTokenFilter.java:65` 每请求读它——所以「缓存没清」等于「权限没变」，最长 1 小时；不是「重新登录才生效」。

---

## 7. 数据库约束核对

| 表 | 唯一键 | 删除方式 | 结论 |
|---|---|---|---|
| `t_user_role` | 无 `(user_id, role_id)` 唯一键（`init-mysql.sql:579`） | 物理删除（`UserRole.java:25-27` 用 `@TableField(exist=false)` 屏蔽了 `deleted`） | 不会踩「逻辑删除 + 唯一键」的坑，但可能重复（P2-10） |
| `t_dept_role` | `UNIQUE (dept_id, role_id)`（`init-mysql.sql`） | 物理删除（`DeptRoleMapper.deleteByDeptId`） | ✅ 正确（task-17 修） |
| `t_user_dept` | `UNIQUE (user_id, dept_id)`（`init-mysql.sql:530`） | 物理删除（`UserDeptMapper.deleteByUserId`） | ✅ 正确（task-22 修） |
| `t_role.authority` | — | 保留 | ✅ 角色权限串未被误删（task-27 只删了 `t_dept` 两列） |

---

## 8. 文档一致性

| 文档 | 状态 |
|---|---|
| `docs/permissions.md` | 已在 §6 更新为「权限 = 角色 / 组只负责成员与有效期 / drop-dept-authority.sql」的现状 ✅；但 §4「建议新增」表里 `repo:export` / `repo:import` / `system:log:list` 已被接入，仍列在「建议」里（P2-1 同一问题） |
| `docs/permissions-ia.md` | 与代码一致（生效规则、迁移状态、附加组数据可见性遗留都写了）✅ |
| 权限目录注释 | `PermissionEnum.java:16` 的 Javadoc 示例 `@PreAuthorize("hasAuthority('...')")` 会被静态扫描器当成真实注解误报——建议改成 `hasAuthority('xxx:yyy')` 之类不触发扫描的写法（纯工具友好，非安全问题） |

---

## 9. 修复优先级建议

| 优先级 | 事项 | 改动点 |
|---|---|---|
| **P0** | 统一「组成员资格」守卫：创建用户 / 修改用户（`deptId`、`deptIds`）时，校验目标组链绑定角色的可授予性 | `UserServiceImpl.createUser:416`、`updateUser:469-525`，复用 `DeptServiceImpl.assertGrantableDeptRoles` 的口径 |
| **P0** | `assertManageableUser` 改用「直挂 ∪ 组链」的权限并集 | `UserServiceImpl.loadAuthorityNames:910-917` → 直接复用 `loadUserById` |
| **P1** | `updateDept` 变更 `parentId` 时校验新祖先链的角色（或禁止非管理员改 parentId） | `DeptServiceImpl.updateDept:130-135` |
| **P1** | 角色权限变更 / 删除角色 → 清全量 `userCache` | `SystemServiceImpl.evictCache:184` |
| **P1** | `ProjectApi.selectUser` 加权限或强制 `collaboratorOnly`；`DashboardApi.listDashboard` 补归属校验 | `ProjectApi.java:207`、`DashboardApi.java:24` |
| **P2** | 目录里 3 项 `suggested` 改 false；`Permissions.tsx` 保存按钮按 `system:role:update` 判权；`deleteRole` 清 `t_dept_role`；`t_user_role` 加唯一键；`checkUsernameExist` 收敛 | 见正文对应条目 |

---

## 10. 附：本次审计未覆盖/未验证的部分（避免误读）

- 数据可见范围（`t_repo_partner` / `t_project_partner` / 附加组参与范围）由另一条线在改，本文只覆盖**功能权限**链路。
- 所有「提权」结论来自代码路径判断，**未做实际账号利用**（只读审计，未改数据）。
- 公开答题侧（`/api/public/**`）的业务校验（密码、登录要求、限次）不在本文范围。
