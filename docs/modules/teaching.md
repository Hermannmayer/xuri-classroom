---
id: module-teaching
title: 班级与教学工作台
status: current
keywords:
  - 班级
  - 用户组
  - 班主任
  - 分配老师
  - 班级成员
  - 学情
  - class:grant
  - t_dept
  - t_class_partner
source_globs:
  - client/src/pages/teaching/**
  - client/src/pages/system/GroupEntry.tsx
  - server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassStudentService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/DeptServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/TeachingMapper.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/ClassPartner.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/Dept.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ClassNodeView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ClassMemberView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/TeachingClassView.java
entrypoints:
  - client/src/pages/teaching/Classes.tsx
  - client/src/pages/teaching/ClassSettingsModal.tsx
  - client/src/pages/teaching/Workbench.tsx
  - server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java
apis:
  - GET /api/teaching/projects
  - GET /api/teaching/classes
  - GET /api/teaching/classes/tree
  - GET /api/teaching/classes/members
  - GET /api/teaching/classes/teachers
  - GET /api/teaching/classes/teacher-options
  - POST /api/teaching/classes/partner/create
  - POST /api/teaching/classes/partner/delete
  - POST /api/teaching/classes/member/create
  - POST /api/teaching/classes/member/update
  - POST /api/teaching/classes/member/delete
  - GET /api/system/dept/list
  - POST /api/system/dept/create
  - POST /api/system/dept/update
  - POST /api/system/dept/delete
tables:
  - t_dept
  - t_dept_role
  - t_class_partner
  - t_user
  - t_user_dept
  - t_project
  - t_answer
tests:
  - client:npx tsc --noEmit
  - docs:npm run docs:check
last_verified: 2026-11-09
verified_against: 6c14ecfdf35a6c2610f436152c616e25e525c5b6
---

# 班级与教学工作台

## 30 秒摘要

「班级」就是用户组（`t_dept`），不是另一张表：班级管理页和原「系统管理 → 用户组」维护的是同一棵树，v6 起前者成为唯一入口。这个模块负责班级树/成员名单、把班级查看权限分配给老师（`t_class_partner`）、班主任在自己班里建学员账号，以及老师视角的「班级学情」（按考试聚合每个班的交卷数与平均分）。它**不负责**权限点与角色（见 `PermissionEnum` / 权限模块），也**不负责**考试内容和答卷明细。后端入口是 `TeachingApi` 与 `ClassServiceImpl`；前端入口在 `client/src/pages/teaching/`。

## 什么时候看这篇

- 班主任登录后看不到自己的班，或看到「（上级）」灰节点却点不开。
- 「添加学员」报账号已存在、密码不合规，或提示不能把学员放进某个组。
- 想删除一个班级却被拒绝，提示「下面还有子分组」或「还有 N 个成员」。
- 「分配老师」按钮不出现，或老师反馈看不到被授权的班。
- 班级学情里某场考试/某个班不出现，或平均分与答卷页对不上。
- 侧栏的「用户组」菜单消失，或被重定向到班级管理。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 班级管理页 | `client/src/pages/teaching/Classes.tsx` | 左树右表：班级树、成员、添加/编辑/删除学员、分配老师、删除分组 |
| 班级设置弹窗 | `client/src/pages/teaching/ClassSettingsModal.tsx` | 新建/编辑班级：名称、上级、绑定角色、有效期；删除入口也在这里 |
| 教学工作台 | `client/src/pages/teaching/Workbench.tsx` | 「我的考试」+ 选中考试后的班级分布（交卷数/平均分） |
| 用户组兼容入口 | `client/src/pages/system/GroupEntry.tsx` | 有 `class:list` 时重定向到 `/teaching/classes`，否则渲染旧用户组页 |
| 班级接口 | `server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java` | 树、成员、老师、学情；每个方法都写了 `@PreAuthorize` |
| 班级实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java` | 可见范围、树组装、成员/老师授权、学员增删改 |
| 学情 SQL | `server/rdbms/src/main/java/cn/surveyking/server/mapper/TeachingMapper.java` | 两条只读聚合 SQL，不拉答卷内容 |
| 组织写操作 | `server/rdbms/src/main/java/cn/surveyking/server/impl/DeptServiceImpl.java` | 建组/改组/删组、组绑角色与缓存失效 |
| 学员账号 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ClassStudentService.java` | `createClassStudent`、`updateClassStudent`、`deleteClassStudent` |
| 组数据范围 | `server/rdbms/src/main/java/cn/surveyking/server/service/UserDeptScopeService.java` | 「主组 + 附加组 + 祖先链」的唯一解析出口 |
| 数据表 | `t_dept`、`t_dept_role`、`t_class_partner`、`t_user`、`t_user_dept`、`t_project`、`t_answer` | 班级、组角色、老师授权、成员、附加组、学情来源 |

## 关键流程

1. **班级树**：`Classes.tsx` 调 `GET /api/teaching/classes/tree`（`class:list`）。`ClassServiceImpl.listClassTree` 先取全部未删除的 `t_dept`，按 `visibleDeptIds` 算可见集合：管理员 / `class:grant` 看全部；其他人取「自己创建（`create_by`）或负责（`manager_id`）的班 + `t_class_partner` 里的班」，再把这些班的后代一起并入。随后 `withAncestors` 补祖先节点保证树有路径，`toNode` 写入成员数、负责人、组角色、有效期，`accessible` 标记该节点能否直接打开（补出来的祖先为 `false`，前端灰显且不可选）。
2. **班级成员**：`GET /api/teaching/classes/members?deptId=`（`class:detail`）→ `listClassMembers` 先 `assertClassVisible`，再只查 `user_type='student'`，条件是主组 `t_user.dept_id` 或附加组 `t_user_dept` 命中该班；回填登录账号与角色名。新增走 `POST /api/teaching/classes/member/create`（`class:member:create`）→ `createClassMember` 校验班级可见、姓名/账号/初始密码必填、账号不重复 → `UserServiceImpl.createClassStudent`：角色固定为内置学员角色（`student` 或 `xueyuan`）、状态置为有效、`user_type=student`，并通过 `assertClassDeptRoleSafe` 阻止把学员放进绑定了更高权限角色的组。编辑/删除同理，只允许 `student` 且必须属于当前班。
3. **分配老师**：`GET /api/teaching/classes/teachers?deptId=` 与 `teacher-options` 都要求 `class:grant`；新增走 `POST /api/teaching/classes/partner/create`，`addClassPartners` 校验班级存在、用户存在并去重后写入 `t_class_partner`；取消走 `/partner/delete`，`ClassPartnerMapper.hardDelete` 做物理删除（表上有 `(dept_id,user_id)` 唯一键，逻辑删除会挡住重新授权）。老师候选只列 `user_type='staff'`，服务端上限 200 条。
4. **班级设置**：`ClassSettingsModal` 直接调 `/api/system/dept/create`、`/update`、`/delete`（`system:dept:create/update/delete`）。`DeptServiceImpl.addDept` 补 `short_name`（库里有 NOT NULL 约束）并按兄弟节点数排 `sort_code`；`updateDept` 改上级时校验不成环、且非管理员不能把组挂到「绑定了更高权限角色」的祖先下；`deleteDept` 见「坑与已知限制」。
5. **班级学情**：`Workbench.tsx` 先调 `GET /api/teaching/projects`（`project:report`）→ `TeachingMapper.listMyProjects` 查「自己是所有者，或是 `type` 1/2 协作者」的考试，附带已交卷数与平均分；再调 `GET /api/teaching/classes?projectId=` → `listClasses` 按答卷人的主组 `t_user.dept_id` 聚合交卷数与平均分，空组显示「未分组」。

## 修改指南

### 改行为

1. 先分清是「谁能看到哪个班」（`ClassServiceImpl.visibleDeptIds`、`assertClassVisible`）还是「页面怎么展示」（`Classes.tsx` 的 `accessible`、`firstSelectable`）。两者的口径必须一致，否则会出现「树里有、点开 403」。
2. 改班级口径时同步检查三处：`listClassTree` 的可见集合、`assertClassVisible` 的祖先链授权、`UserDeptScopeService`（题库/考试授权用的组范围）。
3. 改学员增删改时，记住账号操作在 `UserServiceImpl`，班级校验在 `ClassServiceImpl`；不要把「移出班级」和「删除账号」混成一个动作。
4. 改学情 SQL 时只动 `TeachingMapper`，保持「只返回聚合、不回传答卷内容」的约定。

### 新增字段/接口

1. 班级节点字段：`Dept` → `ClassNodeView` → `ClassServiceImpl.toNode` → `Classes.tsx` 的 `ClassNode` interface。
2. 新接口：在 `TeachingApi` 加映射并选对权限（看班级用 `class:list/detail`，分配老师用 `class:grant`，成员写用 `class:member:*`）；服务层必须再调 `assertClassVisible`，不能只靠注解。
3. 改组织写操作：`DeptServiceImpl` 的四个写方法都带 `@Caching` 同时清 `deptCache` 与 `userCache`，新写方法别漏。
4. 最后更新本页 frontmatter 的 `source_globs`、`apis` 与 [class-grant](../flows/class-grant.md)。

## 权限与数据范围

| 动作 | 权限 | 数据范围 |
|---|---|---|
| 进入班级管理 | `class:list` | 自己创建/负责的班 + 被授权的班（含下级班）；管理员与 `class:grant` 看全部 |
| 查看班级成员 | `class:detail` | 逐班校验：本班或任一祖先班是自己创建/负责/被授权 |
| 查看已授权老师 | `class:grant` | 全部班级（用于分配） |
| 分配/取消老师 | `class:grant` 或管理员 | 全部班级；被授权老师获得该班及下级班的只读查看 |
| 新增学员 | `class:member:create` 或管理员 | 自己可见的班；角色固定为学员，不能指定角色 |
| 编辑/删除学员 | `class:member:update/delete` 或管理员 | 自己可见的班，且目标必须是该班学员 |
| 新建/修改/删除班级 | `system:dept:create/update/delete` | 组织树；删除还受子组/成员限制 |
| 班级学情 | `project:report`（页面还要求 `portal:teacher`） | 自己参与（所有者/协作者）的考试；接口本身不校验 `projectId` 归属 |

> 角色现状：管理员拥有 `class:*` 与 `system:dept:*`；老师只有 `class:list`、`class:detail`、`class:member:create/update/delete`，**没有** `class:grant` 与 `system:dept:*`。

## 坑与已知限制

- **班级 = 用户组**：`t_dept` 一棵树，两套界面已合并。有 `class:list` 的账号访问 `/system/group` 会重定向到 `/teaching/classes`；只有 `system:dept:list`、没有班级入口的角色才保留旧用户组页。
- **删除分组有三个前置条件**：没有子分组、没有成员（主组 `t_user.dept_id` 与附加组 `t_user_dept` 都算）、并且调用者有 `system:dept:delete`。删除是逻辑删 `t_dept`，同时清 `t_user_dept`、`t_repo_partner`、`t_project_partner.group_id`、`t_class_partner`、`t_user_position`、`t_dept_role`；**不会删除账号**。`Classes.tsx` 里 `removeClass` 的注释写「成员会变成未分组」，与后端当前行为不符，以 Popconfirm 文案和后端异常为准。
- **删除学员 = 删除账号**：`deleteClassStudent` 删用户、登录账号、角色绑定与附加组，不可恢复；它不是「把学员移出班级」。要保留账号只能改到别的组（目前班级页没有「转班」入口）。
- **老师默认没有建班/分配老师权限**：`新建班级`、`班级设置`、`删除分组` 需要 `system:dept:*`，`分配老师` 需要 `class:grant`；老师默认只有查看与被授权班内的学员维护。班级通常由管理员创建后再把老师加为负责人或授权该班。
- **负责人（`manager_id`）没有前端编辑入口**：班级设置弹窗只有名称、上级、角色、有效期；`ClassNodeView` 会显示负责人，但要设置只能直接改库或调 `/api/system/dept/update`（传 `managerId`）。因此「班主任看到自己的班」目前主要靠 `create_by` 或 `t_class_partner` 授权。
- **授权父班覆盖子班**：`assertClassVisible` 会沿祖先链找授权记录，所以给父班授权后，子班成员/老师也可见；树上补出的祖先节点 `accessible=false`，点它会 403。
- **成员数口径**：`countMembers` 统计主组 + 附加组，一个学员同时在两个组会在两个班各计一次；班级成员列表也会在两个班各出现一次。
- **班级只列学员**：`listClassMembers` 固定 `user_type='student'`，老师/职工在「用户管理」，不会混进班级名单。
- **`ClassMemberView` 的注释与实现不一致**：DTO 注释称「不返回手机号、邮箱」，实际字段与 `listClassMembers` 都返回 `phone/email`，成员表格也展示手机号；做数据脱敏时别被注释误导。
- **`addClassPartners` 不校验用户类型**：接口只校验用户存在，不要求 `staff`；候选列表只列教职工，但直接调接口可以授权任意用户 id。
- **学情按主组聚合**：`TeachingMapper.listClasses` 只用 `t_user.dept_id`，附加组与班级树层级不参与；学员换主组后历史答卷会算到新班，未交卷（`temp_save=1` 之外）不计入。
- **学情只认所有者/协作者**：`listMyProjects` 只按 `t_project_partner.user_id` 查 `type` 1/2，按班级组授权（`type=3`）或按组添加的协作者都不会出现在工作台。
- **`/api/teaching/classes` 不校验项目归属**：只要持有 `project:report`，传任意 `projectId` 都能拿到该考试的班级聚合（不含答卷明细）；这是当前的数据范围缺口。
- **组有效期只在登录时校验**：`UserServiceImpl.assertDeptValid` 在登录链路执行，`loadUserById` 未校验；组过期后已登录会话仍可继续用，直到重新登录。
- **`class:grant` 的人能看到全部班级**：`visibleDeptIds` 与 `listClassTeachers` 都对 `class:grant` 放行全量，用于分配；这不是「只能看自己负责的班」。

## 验证

```bash
cd client && npx tsc --noEmit
npm run docs:check
```

预期：类型检查通过，`docs:check` 对本模块无报错。

手工冒烟：

1. 管理员建「父班 → 子班」两级、给父班绑一个低权限角色，再把子班授权给老师 A；A 登录后树里能看到父班（灰）与子班（可点），能看子班成员。
2. 老师在子班添加学员：账号重复会被拒；密码少于 8 位会被拒；添加成功后学员能登录。
3. 给班级绑一个高权限角色，再由非管理员尝试往该班加学员，应被拒（组角色提权保护）。
4. 删除有成员的班级应失败并给出中文原因；清空成员、删除子班后再删才成功，且题库/考试授权记录一并消失。
5. 教学工作台能看到自己参与的考试；选一场已有人交卷的考试，班级分布的交卷数与答卷列表一致。

## 相关文档

- [题库与题目](./repo.md)：题库授权弹窗里的组树、按组授权的继承口径。
- [建班与授权](../flows/class-grant.md)：建班 → 加学员 → 分配老师 → 数据可见范围的完整链路。
- [权限与角色](./permissions.md)：`class:*`、`system:dept:*` 与角色现状。
- [功能范围](../architecture/scope.md)：班级/用户组在 v6 的合并说明。
- [文档入口](../start/docs-workflow.md)：按任务定位其他模块。
