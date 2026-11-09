---
id: module-project
title: 考试与问卷（项目）
status: current
keywords:
  - 考试
  - 问卷
  - 项目
  - 发布
  - 协作者
  - 数据范围
  - t_project
  - t_project_partner
source_globs:
  - client/src/pages/project/**
  - client/src/api/index.ts
  - server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectPartnerServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectSetting.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectQuery.java
entrypoints:
  - client/src/pages/project/List.tsx
  - client/src/pages/project/ComposeModal.tsx
  - client/src/pages/project/BatchSettingModal.tsx
  - client/src/pages/project/Trash.tsx
  - server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java
apis:
  - GET /api/project/list
  - GET /api/project
  - GET /api/project/setting
  - POST /api/project/create
  - POST /api/project/update
  - POST /api/project/status
  - POST /api/project/delete
  - GET /api/project/trash
  - POST /api/project/restore
  - POST /api/project/destroy
  - GET /api/project/partner/list
  - POST /api/project/partner/create
  - POST /api/project/partner/delete
  - POST /api/project/partner/import
  - GET /api/project/partner/download
tables:
  - t_project
  - t_project_partner
  - t_answer
tests:
  - 'client:npm run check'
  - 'docs:npm run docs:check'
last_verified: '2026-11-09'
verified_against: '765fc89'
---

# 考试与问卷（项目）

## 30 秒摘要

一份考试和一份问卷在数据库里是同一张表的不同 `mode`：`t_project` 行同时保存整棵题目树（`survey` JSON）和全部发布设置（`setting` JSON）。"项目"这一层负责创建、列表、改名、发布开关、协作者/班级授权和回收站；题目编辑在 [survey](./survey.md)，答卷与判分在 [answer](./answer.md)。后端入口是 `ProjectApi`，生命周期规则落在 `ProjectServiceImpl`，授权与可见性落在 `ProjectPartnerServiceImpl` 和 `t_project_partner`。

## 什么时候看这篇

- 新建考试/问卷失败、列表看不到某份试卷、文件夹进不去。
- 要改发布开关、答题时间、回收上限、密码/登录/白名单等发布设置。
- 要加协作者、把考试授权给班级，或排查"授权了但学员看不到"。
- 回收站里找不到项目、恢复/彻底删除报"没有权限访问本问卷"。
- 列表里某份试卷的答卷数、文件夹子项数不对。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 项目列表 | `client/src/pages/project/List.tsx` | 管理视图与学员视图二选一；创建/改名/发布/删除/批量/文件夹 |
| 组卷弹窗 | `client/src/pages/project/ComposeModal.tsx` | 从题库按题型抽题生成考试，见 [repo-compose](../flows/repo-compose.md) |
| 批量设置 | `client/src/pages/project/BatchSettingModal.tsx` | 逐个项目读 setting、合并勾选项后调 `/project/update` |
| 回收站 | `client/src/pages/project/Trash.tsx` | 只读数组结果；恢复/彻底删除两个动作分别鉴权 |
| 前端请求 | `client/src/api/index.ts` | `listProjects` / `createProject` / `updateProject` / `updateProjectStatus` / `deleteProject` |
| 项目接口 | `server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java` | `@PreAuthorize` + `@EnableDataPerm`；发布开关是独立端点 |
| 生命周期 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java` | `addProject` / `updateProject` / `updateProjectStatus` / `deleteProject` / `getDeleted` / `restoreProject` |
| 授权实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectPartnerServiceImpl.java` | `assertProjectOwner`、`addProjectPartner`、`getProjectPerms`、缓存失效 |
| 设置结构 | `server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectSetting.java` | `AnswerSetting` / `SubmittedSetting` / `ExamSetting` |
| 数据表 | `t_project`、`t_project_partner`、`t_answer` | 项目本体、参与者、答卷数统计 |

## 关键流程

1. **创建**：列表页 `submitCreate` 调 `POST /api/project/create`。`ProjectServiceImpl.addProject` 先用 `completeSetting` 补齐默认设置（`status=0`、进度条/自动保存、空 `examSetting`），生成 6 位 NanoId（不以数字开头），再写入一条 `t_project_partner`（`type=1 OWNER`、当前用户）。因此后续 `/project/update` 的 `@EnableDataPerm` 才能通过。
2. **列表**：`GET /api/project/list` 只返回根级项目（`parent_id IS NULL OR parent_id='0'`）；进文件夹必须显式带 `parentId`。可见性写在 SQL 的 EXISTS 子查询里：`t_project_partner` 中 `user_id=当前用户` 或 `group_id` 属于"主组 + 附加组 + 祖先链"（`UserDeptScopeService.DEPT_SCOPE_SQL`），且 `type IN (1,2,3)`。文件夹按 `mode='folder'` 排前，再按创建时间倒序。
3. **改名/保存设置**：`POST /api/project/update`。整页保存直接传 `setting` 或 `survey`；只改单项时传 `settingKey` + `settingValue`，`ProjectServiceImpl.validateSettingKey` 用 SpEL 白名单限制可写路径。方法内按 `id.intern()` 串行化，避免并发整包覆盖。
4. **发布/关闭**：`POST /api/project/status`（`project:publish` 或 admin）。`updateProjectStatus` 同时写 `t_project.status` 和 `setting.status`，两处必须一致：列表读列，答题页读 setting。非 1 的状态一律归 0。
5. **协作者/班级授权**：`POST /api/project/partner/create`，`type=1 OWNER`、`2 COLLABORATOR`、`3 RESPONDENT_SYS_USER`、`4 RESPONDENT_IMP_USER`。传 `groupId` 时只写一条组记录，组员自动继承；传 `userIds` 时逐人写。新增/删除/导入在控制器和 Service 双重校验 `assertProjectOwner`，且变更后会清 `projectPermissionCache`（组授权清全量）。
6. **回收站**：`POST /api/project/delete` 是逻辑删除（`is_deleted=1`）。`GET /api/project/trash` 返回数组而不是分页对象，且只查 `create_by=当前用户` 的已删项目；恢复 `POST /api/project/restore` 需要 `project:create`，彻底删除 `POST /api/project/destroy` 需要 `project:delete`，后者物理删除 `t_project` 并清掉该项目的全部参与者。

## 修改指南

### 改发布设置/考试控制

1. 字段先加到 `ProjectSetting` 对应的内部类（`AnswerSetting` / `SubmittedSetting` / `ExamSetting`）。
2. 在 `Overview.tsx` 的 `applySetting` 与 `onSave` 两处同时补读/写；保存走整包 `setting`，未展示字段靠 `...current` 合并保留。
3. 只改单项设置的旧入口要用 `settingKey`，并确认 `ClassUtils.flatClassFields(ProjectSetting.class, ..., 2)` 能覆盖该路径（默认只到两层）。
4. 前端按钮权限用 `can(authorities, 'project:update')` / `'project:publish'`，不要在页面里硬写管理员判断。

### 改可见性或协作者

1. 列表可见性在 `ProjectServiceImpl.listProject` 的 EXISTS 子查询；单项目访问在 `@EnableDataPerm` + `ProjectPartnerServiceImpl.getProjectPerms`；答卷数据范围在 `AnswerServiceImpl.canManageProject`。三处口径必须一起改。
2. `getProjectPerms` 只认 `type IN (1,2)`；如果让协作者管理成员，需要同时改 `assertProjectOwner` 与前端按钮，不要只放开注解。
3. 改组授权时同步检查 `UserDeptScopeService`（主组、附加组、祖先链）与 `ProjectApi` 的 `system/dept/list` / `system/user/options` 候选接口。

### 新增字段/接口

1. 后端：`Project` 实体 → `ProjectRequest` / `ProjectView` → `ProjectViewMapper` → `ProjectServiceImpl`。
2. 数据库：改 `server/rdbms/src/main/resources/scripts/init-mysql.sql`，同时在 `scripts/nas/migrate/` 新增幂等迁移；已有数据的库不要重跑 init 脚本。
3. 前端：`client/src/schema/project.ts` 的类型、`client/src/api/index.ts` 的请求、页面表单。
4. 更新本页 frontmatter 的 `source_globs` 与 `apis`。

## 权限与数据范围

| 动作 | 权限 | 数据范围 |
|---|---|---|
| 列表 | `project:list` 或 `exercise:list` | 本人/本组被授权为 OWNER、COLLABORATOR、RESPONDENT（含组链） |
| 查看详情/设置 | `project:detail` + `@EnableDataPerm` | OWNER/COLLABORATOR（含组授权）或 admin |
| 新建/恢复 | `project:create` | 恢复还要求项目在 `getProjectPerms` 里 |
| 编辑题目/设置 | `project:update` + `@EnableDataPerm` | OWNER/COLLABORATOR |
| 发布开关 | `project:publish` + `@EnableDataPerm` | OWNER/COLLABORATOR；admin 绕过数据权限 |
| 删除/彻底删除 | `project:delete` + `@EnableDataPerm` | OWNER/COLLABORATOR |
| 成员增删/导入/下载 | `project:partner` 或 admin；成员变更额外要求 OWNER | 仅项目所有者可改成员；下载名单不再对普通 `project:detail` 开放 |

## 坑与已知限制

- **`t_project_partner` 没有 `is_deleted` 列**。`ProjectPartner` 把继承来的 `deleted` 覆盖成 `@TableField(exist = false)`，删除走物理 DELETE。列表 SQL 里千万别补 `t.is_deleted = 0`，否则直接 `Unknown column 't.is_deleted'` 500。
- **管理员未必能管成员**：`ProjectApi` 的成员接口写了 `or hasRole('admin')`，但 Service 先执行 `assertProjectOwner`，而它没有管理员豁免。admin 不是该项目 OWNER 时仍会被拒绝"只有项目所有者可以管理成员"。
- **回收站只看自己创建的**：`ProjectMapper.selectLogicDeleted` 固定 `create_by = #{userId}`，协作者看不到别人删的项目；恢复时又要求项目在 `getProjectPerms` 里，两套条件不一致。
- **彻底删除是物理删除**：`batchDestroy` 直接 `DELETE FROM t_project`，随后删除参与者；不可恢复，也不会进备份之外的历史。
- **发布状态两个字段**：任何绕过 `/project/status` 直接写 `setting.status` 的脚本，都要同时更新 `t_project.status`，否则列表显示和答题页判断会打架。
- **`getSetting` 会清空访问密码**：`ProjectServiceImpl.getSetting` 把 `answerSetting.password` 置 null 再返回；设置页打开时看不到已配置的密码，只能重新输入覆盖。
- **`selectTemplate` / `selectRepo` / `selectTag` 没有 `@PreAuthorize`**：只靠 `/api/**` 的登录拦截，任何登录用户都能拿到题库/模板/标签候选；如果这些数据敏感，需要补权限点。
- **文件夹子项计数与答卷数共用 `total`**：文件夹返回子项目数，普通项目返回"已提交答卷数"（`temp_save=1`），前端不要把它当"题目数"。

## 验证

```bash
cd client && npm run check
npm run docs:check
```

手工回归：

1. 学员账号（只有 `project:list`/`project:answer`）打开"考试安排"只看到被授权的项目，没有"新建/回收站"入口。
2. 老师建考试 → 列表出现 → 发布 → 学员能打开 `/s/:id`；关闭收集后再打开应提示"问卷已暂停回收"。
3. 协作者账号能看列表和答卷但改不了成员；项目所有者能加/删成员，组授权后组员能看到。
4. 删除项目 → 回收站能看到 → 恢复后回到列表；彻底删除后列表和回收站都不再出现。

## 相关文档

- [考试编辑器与题型](./survey.md)
- [答卷、判分与报表](./answer.md)
- [从题库组卷到考试](../flows/repo-compose.md)
- [建班、加学员、分配老师与数据可见范围](../flows/class-grant.md)
- [权限、角色与用户组](./permissions.md)
- [数据模型](../architecture/data-model.md)
