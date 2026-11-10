---
id: module-teaching
title: 班级与教学工作台
status: current
keywords:
  - 班级
  - 用户组
  - dept_type
  - 班级资源
  - 题库分配
  - 按班窗口
  - 题库窗口
  - access_level
  - 分配老师
  - 学员导入
  - 手机号账号
  - 学情
  - class:grant
  - t_dept
  - t_class_partner
  - t_class_resource
source_globs:
  - client/src/pages/teaching/**
  - client/src/pages/system/Group.tsx
  - client/src/pages/system/GroupEntry.tsx
  - client/src/pages/system/User.tsx
  - server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java
  - server/api/src/main/java/cn/surveyking/server/api/SystemApi.java
  - server/shared/src/main/java/cn/surveyking/server/service/ClassService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassStudentService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassStudentImportService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/DeptServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/TemplateServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RepoPartnerServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/TeachingMapper.java
  - server/rdbms/src/main/resources/mapper/TeachingMapper.xml
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/ClassPartner.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/ClassResource.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/Dept.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ClassNodeView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ClassMemberView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ClassTeacherView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ClassResourceView.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/ExcelImportSecurity.java
entrypoints:
  - client/src/pages/teaching/Classes.tsx
  - client/src/pages/teaching/ClassSettingsModal.tsx
  - client/src/pages/teaching/ClassResourcesPanel.tsx
  - client/src/pages/teaching/ImportMembersModal.tsx
  - client/src/pages/teaching/DeleteDeptDialog.tsx
  - client/src/pages/teaching/Workbench.tsx
  - server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java
apis:
  - GET /api/teaching/projects
  - GET /api/teaching/classes
  - GET /api/teaching/classes/tree
  - POST /api/teaching/classes/create
  - POST /api/teaching/classes/update
  - GET /api/teaching/classes/resources
  - POST /api/teaching/classes/resources/assign
  - POST /api/teaching/classes/resources/update
  - POST /api/teaching/classes/resources/delete
  - GET /api/teaching/classes/members
  - POST /api/teaching/classes/member/create
  - POST /api/teaching/classes/member/update
  - POST /api/teaching/classes/member/delete
  - POST /api/teaching/classes/member/import
  - GET /api/teaching/classes/member/template
  - GET /api/teaching/classes/teachers
  - GET /api/teaching/classes/teacher-options
  - POST /api/teaching/classes/partner/create
  - POST /api/teaching/classes/partner/update
  - POST /api/teaching/classes/partner/delete
  - GET /api/system/dept/list
  - GET /api/system/dept/delete-check
  - POST /api/system/dept/delete
tables:
  - t_dept
  - t_dept_role
  - t_class_partner
  - t_class_resource
  - t_user
  - t_user_dept
  - t_account
  - t_user_role
  - t_project
  - t_repo
  - t_answer
tests:
  - client:npm run check
  - docs:npm run docs:check
last_verified: 2026-11-10
verified_against: a14784b16e026ee8f8e48f9876533b98e5623806
---

# 班级与教学工作台

## 30 秒摘要

「班级」不是独立的表，而是 `t_dept` 里 `dept_type=class` 的节点；同一个组织树里的 `dept_type=org` 节点是「用户组」，用于教职工组织与角色绑定。两者用途严格分开：**用户组（org）只放 staff、可绑角色；班级（class）只放 student、不绑角色**。这个模块负责班级树/成员、任课老师与授权级别（`t_class_partner.access_level`）、按班级分配考试/问卷及开放窗口（`t_class_resource`）、学员手机号账号与 Excel 批量导入，以及老师视角的「班级学情」。它**不负责**权限点与角色定义（见 [permissions](./permissions.md)），也不负责考试内容、答卷明细与按班窗口的具体校验（分别在 [project](./project.md)、[answer](./answer.md)、[survey](./survey.md)）。

## 什么时候看这篇

- 班级树看不到自己建的班，或用户组页里混进了班级。
- 老师要自己建班/改班；或「班级设置」里找不到角色绑定。
- 添加学员提示「请填写手机号 / 手机号格式不正确 / 该手机号已被其他账号使用」。
- 批量导入学员报「第 N 行：……」或模板打不开、导入解析失败。
- 任课老师只能看不能改，或「可管理」授权没有生效。
- 给班级分配考试/问卷后，学生看不到、提示页面不存在、未开始或已结束。
- 删除班级/用户组时不知道成员会去哪，或「最后一个组」仍然删不掉。
- 班级学情/答卷数与预期对不上。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 班级管理页 | `client/src/pages/teaching/Classes.tsx` | 左树右表：班级树、成员、任课老师、班级资源、删除分组；`class:list` 即可建班 |
| 班级设置弹窗 | `client/src/pages/teaching/ClassSettingsModal.tsx` | 新建/编辑只维护名称、上级、有效期；走 `/api/teaching/classes/create` / `update`，不再绑角色 |
| 班级资源面板 | `client/src/pages/teaching/ClassResourcesPanel.tsx` | 给本班分配考试/问卷、设置班级窗口与开关；只有 `manageable=true` 的班才渲染 |
| 学员导入 | `client/src/pages/teaching/ImportMembersModal.tsx` | 下载 `学员导入模板.xlsx`、上传 xlsx 批量建号；逐行报错 |
| 统一删除弹窗 | `client/src/pages/teaching/DeleteDeptDialog.tsx` | 三个入口共用：先 `delete-check`，有成员时二选一 MOVE / UNASSIGN |
| 用户组页 | `client/src/pages/system/Group.tsx`、`GroupEntry.tsx` | 只维护 `dept_type=org` 的教职工组；入口不再重定向到班级页 |
| 教学工作台 | `client/src/pages/teaching/Workbench.tsx` | 「我的考试」+ 按班分布的交卷数与平均分 |
| 班级接口 | `server/api/src/main/java/cn/surveyking/server/api/TeachingApi.java` | 树、建班/改班、成员、导入、老师授权、班级资源；每方法都有 `@PreAuthorize` |
| 班级实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ClassServiceImpl.java` | 可见范围、树组装、建班/改班、成员/老师授权、`assertClassManage` |
| 班级资源 | `server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java` | `t_class_resource` 的增删改查、窗口/状态校验、学生可参加性判定 |
| 学员账号 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ClassStudentService.java` | 建号/改号/删除学员；手机号即登录账号，改号同步 `t_account.auth_account` |
| 批量导入 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ClassStudentImportService.java` | 解析 xlsx、逐行校验、整批事务；行错误统一「第 N 行：原因」 |
| 组织写操作 | `server/rdbms/src/main/java/cn/surveyking/server/impl/DeptServiceImpl.java` | 用户组/班级共用 `t_dept` 写路径；`dept_type` 校验、删除预检与成员迁移 |
| 学情 SQL | `server/rdbms/src/main/java/cn/surveyking/server/mapper/TeachingMapper.java` | 两条只读聚合 SQL，不拉答卷内容 |
| 组数据范围 | `server/rdbms/src/main/java/cn/surveyking/server/service/UserDeptScopeService.java` | 「主组 + 附加组 + 祖先链」的唯一解析出口 |
| 数据表 | `t_dept`、`t_dept_role`、`t_class_partner`、`t_class_resource`、`t_user`、`t_user_dept`、`t_account`、`t_user_role`、`t_project`、`t_answer` | 组织树、组角色、老师授权、班级资源、成员、账号、项目与答卷 |

## 关键流程

### 1. 两类组织节点：用户组（org）与班级（class）

1. `t_dept.dept_type` 取值 `org` / `class`，默认 `org`；历史数据为空时一律按 `org` 解释（`DeptServiceImpl#deptTypeOf`）。
2. `GET /api/system/dept/list?deptType=org|class` 按类型筛选；不带参数仍是全量组织树（保留原缓存语义）。用户组页只请求 `org`，班级树/班级页只请求 `class`。
3. 新建节点时 `DeptServiceImpl#addDept` 规范化类型并校验「上级必须同类型」；`updateDept` 不允许修改 `deptType`，只有真的换上级时才校验父节点类型。
4. 成员类型也被卡住：`UserAdminService` 对 staff 只接受 `org` 主组/附加组，对 student 只接受 `class`，消息分别是「教职工只能加入用户组（org）」「学员只能加入班级（class）」。

### 2. 老师建班 / 改班

1. 新建班级：班级管理页「新建班级」（有 `class:list` 即显示）→ `POST /api/teaching/classes/create` → `ClassServiceImpl#createClass`。
2. 服务端强制 `deptType=class`、`roleIds=null`，写库复用 `DeptServiceImpl#addDept`（补 `short_name`、同级排序、清 `deptCache`/`userCache`）；`create_by` 由框架写当前用户，所以建完就能在自己的班级树里看到。
3. 修改班级：`POST /api/teaching/classes/update`，先 `assertClassManage`；只改名称、上级、有效期，类型固定 `class`，角色字段被置空。
4. 管理员仍可用 `/api/system/dept/create|update` 维护 `org` 用户组；**删除班级仍要求 `system:dept:delete`**，老师即使能建班，默认也删不了班。
5. 权限口径：两个 teaching 接口的注解都是 `class:list or admin`，真正的写权限在 `assertClassManage`（见第 5 节）。

### 3. 班级树与成员

1. `GET /api/teaching/classes/tree`（`class:list`）只查 `dept_type=class`。可见集合 = 管理员 / `class:grant` 全量；其他人 = 自己创建/负责的班 + `t_class_partner` 授权的班，再向下展开全部子班，最后补祖先节点保证树有路径。
2. 节点上的 `accessible=false` 表示只是补出来的路径祖先（点开会 403）；`manageable` 表示当前用户能不能改这个班（见第 5 节）。
3. `GET /api/teaching/classes/members?deptId=`（`class:detail`）先 `assertClassVisible`，再只查 `user_type='student'`，条件是主组 `t_user.dept_id` 或附加组 `t_user_dept` 命中该班；回填登录账号（`t_account`）、手机号、邮箱、角色名。
4. 成员数按「主组 + 附加组」统计，同一学员同时在两个班会在两个班各出现一次。

### 4. 学员账号 = 手机号 / 批量导入

1. 新增学员：`POST /api/teaching/classes/member/create`（`class:member:create`），先 `assertClassManage`；姓名、手机号、初始密码必填，手机号必须匹配 `^1[3-9]\d{9}$`。
2. 服务端强制 `username = phone`（请求里的 `username` 字段已废弃、一律忽略），写 `t_user`（`user_type=student`）、`t_account`（密码加密，账号=手机号）、`t_user_role`（内置学员角色 `student`/`xueyuan`）。
3. 编辑学员：手机号必填；手机号变化时先做唯一性校验，再同步 `t_account.auth_account`，否则学员还能用旧号登录。重复手机号统一提示「该手机号已被其他账号使用」。
4. 批量导入：`POST /api/teaching/classes/member/import`（multipart：`deptId` + `file`，权限 `class:member:create` 或 admin，服务层再 `assertClassManage`）。模板由 `GET /api/teaching/classes/member/template` 下载。
5. 模板格式：第一行表头，数据列依次为 **姓名（必填）、手机号（必填，登录账号）、初始密码（可空，默认 `12345678`）、邮箱（可空）**；密码 8~32 位；手机号在文件内/库里都不能重复。任一行失败整批回滚，异常是「第 N 行：原因」。
6. 导入前先过 `ExcelImportSecurity`：文件 ≤20MB、解压后 ≤100MB、条目 ≤1000、行数 ≤20000、列数 ≤500、单元格 ≤32767 字符；文件损坏/非 xlsx 统一提示「Excel 文件解析失败，请确认使用模板且文件未损坏」。

### 5. 任课老师与授权级别（access_level）

1. 分配老师：`POST /api/teaching/classes/partner/create`（`class:grant` 或 admin），body `{deptId, userIds, accessLevel?}`；`accessLevel` 缺省 1（只读）。
2. 对已存在的 `(dept_id,user_id)` 是 upsert：显式传 `accessLevel` 时更新级别；不传则保持原级别，避免老客户端把「可管理」降成只读。
3. 单独改级别：`POST /api/teaching/classes/partner/update`，body `{deptId, id, accessLevel}`；`id` 必须是这个班的授权记录，否则拒绝。级别只接受 1（只读）/2（可管理）。
4. 查看：`GET /api/teaching/classes/teachers`（`class:grant`）返回 `ClassTeacherView`，含 `accessLevel`；`GET /api/teaching/classes/teacher-options` 只列 `user_type='staff'`，上限 200。
5. `manageable` 判定（`ClassServiceImpl#assertClassManage` 与树上的 `ClassNodeView.manageable` 同一口径）：管理员 / `class:grant`；本班或任一祖先班是自己创建/负责；本班或任一祖先班有 `access_level=2` 的授权。只读授权能看成员，但成员写操作会返回 403「你对该班级只有查看权限，不能修改」。
6. 成员新建、编辑、删除、批量导入以及班级资源写操作都走 `assertClassManage`；查看成员仍只要求 `class:detail`。授权一个父班，默认覆盖其全部下级班。

### 6. 班级资源：按班级分配考试/问卷与题库

1. 入口：班级详情 →「考试与问卷 / 题库」面板（只有 `manageable=true` 才渲染，后端 `list` 也要求 `assertManage`）。
2. 面板顶部 `Segmented` 切换资源类型：`project`（考试/问卷）与 `repo`（题库）。切换时分别请求 `GET /api/teaching/classes/resources?deptId=&resourceType=project|repo`；添加弹窗的候选项分别来自 `/api/project/list` 与 `/api/repo/list?current=1&pageSize=200`。
3. 列表行是 `ClassResourceView`：
   - project：资源名/类型、班级窗口、**项目全局窗口**、状态、分配人、本班答卷数、`effectiveStatus`；
   - repo：资源名/题库类型、班级窗口、**全局窗口为 null（前端显示「不限」）**、状态、分配人、`answerCount=0`（前端显示「—」）、`effectiveStatus` 只看班级开关 + 本班窗口。
4. 分配：`POST /api/teaching/classes/resources/assign`，body `{classId, resourceType:"project"|"repo", resourceIds[], startAt?, endAt?, status?}`；按 `(class_id, resource_type, resource_id)` upsert，已存在时只更新窗口与开关，不改 `assignedBy`。
5. 修改/取消：`/resources/update` 传 `{id,startAt?,endAt?,status?}`（`startAt/endAt` 传 null = 回退继承/不限）；`/resources/delete` 传 `{id}`，物理删除分配行。
6. 窗口规则：
   - project：`ProjectSetting.examSetting.startTime/endTime` 是**全局窗口，也是硬上限**；班级窗口为空表示继承全局，非空必须落在全局窗口内（全局未设置时不限制）；
   - repo：题库没有全局窗口，只校验「开始 ≤ 结束」，为空表示不限。
   - 时间统一用 epoch 毫秒传输。
7. 状态：`status=0` 手动关闭；project 的有效状态由「班级开关 + 项目发布状态 + 班级/全局窗口」计算，repo 只看「班级开关 + 本班窗口」。
8. 题库删除：`RepoServiceImpl.deleteRepo` 调 `ClassResourceService#removeByResource("repo", id)` 清掉该题库的 `t_class_resource` 行，避免孤儿分配；题库本身没有全局窗口，也不需要处理全局状态。

### 7. 学生按班进入：考试与题库

1. **考试列表**：项目列表可见性新增 `t_class_resource` EXISTS（`resource_id=项目`、`resource_type='project'`、`is_deleted=0`、`class_id` 命中主组/附加组/祖先链）；未分配到他所在班的考试不出现在列表里。
2. **考试打开/交卷**：`ProjectAnswerValidator` 还会再判一次（见 [project](./project.md)、[survey](./survey.md)）：没有分配 → `ProjectNotFound`（404）；班级/全局未开始 → `ExamUnStarted`；已结束 → `ExamFinished`；手动关闭或项目停用 → `SurveySuspend`。匿名、staff、管理员不受班级分配限制。
3. **题库列表**：`RepoServiceImpl#listRepo` 对非管理员增加 `t_class_resource` EXISTS（`resource_type='repo'`、`is_deleted=0`、`class_id` 命中主组/附加组/祖先链）；学生只要有 `repo:list`（或有 `exercise:list` 的练习分支）就能在题库列表看到本班被分配的题库。
4. **题库读题/模板**：`TemplateServiceImpl#isReadableRepo` 对班级分配放行，`/api/template/list` 接受 `repo:questions:read`（学员有），所以学生能看题库题目；`/api/repo/pick`（`repo:detail` 或 `repo:book`）也会经 `assertReadableRepo` 放行。
5. **题库练习入口**：旧 `PublicProjectLoader` 的练习入口走 `RepoPartnerServiceImpl#hasPracticePermission`，本轮也认班级分配；但要求题库 `isPractice=true`，普通题库仍只能通过组卷/考试使用。
6. **`/api/repo/detail` 仍需 `repo:detail`**：班级分配只放宽列表、模板读取、`/repo/pick` 与练习入口，**不绕过 Controller 的 `@PreAuthorize`**；学员没有 `repo:detail`，不要指望直接看题库详情。
7. **题库窗口差异**：题库列表只判断「有没有分配」，不判断状态/窗口；打开/练习时 `canStudentReadRepo` 才校验「班级开关 + 本班窗口」，关闭/未开始/已结束会返回 false（读接口 403，练习入口拒绝）。题库没有全局窗口，也不产生答卷。
8. **答卷班级**：新建答卷时 `AnswerServiceImpl` 调 `ClassResourceService#resolveForStudent` 写 `t_answer.class_id`（主班优先，主班没有有效分配时取任一有效班级）；更新答卷不改 `class_id`。匿名/教职工答卷为 NULL。
9. **资源面板答卷数**：只在 project 面板有意义（`t_answer` 中 `project_id + class_id + temp_save=1` 的条数，仅新答卷）；repo 面板恒为 0。

### 8. 班级学情（按答题时班级聚合）

`Workbench.tsx` 先 `GET /api/teaching/projects`（`project:report`）→ `TeachingMapper.listMyProjects` 查「自己是所有者，或 type 1/2 协作者」的考试，附带已交卷数与平均分；再 `GET /api/teaching/classes?projectId=` → `TeachingMapper.listClasses` 按 `COALESCE(a.class_id, u.dept_id, '')` 聚合：

- 新答卷优先用 `t_answer.class_id`（答题时所在班级），换班后历史答卷仍算在原班；
- 老数据 `class_id` 为空时回退 `t_user.dept_id`（当前主组）；
- `LEFT JOIN t_dept d ON d.id = COALESCE(a.class_id, u.dept_id)`；班级被删/找不到时 `d.name` 为空，显示「未分组」但 `deptId` 仍是原 id。
- `GROUP BY COALESCE(a.class_id, u.dept_id, ''), d.name` 与 SELECT 表达式一致（only_full_group_by 兼容）。

因此新数据下学情与班级资源面板的按班口径基本一致；老数据仍按当前主组回退，两个数字可能对不上。

## 修改指南

### 改班级 / 用户组行为

1. 先分清节点类型：org 的写路径在 `SystemApi#addOrg/updateOrg` + `DeptServiceImpl`；class 的写路径在 `TeachingApi#createClass/updateClass` + `ClassServiceImpl`，最终都落到 `DeptServiceImpl`。
2. 改类型/上级规则时同步 `DeptServiceImpl#normalizeDeptType`、`assertParentDeptType`、`UserAdminService#assertUserDeptTypes` 与前端两个页面（`Group.tsx` 只传 org，`ClassSettingsModal` 只传 class）。
3. 改可见/可管理口径时同步三处：`listClassTree` 的可见集合、`assertClassVisible`（查看）、`assertClassManage` / `manageableDeptIds`（写）。树上的 `accessible` / `manageable` 必须与接口判定一致。
4. 改班级成员字段：`User`/`Account` → `ClassMemberView` → `listClassMembers` → `Classes.tsx` 的成员表格；手机号同时是登录账号，别忘了 `t_account` 同步。

### 改班级资源 / 按班窗口

1. `t_class_resource` 的 DTO/接口在 `ClassResourceAssignRequest`、`ClassResourceUpdateRequest`、`ClassResourceDeleteRequest`、`ClassResourceView`；实现集中在 `ClassResourceService`。
2. 改窗口规则：project 看 `assertAssignable` / `effectiveStatus` / `invalidReason`；repo 看 `assertWindowOrder` / `repoEffectiveStatus` / `invalidRepoReason`。同时同步 `ProjectAnswerValidator` 的两处 `assertStudentCanAnswer`（考试打开与交卷）。
3. 扩展资源类型时：先确认 `ClassResource` 的 `TYPE_*`/常量与 `normalizeResourceType`，再在 `RepoServiceImpl#listRepo`/`assertReadableRepo`、`TemplateServiceImpl#isReadableRepo`、`RepoPartnerServiceImpl#hasPracticePermission`、前端 `ClassResourcesPanel` 里各补一条；不要只放开写入。
4. 改分配可见性时同时看 `ProjectServiceImpl#listProject`、`RepoServiceImpl#listRepo` 的 EXISTS 子查询与 `t_class_resource.is_deleted=0`；同一张表同时存 `project` 与 `repo`，SQL 必须带 `resource_type`。
5. 删除资源时清分配：project 走班级删除/资源表清理；repo 走 `RepoServiceImpl#deleteRepo` → `removeByResource("repo", id)`，新增资源删除路径别漏。

### 改导入 / 模板

1. 模板文件在 `server/api/src/main/resources/template/学员导入模板.xlsx`；列顺序改动必须同步 `ClassStudentImportService` 的 `COL_*`。
2. 模板必须带 `xl/sharedStrings.xml`（用 XlsxWriter 等生成）；fastexcel 读不到 sharedStrings 会解析失败。
3. 文件限制在 `ExcelImportSecurity`；改上限时同步前端提示与接口文档。

### 新增字段/接口

1. 班级节点字段：`Dept` → `ClassNodeView` → `ClassServiceImpl.toNode` → `Classes.tsx` 的 `ClassNode` interface。
2. 新接口：在 `TeachingApi` 加映射并选对权限（看班级 `class:list/detail`，分配老师 `class:grant`，成员写 `class:member:*`，资源写 `class:list` + 服务层 `assertManage`）；服务层必须再校验，不能只靠注解。
3. 改组织写操作：`DeptServiceImpl` 的四个写方法都带 `@Caching` 同时清 `deptCache` 与 `userCache`，新写方法别漏。
4. 最后更新本页 frontmatter 的 `source_globs`、`apis` 与 [class-grant](../flows/class-grant.md)。

## 权限与数据范围

| 动作 | 权限 | 数据范围 |
|---|---|---|
| 进入班级管理 | `class:list` | 自己创建/负责的班 + 被授权的班（含下级班）；管理员与 `class:grant` 看全部 |
| 新建班级 | `class:list` 或 admin | 任何人建完都是自己的班（`create_by`） |
| 修改班级 | `class:list` 或 admin + `assertClassManage` | 本班/祖先班是自己创建/负责，或有 `access_level=2` 授权 |
| 查看班级成员 | `class:detail` | 逐班校验：本班或任一祖先班是自己创建/负责/被授权 |
| 新增/编辑/删除学员 | `class:member:create/update/delete` + `assertClassManage` | 只读授权（`access_level=1`）会被 403 |
| 批量导入学员 | `class:member:create` + `assertClassManage` | 同上；整批事务 |
| 下载学员导入模板 | `class:member:create` 或 admin | 固定 classpath 模板 |
| 查看已授权老师 | `class:grant` | 全部班级（用于分配） |
| 分配/改级别/取消老师 | `class:grant` 或 admin | 全部班级；级别 1 只读 / 2 可管理 |
| 查看/分配/修改/取消班级资源 | `class:list` 或 admin + `assertClassManage` | 只有可管理该班的人能看面板与写入；支持 project 与 repo |
| 删除班级/用户组 | `system:dept:delete`（或 admin） | 组织树；有子组先处理；成员可 MOVE / UNASSIGN |
| 维护用户组（org） | `system:dept:create/update/delete` | 全局；org 可绑角色、放 staff |
| 班级学情 | `project:report`（页面还要求 `portal:teacher`） | 自己参与（所有者/协作者）的考试；接口本身不校验 `projectId` 归属 |

> 角色现状：管理员拥有 `class:*` 与 `system:dept:*`；老师有 `class:list`、`class:detail`、`class:member:create/update/delete`，**没有** `class:grant`、`system:dept:*`，所以老师能建班/管自己班，但不能分配老师或删除班级。

## 坑与已知限制

- **P2 支持考试/问卷 + 题库**：班级资源接受 `resourceType=project|repo`；题库没有全局窗口，P2 暂不做全局窗口。
- **未分配班级的学生看不到考试**：列表不出现，直接打接口/打开链接按 `ProjectNotFound`（404）处理，不泄露标题；未开始/已结束/关闭分别是 `ExamUnStarted` / `ExamFinished` / `SurveySuspend`。
- **题库未分配走 403 而不是 404**：题库读闸门是 `assertReadableRepo` / `isReadableRepo`，没分配时抛「无权限访问该题库」；与考试的 404 口径不同，排查时别混。
- **班级分配只约束 student**：匿名公开问卷、staff、管理员走原逻辑；练习/错题本伪项目（`ExerciseProjectTemplate.EXERCISE_PROJECT_ID`）直接放行，不参与班级分配；题库的班级分配也只对 student 生效（`canStudentReadRepo`）。
- **班级资源面板的答卷数只统计新答卷**：project 按 `t_answer.class_id + temp_save=1` 计数；上线前的历史答卷 `class_id` 为 NULL，不会计入；repo 面板恒为 0。
- **分配资源不校验调用者对资源的可见性**：`ClassResourceService#assign` 只校验班级可管理、资源存在且不是文件夹；拿到 `projectId`/`repoId` 就能分配给自己的班（P1/P2 服务端缺口，改时应在分配前复用可见性判定）。
- **项目/题库列表的班级可见性不按窗口/开关过滤**：只要有一行 `t_class_resource`（即使 `status=0`、已结束），资源仍可能出现在学生列表里，打开/练习时才报错；要隐藏得在 SQL 里补窗口/状态条件。
- **`/api/repo/detail` 仍需 `repo:detail`**：班级分配只放宽 `/api/repo/list`、`/api/template/list`、`/api/repo/pick` 与旧练习入口；学员没有 `repo:detail`，不能直接调详情。
- **题库窗口只在读闸门生效**：`canStudentReadRepo` 会校验班级开关/本班窗口，关闭/未开始/已结束时返回 false；列表 SQL 不做这层过滤。
- **`assertStudentCanAccessRepo` 目前没有调用方**：实际题库读闸门是 `canStudentReadRepo`（RepoServiceImpl/TemplateServiceImpl/RepoPartnerServiceImpl 各自调用），新增入口时不要以为它已经兜底。
- **只读老师看不到资源面板**：面板只在 `manageable=true` 时渲染，后端 `list` 也 `assertManage`；只读授权只能看成员/学情。
- **删除文案与类型**：`DeleteDeptDialog` 的标题/提示仍统一写「用户组」（班级也复用它），以弹窗里的实际名称与后端错误为准；`lastDept` 后端按**同类型**计算（org 与 class 各算一套），前端文案仍写「最后一个用户组」。
- **老师能建班但不能删班**：删除按钮只按 `system:dept:delete` 显示；老师默认没有该权限。要删班需要管理员，或给自定义角色加 `system:dept:delete`。
- **删除班级会清掉班级资源**：`DeptServiceImpl#deleteDept` 会 `hardDeleteByClassId` 清 `t_class_resource`，并清 `t_class_partner`、`t_repo_partner`、`t_project_partner.group_id`、`t_user_dept`、`t_user_position`、`t_dept_role`；不会删账号。
- **班级不绑角色只是页面约定**：`createClass/updateClass` 会把 `roleIds` 置空，但管理员直接调 `/api/system/dept/update` 仍可给 class 节点写 `t_dept_role`；不要把「班级无角色」当成数据库强约束。
- **历史数据按 org 解释**：`dept_type` 为空的老节点按用户组处理；存量学员如果还在 org 组里，会因为没有班级分配而看不到按班考试，需要先迁到 class 班。
- **负责人（`manager_id`）没有前端编辑入口**：`ClassSettingsModal` 只有名称、上级、有效期；「班主任看到自己的班」主要靠 `create_by`、`manager_id`（改库/接口）或 `t_class_partner` 授权。
- **授权父班覆盖子班**：`assertClassVisible` / `assertClassManage` 都沿祖先链判断，授权/负责一个父班等于覆盖全部下级班。
- **成员数口径**：`countMembers` 统计主组 + 附加组，一个学员同时在两个班会在两个班各计一次；班级成员列表也会在两个班各出现一次。
- **班级只列学员**：`listClassMembers` 固定 `user_type='student'`，老师/职工在「用户管理」，不会混进班级名单。
- **学情新数据按答题班级、老数据回退主组**：`TeachingMapper.listClasses` 用 `COALESCE(a.class_id, u.dept_id, '')` 聚合；新答卷按答题时班级，老数据（`class_id` 为空）回退当前主组，换班后老答卷会算到新班；班级已删时 `d.name` 为空显示「未分组」。
- **学情只认所有者/协作者**：`listMyProjects` 只按 `t_project_partner.user_id` 查 `type` 1/2，按班级组授权（`type=3`）或按组添加的协作者不会出现在工作台。
- **`/api/teaching/classes` 不校验项目归属**：只要持有 `project:report`，传任意 `projectId` 都能拿到该考试的班级聚合（不含答卷明细）。
- **添加老师不校验用户类型**：`addClassPartners` 只校验用户存在，不要求 `staff`；候选列表只列教职工，直接调接口可以授权任意用户 id。
- **组有效期只在登录时校验**：`UserDeptMembershipService#assertDeptValid` 在登录链路执行；过期后已登录会话仍可继续用，直到重新登录。
- **`class:grant` 能看到全部班级**：`visibleDeptIds` 与 `listClassTeachers` 都对 `class:grant` 放行全量，用于分配；这不是「只能看自己负责的班」。

## 验证

```bash
cd client && npm run check
npm run docs:check
```

预期：类型检查通过，`docs:check` 对本模块无报错。

手工冒烟：

1. 老师（只有 `class:list`）在班级管理页新建一个班，刷新后树里能看到；用户组页看不到这个班。
2. 在班里添加学员：手机号格式错、重复手机号应被拒；成功后学员用手机号登录；改手机号后旧号登录失败、新号成功。
3. 下载学员导入模板，填两行（一行合法、一行手机号重复）导入：整批失败并提示「第 N 行：该手机号已被其他账号使用」；修正后成功，导入行数正确。
4. 管理员给老师授权：只读 → 老师能看成员但不能添加/导入（403 提示「你对该班级只有查看权限，不能修改」）；改为可管理 → 能添加/导入。
5. 给班级分配一场考试并设置班级窗口：学生登录能在考试列表看到；未分配该班的学生打开链接 404；窗口未开始/已结束分别提示对应错误。
6. 删除一个有成员的班：`delete-check` 能看到成员；选 UNASSIGN 删除后学员变成未分组、仍能登录；选 MOVE 只能选同类型 `class` 节点，删除后 `t_class_resource` 无孤儿行。
7. 给班级分配一个题库（面板切到「题库」）并设置窗口：本班学生能在题库列表看到；未分配该班的学生看不到，直接打开/练习应被拒；窗口未开始/已结束再打开应被拒。
8. 题库列表能看到但窗口关闭时，打开题库题目/练习应被拒（列表不按窗口过滤）。
9. 教学工作台能看到自己参与的考试；选一场已有人交卷的考试，班级分布按答题时班级聚合；历史答卷 `class_id` 为空时应落在答题人当前主组，资源面板答卷数只算新答卷。

## 相关文档

- [建班与授权](../flows/class-grant.md)：建班 → 加学员 → 分配老师 → 分配考试/题库 → 学生按班进入的完整链路。
- [考试与问卷（项目）](./project.md)：项目列表可见性、按班准入与全局窗口。
- [答卷、判分与报表](./answer.md)：`t_answer.class_id` 的写入与统计口径。
- [权限、角色与用户组](./permissions.md)：org/class 分离、`class:*`、`system:dept:*` 与审计。
- [题库与题目](./repo.md)：题库授权、按班级分配题库与题库导出。
- [文档入口与维护规则](../start/docs-workflow.md)
