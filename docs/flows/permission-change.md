---
title: "权限变更流程"
status: current
keywords:
  - 新增权限点
  - 改角色
  - 权限缓存
  - 迁移脚本
  - 验证权限
last_verified: "2026-11-09"
verified_against: "765fc89"
---

# 权限变更流程（新增权限点 / 改角色 / 缓存失效 / 迁移）

跨模块流程页：从「想给某个角色加一项能力」到「线上生效并验证」。模块内部结构见 [权限、角色与用户组](../modules/permissions.md)。

## 0. 先判断属于哪一类

| 你要做的事 | 改哪里 | 是否有迁移 |
|---|---|---|
| 给已有权限点换接口/换注解 | 对应 `*Api.java`、服务层 | 否 |
| 新增一个权限点 | `PermissionEnum` + 接口注解 + 前端 `can()` + 种子 + 迁移 | 是 |
| 只调整内置角色给哪些权限 | `init-mysql.sql` + 迁移脚本 | 是 |
| 只改菜单/按钮显示 | `router.tsx`、`BasicLayout.tsx`、页面组件 | 否 |
| 改数据可见范围 | `ProjectPartnerServiceImpl#getProjectPerms`、Mapper、`@EnableDataPerm` | 一般否 |

判断标准只有一句：**动作能不能造成数据外流或不可逆损失，就必须单独一个权限点**。历史上 `repo:export`、`project:publish`、`content:protect` 都是这么拆出来的。

## 1. 判定链（改之前先看一遍）

1. 前端菜单：`BasicLayout` 用 `can(authorities, perm)` 过滤。
2. 前端路由：`router.tsx` 的 `guard(perm)` 包 `RequirePerm`，数组表示「任一命中」。
3. 前端按钮：页面里逐项 `can()` 渲染，没权限的入口直接不出现。
4. 后端接口：`@PreAuthorize`，写操作一律「目标权限 or `hasRole('admin')`」。
5. 服务层二次校验：跨档位的动作（建用户、分配角色、组绑角色）在服务层再看一眼。
6. 数据范围：`@EnableDataPerm` + `t_project_partner` / `t_repo_partner` / `t_class_partner`。

权限串在**代码里定义**（`PermissionEnum`），在**库里授予**（`t_role.authority`）。两边不同步，就是「权限矩阵显示全勾选、接口仍 403」的根因。

## 2. 新增权限点（端到端）

### 2.1 起名

- 格式固定「域:对象:动作」，例：`class:member:update`、`system:user:create:teacher`。
- 动作词表尽量复用：`list/detail/create/update/delete/export/import/grant/publish/restore`；新动词要能说清是读还是写。
- 学员专属能力单独判断：只有「学员才该有、管理员不该有」的才标 `studentOnly`。

### 2.2 后端

1. 在 `server/shared/src/main/java/cn/surveyking/server/core/constant/PermissionEnum.java` 加条目：`code`、中文名、`Group`、一句话说明；学员专属加第五/第六个参数 `studentOnly=true`。
2. 给接口加注解，例如 `@PreAuthorize("hasAuthority('xxx:yyy') or hasRole('admin')")`；一个动作有多个等价权限时用 `hasAnyAuthority`。
3. 如果这是「同一入口、不同档位」，在服务层再校验一次（参考 `UserServiceImpl#assertRoleGrantScope`）。
4. 确认 `Group` 选对：它只影响权限矩阵的卡片顺序，不参与鉴权；选错会让页面分组很怪。

### 2.3 前端

1. 页面里用 `can(authorities, 'xxx:yyy')` 判定，不要自己写 `startsWith` 前缀匹配（学员的 `repo:list` 会误放行 `repo:create`）。
2. 学员专属必须同时加进 `client/src/auth/permissions.ts` 的 `STUDENT_ONLY_PERMISSIONS`，与后端 `studentOnly` 逐条对应；漏加会让管理员重新看到学员入口。
3. 决定菜单的补 `client/src/pages/system/permissionPresets.ts` 的 `PERMISSION_MENU`（这是文档性映射，不控制显示）。
4. 决定页面入口的补 `router.tsx` 的 `guard`；决定菜单项的补 `BasicLayout`（移动端还有 `MobileTabBar`）。

### 2.4 数据库

