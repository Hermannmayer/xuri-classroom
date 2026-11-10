---
id: flow-class-grant
title: 建班、加学员、分配老师、分配考试与数据可见范围
status: current
keywords:
  - 建班
  - 班级
  - 用户组
  - dept_type
  - 学员
  - 手机号账号
  - 分配老师
  - access_level
  - 班级资源
  - 按班窗口
  - 数据范围
  - 未分配 404
  - class:grant
  - t_class_resource
source_globs:
  - client/src/pages/teaching/**
  - client/src/pages/system/Group.tsx
  - client/src/pages/system/GroupEntry.tsx
  - server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java
  - server/api/src/main/java/cn/surveyking/server/api/SystemApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassStudentService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassStudentImportService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/DeptServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectAnswerValidator.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/UserDeptScopeService.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/Dept.java
entrypoints:
  - client/src/pages/teaching/Classes.tsx
  - client/src/pages/teaching/ClassSettingsModal.tsx
  - client/src/pages/teaching/ClassResourcesPanel.tsx
  - client/src/pages/teaching/ImportMembersModal.tsx
  - server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java
apis:
  - POST /api/teaching/classes/create
  - POST /api/teaching/classes/update
  - GET /api/teaching/classes/tree
  - GET /api/teaching/classes/members
  - POST /api/teaching/classes/member/create
  - POST /api/teaching/classes/member/update
  - POST /api/teaching/classes/member/delete
  - POST /api/teaching/classes/member/import
  - GET /api/teaching/classes/member/template
  - GET /api/teaching/classes/teacher-options
  - POST /api/teaching/classes/partner/create
  - POST /api/teaching/classes/partner/update
  - POST /api/teaching/classes/partner/delete
  - GET /api/teaching/classes/resources
  - POST /api/teaching/classes/resources/assign
  - POST /api/teaching/classes/resources/update
  - POST /api/teaching/classes/resources/delete
  - GET /api/system/dept/list
  - GET /api/system/dept/delete-check
  - POST /api/system/dept/delete
tables:
  - t_dept
  - t_dept_role
  - t_user
  - t_user_dept
  - t_account
  - t_user_role
  - t_class_partner
  - t_class_resource
  - t_project
  - t_answer
  - t_repo_partner
  - t_project_partner
tests:
  - 'client:npm run check'
  - 'docs:npm run docs:check'
last_verified: 2026-11-10
verified_against: 1057ec3ad2393c70b42ef96dedecc0bea1d0150e
---

# 建班、加学员、分配老师、分配考试与数据可见范围

## 目标

从零把一个班跑起来，并明确每一步「谁能做、写到哪张表、谁因此能看到什么」：

1. 老师或管理员建班（`t_dept.dept_type=class`，不绑角色）。
2. 班主任/可管理老师在班里加学员（`t_user` + `t_account` + `t_user_role`，手机号即登录账号）。
3. 管理员或持有 `class:grant` 的角色给老师分配班级权限（`t_class_partner.access_level`：1 只读 / 2 可管理）。
4. 可管理老师给班级分配考试/问卷并设置班级窗口（`t_class_resource`），全局 `examSetting` 是硬上限。
5. 学生只能看到并参加分配给自己班的考试；答卷落 `t_answer.class_id`。

## 端到端步骤

### 1. 建班

- 入口：班级管理页右上角「新建班级」（有 `class:list` 即显示）。弹窗是 `ClassSettingsModal`，只填名称、上级班级、有效期。
- 请求：`POST /api/teaching/classes/create`，字段 `name`、`parentId`（可空，空表示根级）、`validFrom`/`validTo`（可空，空表示永久）。
- 服务：`ClassServiceImpl#createClass` 强制 `deptType=class`、`roleIds=null`，再调 `DeptServiceImpl#addDept`：校验上级同类型、补 `short_name`（等于名称，库里有 NOT NULL 约束）、按同级节点数写 `sort_code`。
- 归属：`create_by` 由框架写当前用户，建完就能在自己的班级树里看到；老师不需要 `system:dept:create`。
- 改班：`POST /api/teaching/classes/update`，先 `assertClassManage`，只改名称/上级/有效期；类型固定 class，不能把班级改成用户组。
- 管理员仍可用 `/api/system/dept/create|update` 维护 `org` 用户组（可绑角色），但**删除班级**仍走 `/api/system/dept/delete`，要求 `system:dept:delete`。

### 2. 加学员（手机号即账号）

- 入口：选中班级 →「添加学员」（`class:member:create` + `assertClassManage`）。
- 请求：`POST /api/teaching/classes/member/create`，字段 `deptId`、`name`、`phone`、`password`、可选 `email`；`username` 字段已废弃，服务端忽略。
- 校验：姓名必填；手机号必填且匹配 `^1[3-9]\d{9}$`；初始密码必填（8~32 位）；手机号已存在时报「该手机号已被其他账号使用」。
- 服务：`ClassStudentService#createClassStudent` 强制 `username=phone`，写 `t_user`（`user_type=student`）、`t_account`（密码加密，`auth_account=phone`）、`t_user_role`（内置学员角色 `student`/`xueyuan`）；并通过 `assertClassDeptRoleSafe` 阻止把学员放进绑定了高权限角色的组（班级本身不应绑角色）。
- 编辑：`POST /api/teaching/classes/member/update`，手机号仍必填；手机号变化时先查重、再同步 `t_account.auth_account`，改完旧号不能登录、新号能登录。
- 删除：`POST /api/teaching/classes/member/delete` 删除账号（用户、账号、角色、附加组），不可恢复；不是「移出班级」。
- 账号重复在并发下可能绕过前置查询，服务层用 `DuplicateKeyException` 兜底翻译成统一手机号重复提示。

### 3. 分配老师（只读 / 可管理）

- 入口：选中班级 →「任课老师」（`class:grant` 或 admin）。老师默认没有 `class:grant`，通常只有管理员能看到。
- 候选：`GET /api/teaching/classes/teacher-options`，只列 `user_type='staff'`，按姓名排序、上限 200 条；前端 250ms 防抖做服务端搜索。
- 已授权列表：`GET /api/teaching/classes/teachers?deptId=`，返回 `t_class_partner` 行 + 用户名/所属组 + `accessLevel`。
- 授权：`POST /api/teaching/classes/partner/create`，`{ deptId, userIds, accessLevel? }`；`accessLevel` 缺省 1（只读）。对已存在的 `(dept_id,user_id)` 是 upsert：显式传级别才更新，不传保持原级别。
- 改级别：`POST /api/teaching/classes/partner/update`，`{ deptId, id, accessLevel }`；`id` 必须是这个班的授权记录，级别只能是 1/2。
- 取消：`POST /api/teaching/classes/partner/delete`，`{ deptId, id }`；`ClassPartnerMapper#hardDelete` 物理删除（表上有 `(dept_id,user_id)` 唯一键，逻辑删除会挡住重新授权）。
- 授权一个父班默认覆盖其全部下级班；`ClassNodeView.manageable` / `assertClassManage` 沿祖先链判断，只读授权能看不能改。

### 4. 分配考试/问卷到班级（P1）

- 入口：班级详情 →「考试与问卷」面板；只有 `manageable=true` 的班才渲染，后端 `list` 也 `assertManage`。
- 列表：`GET /api/teaching/classes/resources?deptId=&resourceType=project`，返回资源名/类型、班级窗口、全局窗口、开关状态、分配人、本班答卷数、`effectiveStatus`。
- 分配：`POST /api/teaching/classes/resources/assign`，`{ classId, resourceType:"project", resourceIds[], startAt?, endAt?, status? }`；按 `(class_id,resource_type,resource_id)` upsert，已存在时只更新窗口/开关，不改 `assignedBy`。
- 修改：`POST /api/teaching/classes/resources/update`，`{ id, startAt?, endAt?, status? }`；窗口传 null = 回退继承全局。取消：`/resources/delete` 传 `{ id }`，物理删除。
- 窗口：项目 `ProjectSetting.examSetting.startTime/endTime` 是全局窗口，也是硬上限；班级窗口为空 = 继承全局，非空必须落在全局窗口内（全局未设则不限制）。时间用 epoch 毫秒。
- 状态：`status=0` 手动关闭；学生侧有效状态由「班级开关 + 项目发布状态 + 班级/全局窗口」算出 `CLOSED / NOT_STARTED / OPEN / ENDED`。
- P1 只支持 `project`；题库 `repo` 的班级窗口留 P2。

### 5. 学生按班进入

- 列表：`GET /api/project/list` 的可见性在原有 `t_project_partner`（本人/组协作者）之外，新增 `t_class_resource` EXISTS：本班（主组 + 附加组 + 祖先链）有这场考试的分配就可见。
- 打开/交卷：`ProjectAnswerValidator#validateProject` 与 `validateAnswerGate` 都调 `ClassResourceService#assertStudentCanAnswer`——没分配给学生所在班 → `ProjectNotFound`（404，不泄露标题）；未开始 → `ExamUnStarted`；已结束 → `ExamFinished`；手动关闭/项目停用 → `SurveySuspend`。匿名、staff、管理员不受班级分配限制；练习伪项目直接放行。
- 多班：学生同时在多个班时，任一班的分配有效即可参加；解析「答题时所在班级」时主班优先，其次按附加组绑定时间。
- 答卷：新建答卷时 `AnswerServiceImpl` 写 `t_answer.class_id`；更新答卷不改 `class_id`，换班后历史答卷仍算在原班。

### 6. 退场

- **取消老师授权**：`/partner/delete` 物理删除 `t_class_partner` 行；老师随即看不到该班（含子班），但仍保留其功能权限。
- **删除学员**：`POST /api/teaching/classes/member/delete` → `deleteClassStudent` 删除用户、登录账号、角色绑定、附加组；**账号不可恢复**。
- **删除班级/用户组**：`POST /api/system/dept/delete`（`system:dept:delete`），body `{ id, memberAction: "MOVE"|"UNASSIGN", moveToDeptId? }`。
  - 先 `GET /api/system/dept/delete-check?id=` 预检：子组、主组/附加组成员数、成员姓名（最多 10）、`lastDept`（同类型是否只剩一个）。
  - 有子组直接拒绝；有成员必须显式选择：`UNASSIGN` 把主组 `t_user.dept_id` 置 NULL（账号仍可登录），`MOVE` 迁到同类型目标节点（班级只能迁班级、用户组只能迁用户组；目标不能是自己/子孙；非管理员还要能授予目标链角色）。
  - 删除会清 `t_user_dept`、`t_repo_partner`、`t_project_partner.group_id`、`t_class_partner`、`t_class_resource`、`t_user_position`、`t_dept_role`，最后逻辑删 `t_dept`；不删账号。
  - 三个入口（班级管理页、班级设置弹窗、用户组页）统一用 `DeleteDeptDialog`；迁移目标只列同类型节点。

## 权限与数据范围

| 步骤 | 权限 | 数据范围 / 约束 |
|---|---|---|
| 新建班级 | `class:list` 或 admin | 建完是自己创建的班 |
| 修改班级 | `class:list` + `assertClassManage` | 本班/祖先班自己创建/负责，或有 access_level=2 授权 |
| 看班级树 | `class:list` | 自己创建/负责 + 被授权（含下级）；管理员与 `class:grant` 全量 |
| 看成员 | `class:detail` | 逐班校验，本班或祖先班可见即可 |
| 加/改/删学员、导入 | `class:member:create/update/delete` + `assertClassManage` | 只读授权 403「你对该班级只有查看权限，不能修改」 |
| 下载学员模板 | `class:member:create` 或 admin | 固定 classpath 模板 |
| 分配/改级别/取消老师 | `class:grant` 或管理员 | 全部班级；级别 1 只读 / 2 可管理 |
| 查看/写班级资源 | `class:list` + `assertClassManage` | 只有可管理该班的人能看面板与写入 |
| 删除班级/用户组 | `system:dept:delete`（或 admin） | 有子组先处理；成员 MOVE/UNASSIGN |
| 读组树（选组） | `system:dept:list` 或 `org:list` | 只读；传 `deptType=org/class` 过滤 |
| 题库组授权 | `repo:grant`（服务层再限创建者/管理员） | 写 `t_repo_partner.dept_id` |
| 考试组授权 | `project:partner`（服务层要求项目所有者） | 写 `t_project_partner.group_id` |
| 学生参加考试 | 无额外权限（有 `project:answer`） | 必须被分到学生所在班；窗口/状态校验 |

> 角色现状：管理员拥有 `class:*` 与 `system:dept:*`；老师有 `class:list`、`class:detail`、`class:member:*`，没有 `class:grant` 与 `system:dept:*`——老师能建班、管自己班的学员，但不能分配老师或删除班级。

## 坑与已知限制

- **P1 只做考试/问卷**：`t_class_resource.resource_type` 目前只接受 `project`；题库班级窗口是 P2，传 `repo` 会报「暂只支持考试/问卷」。
- **未分配学生 404**：列表不出现、直接打接口/链接按 `ProjectNotFound` 处理，不泄露标题；不是 403。未开始/已结束/关闭分别是 `ExamUnStarted` / `ExamFinished` / `SurveySuspend`。
- **班级分配只约束 student**：匿名公开问卷、staff、管理员走原逻辑；练习/错题本伪项目不参与班级分配。
- **班级资源面板的答卷数只统计新答卷**：按 `t_answer.class_id + temp_save=1` 计数；上线前的历史答卷 `class_id` 为 NULL，不会计入。
- **项目列表的班级可见性不按窗口/开关过滤**：只要有一行 `t_class_resource`，项目仍可能出现在学生列表里，打开时才报错；要隐藏得在 SQL 里补窗口/状态条件。
- **分配资源不校验调用者对项目的可见性**：`ClassResourceService#assign` 只校验班级可管理、项目存在且不是文件夹；拿到 `projectId` 就能分配给自己的班（P1 服务端缺口）。
- **只读老师看不到资源面板**：面板只在 `manageable=true` 时渲染，后端 `list` 也 `assertManage`；只读授权只能看成员/学情。
- **删除文案仍写「用户组」**：`DeleteDeptDialog` 被班级页复用，标题/提示未区分类型；`lastDept` 后端按同类型计算，前端提示仍写「最后一个用户组」。
- **老师能建班但不能删班**：删除按钮只按 `system:dept:delete` 显示，老师默认没有该权限。
- **班级不绑角色是页面约定**：`createClass/updateClass` 会置空 `roleIds`，但管理员直接调 `/api/system/dept/update` 仍可给 class 写 `t_dept_role`。
- **历史数据按 org 解释**：`dept_type` 为空的老节点按用户组处理；存量学员如果还在 org 组，会因为没有班级分配而看不到按班考试，需要先迁到 class 班。
- **删除班级会丢授权**：`t_repo_partner` / `t_project_partner.group_id` / `t_class_resource` 会随班删除被清掉；重建同名班不会恢复授权。
- **负责人（manager_id）没有前端编辑入口**：只能改库或调 `/api/system/dept/update`；「班主任看到自己的班」主要靠 `create_by`、`manager_id` 或 `t_class_partner`。
- **成员数按主组 + 附加组统计**：同一学员在两个班会各计一次、在两个班名单里各出现一次。
- **学情仍按主组聚合**：`TeachingMapper#listClasses` 只用 `t_user.dept_id`，不读 `t_answer.class_id`；换班后历史答卷算到新班。
- **添加老师不校验用户类型**：`addClassPartners` 只校验用户存在，不要求 `staff`；页面候选只列教职工，直接调接口可以授权任意用户 id。
- **导入模板必须带 sharedStrings**：学员模板用 XlsxWriter 生成；fastexcel 读不到 `xl/sharedStrings.xml` 会解析失败。模板列为姓名/手机号/初始密码/邮箱，任一行失败整批回滚。
- **密码规则文案过期**：后端实际只校验长度 8~32，但 i18n 文案仍写「8-16 位且包含大小写字母和数字」；接口提示以实际校验为准。

## 验证

```bash
cd client && npm run check
npm run docs:check
```

手工冒烟：

1. 老师（只有 `class:list`）建一个班，刷新后树里能看到；用户组页看不到这个班。
2. 在班里添加学员：手机号格式错/重复手机号应被拒；成功后学员用手机号登录；改号后旧号失效、新号可登录。
3. 下载学员模板，填一行合法、一行手机号重复：导入整批失败并提示「第 N 行：该手机号已被其他账号使用」；修正后导入成功。
4. 管理员给老师授权只读：老师能看成员但不能添加/导入；改成可管理后能添加/导入。
5. 给班级分配一场考试并设置班级窗口：该班学生能在考试列表看到；未分配该班的学生打开链接 404；窗口未开始/已结束提示对应错误。
6. 删除一个有成员的班：`delete-check` 能看到成员；UNASSIGN 后学员变未分组仍可登录；MOVE 只能选同类型班级，删除后 `t_class_resource` 无孤儿行。
7. 学生交卷后查 `t_answer.class_id` 是否等于其主班（主班无有效分配时才取其它班）。

## 相关文档

- [班级与用户组](../modules/teaching.md)：班级树、成员、资源、授权级别与权限细节。
- [考试与问卷（项目）](../modules/project.md)：项目列表可见性与按班准入。
- [答卷、判分与报表](../modules/answer.md)：`t_answer.class_id` 与统计口径。
- [题库与题目](../modules/repo.md)：题库组授权与可见性判断。
- [从题库组卷到考试](./repo-compose.md)：组卷与考试授权。
- [权限、角色与用户组](../modules/permissions.md)：`class:*`、`system:dept:*` 与 org/class 分离。
