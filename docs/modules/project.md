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
  - 班级分配
  - 按班窗口
  - 教学页
  - embedded
  - 入口重定向
  - 分类树
  - ProjectTree
  - 复制链接
  - 紧凑列表
  - 数据范围
  - t_project
  - t_project_partner
  - t_class_resource
source_globs:
  - client/src/pages/project/**
  - client/src/router.tsx
  - client/src/layout/BasicLayout.tsx
  - client/src/api/index.ts
  - server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectPartnerServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectAnswerValidator.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectTreeNode.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectSetting.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectQuery.java
entrypoints:
  - client/src/pages/project/Entry.tsx
  - client/src/pages/project/List.tsx
  - client/src/pages/project/ProjectTree.tsx
  - client/src/pages/project/ComposeModal.tsx
  - client/src/pages/project/BatchSettingModal.tsx
  - client/src/pages/project/Trash.tsx
  - server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java
apis:
  - GET /api/project/list
  - GET /api/project/tree
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
  - t_class_resource
  - t_answer
tests:
  - client:npm run check
  - docs:npm run docs:check
last_verified: 2026-11-10
verified_against: c0d830fc6162b403d71ac63db629f0b9801d8e99
---

# 考试与问卷（项目）

## 30 秒摘要

一份考试和一份问卷在数据库里是同一张表的不同 `mode`：`t_project` 行同时保存整棵题目树（`survey` JSON）和全部发布设置（`setting` JSON）。"项目"这一层负责创建、列表、改名、发布开关、协作者/班级授权和回收站；老师侧的列表并入 `/teaching` 的「考试/问卷」Tab（ProjectList embedded），并采用「左侧文件夹分类树 + 右侧紧凑列表」的双栏布局（P5），`/project` 入口对「有 portal:teacher + project:list」的账号重定向、对其余账号（学员/无门户权限的只读账号）保留原「考试安排」；题目编辑在 [survey](./survey.md)，答卷与判分在 [answer](./answer.md)。后端入口是 `ProjectApi`，生命周期规则落在 `ProjectServiceImpl`，授权与可见性落在 `ProjectPartnerServiceImpl` / `t_project_partner`，按班级分配与准入在 `ClassResourceService` / `t_class_resource`（项目只关心 `resource_type='project'`；同表也存题库 repo 分配，但不参与项目可见性）。

## 什么时候看这篇

- 新建考试/问卷失败、列表看不到某份试卷、文件夹进不去。
- 要改发布开关、答题时间、回收上限、密码/登录/白名单等发布设置。
- 要加协作者、把考试授权给班级，或排查"授权了但学员看不到"。
- 回收站里找不到项目、恢复/彻底删除报"没有权限访问本问卷"。
- 列表里某份试卷的答卷数、文件夹子项数不对。
- 老师点「教学管理」被带到 `/teaching`，或 `/project` 打不开/重定向循环。
- 分类树看不到某个项目、文件夹计数不对，或「复制链接」复制出的地址打不开。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 项目列表 | `client/src/pages/project/List.tsx` | 管理视图与学员视图二选一；管理视图 = 左 `ProjectTree` + 右紧凑列表（`size=small`、行内「更多」）；创建/改名/发布/删除/批量/回收站保留；`embedded` 时隐藏自己的页头，保留工具条 |
| 分类树 | `client/src/pages/project/ProjectTree.tsx` | `GET /api/project/tree`；根固定「全部」，只渲染 `mode=folder` 的节点与 count；选中文件夹回传面包屑，右侧列表按 `parentId` 过滤 |
| `/project` 入口 | `client/src/pages/project/Entry.tsx` | 有 portal:teacher + project:list → `/teaching?tab=exam`；其余账号（学员/无门户权限的只读）→ 原 ProjectList |
| 组卷弹窗 | `client/src/pages/project/ComposeModal.tsx` | 从题库按题型抽题生成考试，见 [repo-compose](../flows/repo-compose.md) |
| 批量设置 | `client/src/pages/project/BatchSettingModal.tsx` | 逐个项目读 setting、合并勾选项后调 `/project/update` |
| 回收站 | `client/src/pages/project/Trash.tsx` | 只读数组结果；恢复/彻底删除两个动作分别鉴权 |
| 前端请求 | `client/src/api/index.ts` | `listProjects` / `createProject` / `updateProject` / `updateProjectStatus` / `deleteProject` |
| 项目接口 | `server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java` | `@PreAuthorize` + `@EnableDataPerm`；发布开关是独立端点；`/tree` 走 `project:list` |
| 生命周期 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java` | `addProject` / `updateProject` / `updateProjectStatus` / `deleteProject` / `getDeleted` / `restoreProject`；`tree()` 一次查出可见项目并在内存组树/回填 count |
| 授权实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectPartnerServiceImpl.java` | `assertProjectOwner`、`addProjectPartner`、`getProjectPerms`、缓存失效 |
| 班级分配/准入 | `server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java`、`ProjectAnswerValidator.java` | `t_class_resource` 的 `project` 行、按班窗口、`assertStudentCanAnswer`；`repo` 行不参与项目可见性 |
| 设置结构 | `server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectSetting.java` | `AnswerSetting` / `SubmittedSetting` / `ExamSetting` |
| 数据表 | `t_project`、`t_project_partner`、`t_class_resource`、`t_answer` | 项目本体、参与者、班级分配、答卷数统计 |

## 关键流程

### 0. 入口与页面复用（/project + /teaching）

- `/project` 路由守卫仍是 `project:list`，但组件换成 `ProjectEntry`：有 `portal:teacher + project:list` 的账号重定向到 `/teaching?tab=exam`；学员、以及没有 `portal:teacher` 的只读账号继续渲染 `ProjectList` 的「考试安排」。
- `/teaching` 守卫是 `portal:teacher + project:list`；「考试/问卷」Tab 渲染 `<ProjectList embedded />`，隐藏 ProjectList 自己的页头/分隔线，保留搜索、新建、回收站、批量等工具条。
- 「学情」Tab 是另一套 `Workbench`（考试 Select + 班级分布），不是 ProjectList；没有 `project:report` 时不渲染该 Tab。
- 菜单只剩一个「教学」`/teaching`（`portal:teacher && (project:list || project:report)`）；`/project` 不再出现在侧栏，但 `/project/trash` 仍可用（`project:list` 守卫），直接访问即可。
- 学员侧不变：菜单/首页仍走「我的任务」，`/project` 是可访问的「考试安排」，不会被重定向。

### 0.1 双栏列表与分类树（P5）

- **树接口**：`GET /api/project/tree`（`project:list` 或 admin），返回 `List<ProjectTreeNode>`。节点字段：`id / name / parentId / mode / count / children`；`mode` 仍是 `folder|survey|exam`，`count` 是该节点子树里**非 folder** 的项目数（folder 自身不计，叶子项目计 1）。
- **树可见性**：管理员全量；其余人只查 `create_by=当前用户` 或 `t_project_partner` 里 `user_id/组链` 且 `type IN (1,2)` 的项目。**这条和 /project/list 不完全一致**：树不认 `type=3 RESPONDENT`，也不认 `t_class_resource` 的按班分配（学生端不用树，老师端以自己创建/协作为主）。父文件夹不可见/不存在时，子项目直接作为根返回，不丢项目。
- **前端树**：`ProjectTree` 只渲染 folder 节点（叶子考试/问卷在右侧列表），根固定「全部」，标题旁显示 `count`；选中文件夹通过路径回传面包屑，右侧列表用 `parentId` 只查该层。新建/重命名/删除后父组件递增 `refreshToken`，树重新拉 counts；改名时同步更新面包屑。
- **右侧紧凑列表**：管理视图把原来的宽操作列收进「更多」下拉，表格 `size=small`、名称省略、横向滚动；保留「新建/回收站/批量」工具条和文件夹进入。操作项按权限逐项渲染（设置/编辑/数据/复制链接/开关/重命名/删除），文件夹只有重命名/删除。
- **复制链接**：行内「更多」和移动端卡片都有「复制链接」，地址是 `window.location.origin + '/s/' + id`；`answerSetting.loginRequired === true` 时文案变成「复制链接（需登录）」。非安全上下文或 Clipboard API 失败时退回 `window.prompt` 让用户手动复制。
- **入口范围**：这套双栏只在 `ProjectList` 的管理视图（以及 `/teaching` 的考试/问卷 Tab）出现；学员访问 `/project` 仍是原「考试安排」列表，不加载分类树。创建/回收站/批量/文件夹等原有能力不因双栏改接口。

1. **创建**：列表页 `submitCreate` 调 `POST /api/project/create`。`ProjectServiceImpl.addProject` 先用 `completeSetting` 补齐默认设置（`status=0`、进度条/自动保存、空 `examSetting`），生成 6 位 NanoId（不以数字开头），再写入一条 `t_project_partner`（`type=1 OWNER`、当前用户）。因此后续 `/project/update` 的 `@EnableDataPerm` 才能通过。
2. **列表**：`GET /api/project/list` 只返回根级项目（`parent_id IS NULL OR parent_id='0'`）；进文件夹必须显式带 `parentId`。可见性写在 SQL 的 EXISTS 子查询里，两个条件用 `and(...)` 包住：`t_project_partner` 中 `user_id=当前用户` 或 `group_id` 属于"主组 + 附加组 + 祖先链"（`UserDeptScopeService.DEPT_SCOPE_SQL`）且 `type IN (1,2,3)`；**或** `t_class_resource` 里本班（主组 + 附加组 + 祖先链）有这场考试的分配（`resource_type='project'`、`is_deleted=0`）。文件夹按 `mode='folder'` 排前，再按创建时间倒序。
   注意：班级资源这条只判断「有没有分配」，不判断 `status` 与班级窗口；关闭/已结束的考试仍可能出现在列表里，打开时才报错。
3. **改名/保存设置**：`POST /api/project/update`。整页保存直接传 `setting` 或 `survey`；只改单项时传 `settingKey` + `settingValue`，`ProjectServiceImpl.validateSettingKey` 用 SpEL 白名单限制可写路径。方法内按 `id.intern()` 串行化，避免并发整包覆盖。
4. **发布/关闭**：`POST /api/project/status`（`project:publish` 或 admin）。`updateProjectStatus` 同时写 `t_project.status` 和 `setting.status`，两处必须一致：列表读列，答题页读 setting。非 1 的状态一律归 0。
5. **协作者/班级授权**：`POST /api/project/partner/create`，`type=1 OWNER`、`2 COLLABORATOR`、`3 RESPONDENT_SYS_USER`、`4 RESPONDENT_IMP_USER`。传 `groupId` 时只写一条组记录，组员自动继承；传 `userIds` 时逐人写。新增/删除/导入在控制器和 Service 双重校验 `assertProjectOwner`，且变更后会清 `projectPermissionCache`（组授权清全量）。
6. **回收站**：`POST /api/project/delete` 是逻辑删除（`is_deleted=1`）。`GET /api/project/trash` 返回数组而不是分页对象，且只查 `create_by=当前用户` 的已删项目；恢复 `POST /api/project/restore` 需要 `project:create`，彻底删除 `POST /api/project/destroy` 需要 `project:delete`，后者物理删除 `t_project` 并清掉该项目的全部参与者。

### 按班级分配与开放窗口（学生视角）

1. 分配数据在 `t_class_resource`（一行 = 班级 + `resource_type` + 资源 id）。本项目只关心 `resource_type='project'` 的考试/问卷；同一张表还存 `repo`（题库，P2），由班级管理页「考试与问卷 / 题库」面板维护。项目列表/准入 SQL 必须带 `resource_type='project'`，否则题库分配会被误当成考试。写入与窗口规则见 [teaching](./teaching.md)。
2. **全局窗口**：`ProjectSetting.examSetting.startTime/endTime`（epoch 毫秒）是硬上限；班级窗口 `t_class_resource.start_at/end_at` 为空继承全局，非空必须落在全局窗口内。
3. **准入闸门**：`ProjectAnswerValidator#validateProject`（打开/大纲/逐题/上传）与 `validateAnswerGate`（交卷）都会调 `ClassResourceService#assertStudentCanAnswer`：
   - 登录用户是 `student` 且不在任何班，或所在班没有这场考试的分配 → `ProjectNotFound`（404，不泄露标题）；
   - 班级/全局未开始 → `ExamUnStarted`（6000）；已结束 → `ExamFinished`（6010）；班级开关关闭或项目停用 → `SurveySuspend`（4000）。
   - 匿名、staff、管理员直接放行；练习/错题本伪项目（`ExerciseProjectTemplate.EXERCISE_PROJECT_ID`）也直接放行。
4. **多班**：学生同时在多个班时，任一班的分配有效即可参加；解析「答题时所在班」时主班优先。新建答卷写 `t_answer.class_id`，更新答卷不改（换班后历史答卷仍算原班）。
5. **项目列表 vs 打开**：列表只按「有分配」放行，不按窗口/开关过滤；打开时才做完整窗口校验，所以会出现「列表里看得到、点开提示未开始/已结束/已关闭」。

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
| 分类树 `/project/tree` | `project:list` 或 admin | 只认创建者或 partner `type IN (1,2)`；不含 type 3 与班级分配 |
| 访问 `/project` 入口 | `project:list` | 有 `portal:teacher` 的账号重定向 `/teaching?tab=exam`；学员/无门户权限的只读账号渲染原列表 |
| 查看详情/设置 | `project:detail` + `@EnableDataPerm` | OWNER/COLLABORATOR（含组授权）或 admin |
| 新建/恢复 | `project:create` | 恢复还要求项目在 `getProjectPerms` 里 |
| 编辑题目/设置 | `project:update` + `@EnableDataPerm` | OWNER/COLLABORATOR |
| 发布开关 | `project:publish` + `@EnableDataPerm` | OWNER/COLLABORATOR；admin 绕过数据权限 |
| 删除/彻底删除 | `project:delete` + `@EnableDataPerm` | OWNER/COLLABORATOR |
| 成员增删/导入/下载 | `project:partner` 或 admin；成员变更额外要求 OWNER | 仅项目所有者可改成员；下载名单不再对普通 `project:detail` 开放 |
| 学生按班参加 | 无额外权限（有 `project:answer`） | 必须被分到学生所在班；未分配 404，未开始/已结束/关闭分别报对应错误 |

## 坑与已知限制

- **`t_project_partner` 没有 `is_deleted` 列**。`ProjectPartner` 把继承来的 `deleted` 覆盖成 `@TableField(exist = false)`，删除走物理 DELETE。列表 SQL 里千万别补 `t.is_deleted = 0`，否则直接 `Unknown column 't.is_deleted'` 500。
- **管理员未必能管成员**：`ProjectApi` 的成员接口写了 `or hasRole('admin')`，但 Service 先执行 `assertProjectOwner`，而它没有管理员豁免。admin 不是该项目 OWNER 时仍会被拒绝"只有项目所有者可以管理成员"。
- **回收站只看自己创建的**：`ProjectMapper.selectLogicDeleted` 固定 `create_by = #{userId}`，协作者看不到别人删的项目；恢复时又要求项目在 `getProjectPerms` 里，两套条件不一致。
- **彻底删除是物理删除**：`batchDestroy` 直接 `DELETE FROM t_project`，随后删除参与者；不可恢复，也不会进备份之外的历史。
- **发布状态两个字段**：任何绕过 `/project/status` 直接写 `setting.status` 的脚本，都要同时更新 `t_project.status`，否则列表显示和答题页判断会打架。
- **`getSetting` 会清空访问密码**：`ProjectServiceImpl.getSetting` 把 `answerSetting.password` 置 null 再返回；设置页打开时看不到已配置的密码，只能重新输入覆盖。
- **`selectTemplate` / `selectRepo` / `selectTag` 没有 `@PreAuthorize`**：只靠 `/api/**` 的登录拦截，任何登录用户都能拿到题库/模板/标签候选；如果这些数据敏感，需要补权限点。
- **文件夹子项计数与答卷数共用 `total`**：文件夹返回子项目数，普通项目返回"已提交答卷数"（`temp_save=1`），前端不要把它当"题目数"。
- **班级分配只约束 student**：匿名公开问卷、staff、管理员不走 `assertStudentCanAnswer`；练习伪项目也不参与。不要把「未分配 404」套到所有登录用户。
- **列表可见性不按窗口/开关过滤**：`t_class_resource` EXISTS 只判断有没有分配；`status=0`、未开始、已结束的考试仍可能出现在学生列表里，打开时才报错。要隐藏得在 SQL 里补窗口/状态条件。
- **分配资源不校验项目可见性**：班级资源写入只校验班级可管理 + 项目存在/非文件夹，不校验调用者是否能看到该项目；拿 `projectId` 即可分配（P1/P2 服务端缺口，题库同理）。
- **全局窗口未设置 = 不限制**：`examSetting.startTime/endTime` 为空时，班级窗口可以任意设；「硬上限」只在全局有值时成立。
- **`t_class_resource` 是逻辑删表且混存两类资源**：手写 SQL 必须显式加 `is_deleted=0` **和** `resource_type='project'`（题库 repo 也在这张表里）；`t_project_partner` 没有 `is_deleted`，两者不要混。
- **`/project` 现在只是学员入口**：老师访问会被 `Entry` 重定向到 `/teaching?tab=exam`；`/project/trash` 没有重定向，老师仍可直接访问（侧栏不再给入口）。
- **嵌入列表的页头只由外层负责**：`<ProjectList embedded />` 会隐藏自己的标题/分隔线，但保留工具条；外层 `TeachingHome` 已有标题，别再套第二份。
- **菜单「教学」与路由守卫不完全一致**：菜单是 `portal:teacher && (project:list || project:report)`，`/teaching` 路由还要 `project:list`；只有 report、没有 list 的自定义角色会看到入口但进不去。
- **分类树与项目列表不是同一套可见性**：`/api/project/tree` 只查 `create_by` + partner `type IN (1,2)`，不认 `type=3 RESPONDENT`，也不认 `t_class_resource` 的班级分配；因此「/project/list 能看到、树里没有」是预期现象。不要把班级分配直接补进树：学生端本来就不用树，老师端补了会把学生可见项目混进教学树。
- **树只展示文件夹，叶子项目不在树节点里**：叶子考试/问卷通过右侧 `parentId` 列表展示；`count` 是子树非 folder 数，不要把 folder 的 count 当答卷数。父文件夹不可见时子项目会退化成根，目录层级看起来会「少一层」。
- **根级考试/问卷的边界**：如果项目本身是考试/问卷、父文件夹不可见而退化成根，`ProjectTree` 会跳过它（树只渲染 folder），右侧「全部」又只查 `parent_id IS NULL/0`，所以这类项目可能只能靠搜索/直接 URL 找到。API 已按根返回，UI 尚未为「根级叶子」补入口。
- **复制链接不校验发布状态/权限**：地址是 `/s/:id`；`loginRequired` 只影响文案（「需登录」），不代表链接一定可打开。关闭/未发布/窗口未开的项目复制出去仍会失败；需要分享前先确认状态。
- **分类树/紧凑列表不改变接口**：创建、回收站、批量、文件夹仍走原端点；树只是导航。学员 `/project` 仍是原列表。
- **项目列表/回收站的 total 已排除匿名答卷**：P6 起 `ProjectServiceImpl` 两处 `t_answer` count 加 `is_anonymous=0`；不要把 total 当「含匿名提交」的总量。

## 验证

```bash
cd client && npm run check
npm run docs:check
```

手工回归：

1. 学员账号（只有 `project:list`/`project:answer`）打开 `/project` 仍看到"考试安排"，没有被重定向；只看到被授权的项目，没有"新建/回收站"入口，也不出现分类树。
2. 老师/管理员访问 `/project` 应重定向到 `/teaching?tab=exam`；`/teaching` 的「考试/问卷」Tab 只出现一份页头（ProjectList embedded），左侧分类树只列文件夹、右侧列表随选中文件夹切换。
3. 新建一个文件夹 → 再建一场考试放进该文件夹 → 树里文件夹 count 变为 1；重命名文件夹后面包屑同步、count 不丢；删除后树刷新。
4. 对一场 `loginRequired=true` 的考试点「更多 → 复制链接」，文案应为「复制链接（需登录）」，粘贴出的地址是当前 origin 的 `/s/:id`；非 HTTPS 本地环境应弹出手动复制提示。
5. 老师建考试 → 列表出现 → 发布 → 学员能打开 `/s/:id`；关闭收集后再打开应提示"问卷已暂停回收"。
6. 协作者账号能看列表和答卷但改不了成员；项目所有者能加/删成员，组授权后组员能看到。
7. 删除项目 → 回收站能看到 → 恢复后回到列表；彻底删除后列表和回收站都不再出现。
8. 学生 A 在班级 X：给 X 分配一场考试后，A 的列表出现该考试；未分配该班的 B 打开链接应 404；把班级窗口设到未来/过去，A 打开分别提示未开始/已结束。
9. 把班级开关关掉（`t_class_resource.status=0`）→ A 打开提示「问卷已暂停回收」；重新打开后可正常进入。

## 相关文档

- [考试编辑器与题型](./survey.md)
- [答卷、判分与报表](./answer.md)
- [从题库组卷到考试](../flows/repo-compose.md)
- [建班、加学员、分配老师与数据可见范围](../flows/class-grant.md)
- [权限、角色与用户组](./permissions.md)
- [数据模型](../architecture/data-model.md)