1. 改 `server/rdbms/src/main/resources/scripts/init-mysql.sql` 里三个内置角色的 `authority`（**只对新库生效**）。
2. 新增 `scripts/nas/migrate/NN-xxx.sql`，给已有库补/删权限串，必须幂等（见第 5 节）。
3. 不要只改 `init-mysql.sql`：线上库不会重跑建库脚本，`AGENTS.md` 有明确红线。

### 2.5 文档与生成物

1. 更新 `docs/modules/permissions.md` 的矩阵、坑、验证。
2. `npm run docs:gen` 重新生成 `docs/reference/permissions.md`、`docs/reference/routes.md` 等。
3. `npm run docs:gen -- --check` 与 `npm run docs:check` 必须过；`npm run docs:mark -- module-permissions` 刷新 `last_verified`。

## 3. 调整内置角色

以 2026-11-09 那轮（`scripts/nas/migrate/23-permission-cleanup.sql`）为例，做法是：

1. 先写清目标口径：管理员 = 管理权限全集（学员专属不注入）、老师 33、学员 14。
2. 只对 `t_role.authority` 做**按 token 的追加/删除**：先 `CONCAT(',', authority, ',')`，再 `REPLACE(..., ',code,', ',')`，最后 `TRIM(BOTH ',' FROM ...)`。不要整串重写，历史脏串会被一起清掉。
3. 追加前判断 `NOT LIKE '%,code,%'`，保证重复执行不会加两遍。
4. 脚本末尾带 `SELECT` 自检：token 数、关键串是否存在。
5. 跑完后用三个账号实测关键接口（见第 6 节）。

当前线上口径（2026-11-09）：`admin` 71、`teacher` 33、`student`/`xueyuan` 14；老师保留 `project:delete`（仅自己创建/协作的考试），没有 `repo:create/update/delete`，`answer:delete` / `answer:restore` 已收回管理员。

## 4. 缓存与生效时机

| 缓存 | 位置 | TTL | 何时失效 |
|---|---|---|---|
| `userCache` | `UserServiceImpl#loadUserById` | 开发 1 小时 / 生产 1 天 | 角色增删改、用户增删改、组绑角色变更（`afterCommit` 清空/按 key 清） |
| `deptCache` | `DeptService#listDept` | 1 天 | 组增删改、角色改名/删除 |
| `projectPermissionCache` | `ProjectPartnerService#getProjectPerms`（key 是**用户 id**） | 10 分钟 | 协作者增删（`@CacheEvict`） |
| 前端模块缓存 | `client/src/auth/permissions.ts` 的 `cache` | 无（进程内） | 登录/登出调 `notifyAuthChanged()`，其它标签页靠 `storage` 事件 |

关键结论：

- **改完角色不需要重新登录**。每次请求 `JwtTokenFilter` 都会 `loadUserById`，缓存被清后下一个请求就是新权限。权限矩阵页那句「相关用户需重新登录才生效」是旧文案。
- 角色/组写操作都在事务内注册 `afterCommit` 再清缓存，避免并发读把旧值塞回去；绕过服务层直接 `UPDATE t_role` 则最多等一个 TTL。
- 前端缓存只在同一个登录态内复用；同标签页切换账号必须清，否则 `RequirePerm` 会拿上一个人的 `authorityList` 放行。

## 5. 迁移脚本写法（幂等模板）

```sql
-- ======
-- 权限 vN：一句话说明（幂等，可重复执行）
-- ======
SET NAMES utf8mb4;

-- 追加（只加不重）
UPDATE t_role
SET authority = CONCAT(authority, ',new:permission'),
    update_at = NOW()
WHERE code IN ('teacher') AND is_deleted = 0
  AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') NOT LIKE '%,new:permission,%';

-- 删除（按逗号边界，不会误伤 xxx:new:permission2）
UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',old:permission,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND CONCAT(',', authority, ',') LIKE '%,old:permission,%';

-- 自检
SELECT code, name,
       LENGTH(authority) - LENGTH(REPLACE(authority, ',', '')) + 1 AS token_count,
       (CONCAT(',', authority, ',') LIKE '%,new:permission,%') AS has_new
FROM t_role WHERE is_deleted = 0 ORDER BY code;
```

执行约定：

