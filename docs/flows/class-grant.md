---
id: flow-class-grant
title: 建班、加学员、分配老师与数据可见范围
status: current
keywords:
  - 建班
  - 班级
  - 用户组
  - 学员
  - 分配老师
  - 数据范围
  - class:grant
  - system:dept:create
  - t_class_partner
source_globs:
  - client/src/pages/teaching/**
  - client/src/pages/system/GroupEntry.tsx
  - server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java
  - server/api/src/main/java/cn/surveyking/server/api/SystemApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/DeptServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/UserDeptScopeService.java
entrypoints:
  - client/src/pages/teaching/Classes.tsx
  - client/src/pages/teaching/ClassSettingsModal.tsx
  - server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java
apis:
  - POST /api/system/dept/create
  - POST /api/system/dept/update
  - POST /api/system/dept/delete
  - GET /api/system/dept/list
  - POST /api/teaching/classes/member/create
  - POST /api/teaching/classes/member/update
  - POST /api/teaching/classes/member/delete
  - GET /api/teaching/classes/teacher-options
  - POST /api/teaching/classes/partner/create
  - POST /api/teaching/classes/partner/delete
  - GET /api/teaching/classes/tree
  - GET /api/teaching/classes/members
tables:
  - t_dept
  - t_dept_role
  - t_user
  - t_user_dept
  - t_account
  - t_user_role
  - t_class_partner
  - t_repo_partner
  - t_project_partner
tests:
  - 'client:npx tsc --noEmit'
  - 'docs:npm run docs:check'
last_verified: '2026-11-09'
verified_against: '765fc89'
---

# 建班、加学员、分配老师与数据可见范围

## 目标

从零把一个班跑起来，并明确每一步「谁能做、写到哪张表、谁因此能看到什么」：

1. 管理员建班（`t_dept`，可绑角色、设有效期）。
2. 班主任/管理员在班里加学员（`t_user` + `t_account` + `t_user_role`）。
3. 管理员或持有 `class:grant` 的角色给老师分配班级查看权限（`t_class_partner`）。
4. 学员/老师各自能看到哪些班、哪些题库与考试，由「班级树可见范围」和「组授权」两套口径共同决定。

## 端到端步骤

### 1. 建班

- 入口：班级管理页右上角「新建班级」（可见条件：`system:dept:create`）。弹窗是 `ClassSettingsModal`。
- 请求：`POST /api/system/dept/create`，字段 `name`、`parentId`（可空，空表示根级）、`roleIds`（可空）、`validFrom`/`validTo`（可空，空表示永久）。
- 服务：`DeptServiceImpl.addDept` 补 `short_name`（等于名称，库里有 NOT NULL 约束）、按同级节点数写 `sort_code`、保存后调 `saveDeptRoles` 写 `t_dept_role`。非管理员绑角色时 `assertGrantableDeptRoles` 要求「待绑角色的权限是自己权限的子集」，且不能绑超级管理员角色。
- 缓存：写方法同时清 `deptCache` 与 `userCache`，组内成员的权限在下次鉴权时生效。

### 2. 加学员

- 入口：选中班级 →「添加学员」（`class:member:create`）。
- 请求：`POST /api/teaching/classes/member/create`，字段 `deptId`、`name`、`username`、`password`、可选 `phone`/`email`。
- 服务：`ClassServiceImpl.createClassMember` 先 `assertClassVisible(deptId)`，校验姓名/账号/初始密码必填、账号不重复；再调 `UserServiceImpl.createClassStudent`：
  - 角色固定为内置学员角色（`student`，兼容旧编码 `xueyuan`），请求里不接受角色；
  - `status` 直接置为有效，`user_type='student'`；
  - `assertClassDeptRoleSafe` 检查目标班及其祖先链绑定的角色，若存在权限高于学员角色的绑定，拒绝（防止班主任借建学员把高权限角色带进班）；
  - 写 `t_user`、`t_account`（密码加密）、`t_user_role`。
- 账号重复在并发下可能绕过前置查询，服务层用 `DuplicateKeyException` 兜底翻译成「登录账号已存在」。

### 3. 分配老师

- 入口：选中班级 →「分配老师」（`class:grant`）。老师默认没有这个权限，所以通常只有管理员能看到。
- 候选：`GET /api/teaching/classes/teacher-options`（`class:grant`），只列 `user_type='staff'`，按姓名排序、上限 200 条；前端 250ms 防抖做服务端搜索。
- 已授权列表：`GET /api/teaching/classes/teachers?deptId=`（`class:grant`），返回 `t_class_partner` 行 + 用户名/所属组。
- 授权：`POST /api/teaching/classes/partner/create`，`{ deptId, userIds }`；`addClassPartners` 校验班级存在、用户存在、去重后逐条插入 `t_class_partner`（`dept_id` + `user_id`）。
- 取消：`POST /api/teaching/classes/partner/delete`，`{ deptId, id }`；`ClassPartnerMapper.hardDelete` 物理删除（表上有 `(dept_id,user_id)` 唯一键，逻辑删除会挡住重新授权）。

### 4. 数据可见范围

班级树（`GET /api/teaching/classes/tree`，`class:list`）的可见集合取三档并集：

- **管理员 / `class:grant`**：全部班级（用于分配）。
- **班主任**：自己创建（`create_by`）或负责（`manager_id`）的班，**含其下级班**。
- **被授权老师**：`t_class_partner` 里的班，**含其下级班**。

树里会补出祖先节点保证路径可显示，补出来的节点 `accessible=false`（前端灰显、不可选）。成员/老师列表再用 `assertClassVisible` 逐班校验：本班或任一祖先班是自己创建/负责/被授权，才放行；因此「授权父班」自然覆盖子班。

题库/考试的组授权是另一条线，与班级成员关系无关：

- 题库：`t_repo_partner.dept_id`；
- 考试：`t_project_partner.group_id`；
- 两者都用 `UserDeptScopeService` 解析「主组（`t_user.dept_id`）+ 附加组（`t_user_dept`）+ 各自祖先链」，所以把新学员放进已授权的组，他自动继承该组的题库/考试可见性，不需要逐人再授权。

### 5. 退场

- **取消老师授权**：见上，物理删除 `t_class_partner` 行；老师随即看不到该班（含子班），但仍保留其功能权限。
- **删除学员**：`POST /api/teaching/classes/member/delete`（`class:member:delete`）→ `deleteClassStudent` 删除用户、登录账号、角色绑定、附加组；**账号不可恢复**。
- **删除班级**：`POST /api/system/dept/delete`（`system:dept:delete`）。有子分组或还有成员（主组 + 附加组）时直接拒绝；通过后逻辑删 `t_dept`，并清理 `t_user_dept`、`t_repo_partner`、`t_project_partner.group_id`、`t_class_partner`、`t_user_position`、`t_dept_role`。不删账号。

## 权限与数据范围

| 步骤 | 权限 | 数据范围 / 约束 |
|---|---|---|
| 建班、改班、删班 | `system:dept:create/update/delete` | 组织树；改组上级要防成环、非管理员不能挂到高权限祖先下 |
| 看班级树 | `class:list` | 自己创建/负责 + 被授权（含下级）；管理员与 `class:grant` 全量 |
| 看成员 | `class:detail` | 逐班校验，本班或祖先班可见即可 |
| 加/改/删学员 | `class:member:create/update/delete` | 自己可见的班，目标必须是该班学员 |
| 分配/取消老师 | `class:grant` 或管理员 | 全部班级 |
| 读组树（选组） | `system:dept:list` 或 `org:list` | 只读；老师靠 `org:list` 也能在题库/考试授权里选组 |
| 题库组授权 | `repo:grant`（服务层再限创建者/管理员） | 写入 `t_repo_partner.dept_id` |
| 考试组授权 | `project:partner`（服务层要求项目所有者） | 写入 `t_project_partner.group_id` |

## 坑与已知限制

- **建班、分配老师、加学员是三套权限**：`system:dept:create`、`class:grant`、`class:member:create` 互不包含。老师默认只有后者，所以「老师自己建班再分配老师」这条路走不通，实际流程是管理员建班/授权，老师维护班内学员。
- **「班主任」没有设置入口**：`t_dept.manager_id` 能决定可见范围，但班级设置弹窗没有「负责人」字段，只能改库或调 `/api/system/dept/update` 传 `managerId`。不设负责人时，班主任只能靠 `create_by`（谁建的班）或被授权来获得可见性。
- **删除班级的前置条件很容易踩**：有子班先删/移走子班；有成员先把成员转到别的班或删账号。`Classes.tsx` 里 `removeClass` 的注释写「成员会变成未分组」，与后端实际行为（拒绝删除）不符，以后端异常与 Popconfirm 文案为准。
- **删除学员 ≠ 移出班级**：`deleteClassStudent` 会删账号、角色、附加组，不能恢复；需要保留账号时只能改主组/附加组，而班级页目前没有「转班」按钮。
- **班级成员只在 `user_type='student'` 里找**：老师/职工即使被放进组，也不会出现在班级名单；他们由「用户管理」维护。
- **成员数按主组 + 附加组统计**：同一学员在两个组会各计一次、在两个班名单里各出现一次；「一个班多少人」要按去重后的用户理解。
- **组授权会放大到新成员**：给组授权题库/考试后，之后加进该组的学员自动可见；撤销组授权会影响组内所有人。授权前确认组里没有不该看的人。
- **组绑角色等于批量授权**：非管理员只能绑「自己权限子集」的角色，且不能绑 `ROLE_admin`；这条限制在 `saveDeptRoles` 与 `assertParentPlacementAllowed` 都做了，但管理员操作没有这层保护。
- **组有效期只在登录时校验**：过期后已登录的会话仍可继续访问，直到重新登录；不要让「有效期」承担实时封禁职责。
- **接口不校验老师候选类型**：`addClassPartners` 只校验用户存在，不要求 `staff`；页面候选只列教职工，直接调接口可以授权任意用户 id。
- **删除班级会丢授权**：`t_repo_partner` / `t_project_partner.group_id` 会随组删除被清掉；重建同名班不会恢复授权，需要重新授权。
- **密码规则文案过期**：后端实际只校验长度 `^.{8,32}$`（见 `UserAdminService` 的 `STRONG_PASSWORD_PATTERN`），但 i18n 文案仍写「8-16 位且包含大小写字母和数字」；接口提示以文案为准会误导，改校验时记得一起改文案。
- **旧用户组页仍可能存在**：只有 `system:dept:list`、没有 `class:list` 的角色访问 `/system/group` 会看到旧页面；两套界面操作同一棵树，排障时别以为是两份数据。

## 验证

```bash
cd client && npx tsc --noEmit
npm run docs:check
```

手工冒烟：

1. 管理员建「父班 / 子班」，把子班授权给老师 A；A 登录后只看到父班（灰）与子班（可选）。
2. 在子班加学员：重复账号、7 位密码应被拒；成功后学员能登录，且只看到被授权的题库/考试。
3. 给子班绑一个高权限角色，再由非管理员往该班加学员，应被拒（组角色提权保护）。
4. 删除还有成员的父班应失败；清空成员、删掉子班后成功，且相关 `t_class_partner` / `t_repo_partner` 记录消失。
5. 给班级授权一个题库后新增一名学员，该学员无需额外授权即可看到题库。

## 相关文档

- [班级与用户组](../modules/teaching.md)：班级树、成员、学情与权限细节。
- [题库与题目](../modules/repo.md)：题库组授权与可见性判断。
- [从题库组卷到考试](./repo-compose.md)：组卷与考试授权。
- [权限与角色](../modules/permissions.md)：`system:dept:*`、`class:*` 的现状。