1. 先备份（`scripts/nas/backup-live.sh` 或手动 mysqldump），迁移前不要跳过。
2. 建库走 `scripts/nas/migrate/04-import.sh`（带空库闸门）；对已有库只执行单个脚本：`docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < NN-xxx.sql`。
3. 有风险的多语句脚本先 `START TRANSACTION` 试跑再 `ROLLBACK`，确认行数与 token 数符合预期再正式执行。
4. 脚本命名递增，已应用的脚本不要改内容，新变更另起编号。
5. 迁移只动 `t_role`（必要时 `t_dept_role` / `t_user_role`），不要顺手改结构；结构变更另起脚本并同步 `init-mysql.sql`。

## 6. 验证清单

```bash
# 1) 静态检查
cd client && npm run check
cd .. && npm run docs:gen -- --check && npm run docs:check

# 2) 角色点数
docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking -e "
  SELECT code, LENGTH(authority)-LENGTH(REPLACE(authority,',',''))+1 AS n
  FROM t_role WHERE is_deleted=0 ORDER BY n DESC;"
# 期望：admin 71 / teacher 33 / student(xueyuan) 14
```

账号探针（三个账号各拿一份 Cookie）：

| 检查 | 期望 |
|---|---|
| 管理员 `GET /api/currentUser` 的 `authorityList` | 71 条，且不含 `project:answer` / `repo:practice` / `repo:book` / `repo:questions:read` / `exercise:list` / `portal:student` |
| 老师 `POST /api/answer/delete` | 403 |
| 老师 `POST /api/project/delete`（自己的考试） | 200 |
| 老师 `GET /api/system/user/list` | 403 |
| 学员 `GET /api/currentUser` | 14 条，6 个学员专属全在 |
| 学员进入题库题目页 | `/api/template/list` 200（认 `repo:questions:read`）；`/api/repo/detail` 403 属正常，页面会静默兜底标题 |
| 权限矩阵页 `/system/permissions` | 角色卡显示对应点数；admin 卡片全勾选且禁用 |

另外看两条旁证：

- `GET /api/system/audit/list` 能看到刚才写操作的审计行（动作码如 `SYSTEM_ROLE_UPDATE`）。
- 被拒的请求返回 403 而不是 500；500 说明服务层抛了别的异常，别当成权限问题。

## 7. 常见错误

- **只加枚举、不改接口**：权限矩阵能勾，但没有任何接口消费它，属于「死权限」。
- **只改接口、不加枚举**：前端勾不到，管理员靠 `hasRole('admin')` 能进，其他人永远 403。
- **只改 `init-mysql.sql`**：线上已有库不会重跑，必须配迁移脚本。
- **迁移用整串重写**：会把 `t_role.authority` 里的历史前缀一起洗掉，后面排查对不上账。
- **迁移不幂等**：重复执行后 token 重复，权限点数虚高，权限矩阵看起来「多勾了」。
- **漏同步 `STUDENT_ONLY_PERMISSIONS`**：管理员界面又出现「开始答题/开始练习」。
- **把 `authorities: []` 当成「不改」**：空数组在后端是「收回全部权限」，只改角色名时不要带这个字段。
- **想改内置 admin 的权限**：前后端都会拒绝（`assertBuiltinAdminAuthorityKept`），管理员权限只能随 `PermissionEnum` 变。
- **以为要重新登录**：接口层下一个请求就生效；如果没生效，先查 `userCache` 是否清了、是否直接改的库。

## 8. 回滚

1. 角色权限：写反向脚本（把追加的串删掉、把删掉的串加回来），或从备份恢复 `t_role`。
2. 代码：`git revert` 对应提交后重新发布；注意权限点若已从枚举删除，前端会因找不到定义而回退到权限矩阵的旧状态。
3. 回滚后同样要清 `userCache`（重启应用最省事），否则最长一个 TTL 内仍是旧权限（生产 1 天）。

## 相关文档

- [权限、角色与用户组](../modules/permissions.md)
- [文件、附件与导入模板](../modules/files.md)
- [权限与角色审计 2026-11-08](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/ops/权限审计-2026-11-08.md)
- [权限设计基线（历史推导，部分已过期）](../modules/permissions.md)
- [用户·用户组·角色·权限的联动设计](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/archive/2026-11-permissions-ia.md)
- [NAS 开发工作流](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/ops/NAS-开发工作流.md)
