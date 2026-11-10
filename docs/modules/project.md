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
  - 项目分类
  - 未分类
  - ProjectCategoryTree
  - 行内操作
  - 复制链接
  - 紧凑列表
  - 概述页
  - 基本信息
  - 批量分类
  - 布局
  - 新建文件夹
  - 批量移动
  - 所属文件夹
  - parentId
  - 授权级别
  - 教师组
  - access_level
  - 数据范围
  - t_project
  - t_project_partner
  - t_class_resource
source_globs:
  - client/src/pages/project/**
  - client/src/pages/survey/Overview.tsx
  - client/src/router.tsx
  - client/src/layout/BasicLayout.tsx
  - client/src/api/index.ts
  - server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectPartnerServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectAnswerValidator.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectTreeNode.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectCategoryView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectRequest.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/Project.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectPartnerRequest.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectPartnerView.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectPartnerServiceImpl.java
  - scripts/nas/migrate/36-partner-access-level.sql
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectSetting.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectQuery.java
entrypoints:
  - client/src/pages/project/Entry.tsx
  - client/src/pages/project/List.tsx
  - client/src/pages/project/ProjectTree.tsx
  - client/src/pages/survey/Overview.tsx
  - client/src/pages/survey/PartnerPanel.tsx
  - client/src/pages/project/ProjectCategoryTree.tsx
  - client/src/pages/project/ComposeModal.tsx
  - client/src/pages/project/BatchSettingModal.tsx
  - client/src/pages/project/Trash.tsx
  - server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java
apis:
  - GET /api/project/list
  - GET /api/project/tree
  - GET /api/project/categories
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
  - POST /api/project/partner/update
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
verified_against: 099d38fdf40d483258ea49fe08087a47fbfcf206
---

# 考试与问卷（项目）

## 30 秒摘要

一份考试和一份问卷在数据库里是同一张表的不同 `mode`：`t_project` 行同时保存整棵题目树（`survey` JSON）和全部发布设置（`setting` JSON）。"项目"这一层负责创建、列表、改名、发布开关、协作者/班级授权和回收站；老师侧的列表并入 `/teaching` 的「考试/问卷」Tab（ProjectList embedded），采用「左侧项目分类树 + 文件夹树 + 右侧紧凑列表」的双栏布局（P5/P8），`/project` 入口对「有 portal:teacher + project:list」的账号重定向、对其余账号（学员/无门户权限的只读账号）保留原「考试安排」；题目编辑在 [survey](./survey.md)，答卷与判分在 [answer](./answer.md)。后端入口是 `ProjectApi`，生命周期规则落在 `ProjectServiceImpl`，授权与可见性落在 `ProjectPartnerServiceImpl` / `t_project_partner`，按班级分配与准入在 `ClassResourceService` / `t_class_resource`（项目只关心 `resource_type='project'`；同表也存题库 repo 分配，但不参与项目可见性）。

## 什么时候看这篇

- 新建考试/问卷失败、列表看不到某份试卷、文件夹进不去。
- 要改发布开关、答题时间、回收上限、密码/登录/白名单等发布设置。
- 要加协作者、把考试授权给班级，或排查"授权了但学员看不到"。
- 回收站里找不到项目、恢复/彻底删除报"没有权限访问本问卷"。
- 列表里某份试卷的答卷数、文件夹子项数不对。
- 老师点「教学管理」被带到 `/teaching`，或 `/project` 打不开/重定向循环。
- 分类树看不到某个项目、文件夹计数不对，或「复制链接」复制出的地址打不开。
- 想按「保育员 / 养老护理员 / 育婴员」筛考试，或新建/重命名时分类填不进去、清不掉。
- 在试卷设置页找不到改名称/分类的地方，或批量设置的分类没有生效。
- 想把考试批量移进文件夹、在设置页改「所属文件夹」，或移动后树里位置不对。
- 文件夹建不了/重名，或协作者只能看不能改、不能继续授权。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 项目列表 | `client/src/pages/project/List.tsx` | 管理视图与学员视图二选一；管理视图 = 左「项目分类 + 文件夹」双树 + 右紧凑列表（`size=small`、行内一级操作）；创建/改名/发布/删除/批量/回收站保留；`embedded` 时隐藏自己的页头，保留工具条 |
| 项目分类树 | `client/src/pages/project/ProjectCategoryTree.tsx` | `GET /api/project/categories`；根「全部分类」+ 各分类 count；选中分类与文件夹互斥，右侧列表按 `category` 过滤；窗口 focus/visibilitychange 静默刷新（1s 节流） |
| 文件夹树 | `client/src/pages/project/ProjectTree.tsx` | `GET /api/project/tree`；只渲染 `mode=folder` 的节点与 count；选中文件夹清空分类；标题旁「新建文件夹」（`project:create`）→ `createProject({name,mode:'folder',parentId})` |
| `/project` 入口 | `client/src/pages/project/Entry.tsx` | 有 portal:teacher + project:list → `/teaching?tab=exam`；其余账号（学员/无门户权限的只读）→ 原 ProjectList |
| 协作者面板 | `client/src/pages/survey/PartnerPanel.tsx` | 项目所有者/可授权协作者维护教师组/协作者/班级授权；显示并调整 access_level（1 查看/2 编辑/3 授权） |
| 试卷设置页 | `client/src/pages/survey/Overview.tsx` | `/survey/:id` 概述；基本信息卡编辑名称/分类/所属文件夹（Folder TreeSelect），保存 `updateProject({id,name,category,parentId,setting})`；卡片重排见 P9/P13 |
| 组卷弹窗 | `client/src/pages/project/ComposeModal.tsx` | 从题库按题型抽题生成考试，见 [repo-compose](../flows/repo-compose.md) |
| 批量设置 | `client/src/pages/project/BatchSettingModal.tsx` | 逐个项目读 setting、合并勾选项后调 `/project/update`；顶部可批量改文件夹（parentId）与分类（category） |
| 回收站 | `client/src/pages/project/Trash.tsx` | 只读数组结果；恢复/彻底删除两个动作分别鉴权 |
| 前端请求 | `client/src/api/index.ts` | `listProjects` / `createProject` / `updateProject` / `updateProjectStatus` / `deleteProject` |
| 项目接口 | `server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java` | `@PreAuthorize` + `@EnableDataPerm`；发布开关独立；`/tree`、`/categories` 走 `project:list`；`/partner/update` 调级别 |
| 生命周期 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java` | `addProject` / `updateProject` / `updateProjectStatus` / `deleteProject` / `getDeleted` / `restoreProject`；`tree()` 组文件夹树；`listCategories()` 统计分类；写操作先 `assertCanEditProject`（level>=2） |
| 项目授权 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectPartnerServiceImpl.java` | `accessLevel`（0/1/2/3）、`assertCanGrant`（owner/admin/level3）、`updateProjectPartner`；教师组/协作者带级别，班级/答卷人固定 1 |
| 授权实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectPartnerServiceImpl.java` | `assertProjectOwner`、`addProjectPartner`、`getProjectPerms`、缓存失效 |
| 班级分配/准入 | `server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java`、`ProjectAnswerValidator.java` | `t_class_resource` 的 `project` 行、按班窗口、`assertStudentCanAnswer`；`repo` 行不参与项目可见性 |
| 设置结构 | `server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectSetting.java` | `AnswerSetting` / `SubmittedSetting` / `ExamSetting` |
| 数据表 | `t_project`、`t_project_partner`、`t_class_resource`、`t_answer` | 项目本体、参与者、班级分配、答卷数统计 |

## 关键流程

### 0. 入口与页面复用（/project + /teaching）

- `/project` 路由守卫仍是 `project:list`，但组件换成 `ProjectEntry`：有 `portal:teacher + project:list` 的账号重定向到 `/teaching?tab=exam`；学员、以及没有 `portal:teacher` 的只读账号继续渲染 `ProjectList` 的「考试安排」。
- `/teaching` 守卫是 `portal:teacher + project:list`；「考试/问卷」Tab 渲染 `<ProjectList embedded />`，隐藏 ProjectList 自己的页头/分隔线，保留搜索、新建、回收站、批量等工具条。
- 「学情」Tab 是另一套 `Workbench`（左班级树 + 右「考试/问卷/学员」Tabs），不是 ProjectList；没有 `project:report` 时不渲染该 Tab。
- 菜单只剩一个「教学」`/teaching`（`portal:teacher && (project:list || project:report)`）；`/project` 不再出现在侧栏，但 `/project/trash` 仍可用（`project:list` 守卫），直接访问即可。
- 学员侧不变：菜单/首页仍走「我的任务」，`/project` 是可访问的「考试安排」，不会被重定向。

### 0.1 双栏列表与文件夹树（P5）

- **树接口**：`GET /api/project/tree`（`project:list` 或 admin），返回 `List<ProjectTreeNode>`。节点字段：`id / name / parentId / mode / count / children`；`mode` 仍是 `folder|survey|exam`，`count` 是该节点子树里**非 folder** 的项目数（folder 自身不计，叶子项目计 1）。
- **树可见性**：管理员全量；其余人只查 `create_by=当前用户` 或 `t_project_partner` 里 `user_id/组链` 且 `type IN (1,2)` 的项目。**这条和 /project/list 不完全一致**：树不认 `type=3 RESPONDENT`，也不认 `t_class_resource` 的按班分配（学生端不用树，老师端以自己创建/协作为主）。父文件夹不可见/不存在时，子项目直接作为根返回，不丢项目。
- **前端树**：`ProjectTree` 只渲染 folder 节点（叶子考试/问卷在右侧列表），根固定「全部」，标题旁显示 `count`；选中文件夹通过路径回传面包屑，右侧列表用 `parentId` 只查该层。新建/重命名/删除后父组件递增 `refreshToken`，树重新拉 counts；改名时同步更新面包屑。
- **新建文件夹（P11）**：树标题旁 `+`（有 `project:create` 才显示）打开弹窗；提交 `createProject({name, mode:'folder', parentId:当前选中文件夹})`。前端只校验「同一父级下不能同名 folder」，后端不会因重名拒绝；成功后 `load()` + `treeToken`/列表刷新，若当前按分类筛选则清空分类（新文件夹是根级，否则右侧看不到）。
- **右侧紧凑列表**：管理视图为 `size=small`、名称省略、横向滚动的列表；保留「新建/回收站/批量」工具条和文件夹进入。行操作不再收进「更多」下拉，而是按权限一级显示：设置/编辑/数据/复制链接/开启关闭/重命名/删除；文件夹只有重命名/删除。
- **复制链接**：行内和移动端卡片都有「复制链接」，地址是 `window.location.origin + '/s/' + id`；`answerSetting.loginRequired === true` 时文案变成「复制链接（需登录）」。非安全上下文或 Clipboard API 失败时退回 `window.prompt` 让用户手动复制。
- **入口范围**：这套双栏只在 `ProjectList` 的管理视图（以及 `/teaching` 的考试/问卷 Tab）出现；学员访问 `/project` 仍是原「考试安排」列表，不加载分类树。创建/回收站/批量/文件夹等原有能力不因双栏改接口。

### 0.2 项目分类与行内操作（P8）

- **字段**：`t_project.category varchar(64)`（`name` 后，`NULL`/空串=未分类），迁移 `scripts/nas/migrate/34-project-category.sql`（幂等加列）。`Project` / `ProjectView` / `ProjectRequest` 都有 `category`；`ProjectQuery.category` 用于筛选。
- **筛选**：`GET /api/project/list?category=` 普通值按 `category` 精确匹配（先 trim）；`__UNCATEGORIZED__`（`ProjectQuery.UNCATEGORIZED`）翻译成 `category IS NULL OR category = ''`；不传/空串不过滤。分类过滤加在可见性条件之后，文件夹也参与筛选。
- **分类列表**：`GET /api/project/categories`（`project:list` 或 admin）返回 `List<ProjectCategoryView>`，元素 `{name,count}`；空/空白分类归「未分类」，按 count 降序、name 升序。可见性沿用 `listCategories` 自己的口径：管理员全量，其他只认 `create_by` + partner `type IN (1,2)`（**不含 type 3 与 t_class_resource 班级分配**）；`count` 统计所有可见项目（**包含文件夹**）。
- **前端分类树**：`ProjectCategoryTree` 调 `/api/project/categories`，根「全部分类」+ 各分类 count；与文件夹树**互斥**：选分类时清空 `parentId`/面包屑，选文件夹或根「全部」时清空分类。分类筛选与文件夹筛选不会叠加成两个条件。窗口重新获得焦点/`visibilitychange` 时静默刷新（1s 节流），从设置页返回能看到新分类/新 count；批量改分类成功后父组件也递增 `treeToken`。
- **新建/编辑**：新建弹窗与重命名弹窗都用 `AutoComplete` 填分类（候选取自 `/api/project/categories`，也可自由输入；留空=未分类）；新建时若当前正按某分类筛选，默认沿用该分类。从题库组卷创建的项目，先创建再补写分类；失败只提示，不挡进编辑器。
- **列表列与操作**：列表新增「分类」列（文件夹显示「—」）；操作列改为一级链接，按权限渲染设置/编辑/数据/复制链接/开启关闭/重命名/删除；不再有「更多」下拉。
- **已知限制**：后端不做分类枚举/长度校验，只有 DB `varchar(64)` 兜底，超 64 会报数据库错误；保存时会 trim 首尾空白，大小写与**内部空格**不同算不同分类；清空分类依赖显式传空串（`undefined`/不传表示不改）；分类 count 含文件夹，与右侧非 folder 列表的条数可能不同。

### 0.3 试卷设置页与批量分类（P9）

- **入口**：`/survey/:id` 概述页（`Overview.tsx`，`project:detail` 可看，保存按钮只对有 `project:update` 的账号渲染）。新增「基本信息」Card（`lg=16`）：项目名称 Input（必填、trim）+ 分类 AutoComplete（候选 `/api/project/categories`，可自由输入，留空=未分类）。
- **保存**：`onSave` 调 `updateProject({id, name, category, setting})`；分类空串显式清空为未分类，名称在本页可编辑。保存成功 `refreshSummary` 重新拉 `/api/project`，页头和返回列表后的名称/分类同步。发布状态仍单独走 `POST /api/project/status`，整包 setting 不负责 `t_project.status` 列。
- **布局重排**：Row1 基本信息（lg16）+ 每日收集（lg8；无数据只显示「还没有答卷数据 / 共 0 份」两行，不撑高）；Row2 答题显示 + 回收限制；Row3 考试控制 + 投放与分享；Row4 协作者（span24）。所有 Card `height:100%`、Row `align=stretch`，`Form.Item` 统一 `margin-bottom:14px`；`xs=24` 移动端单列。
- **批量分类**：`BatchSettingModal` 顶部新增「分类」行：Checkbox 启用 + AutoComplete（候选 `/api/project/categories`，过滤「未分类」，可自由输入，留空=未分类）。`hasAny` 把 `categoryEnabled` 纳入；应用顺序是 setting → folder（P13）→ category（逐个项目 `updateProject({id,category})`）→ 班级授权。
- **批量计数**：`updated` 改成按项目 id 的 `Set`，同一项目既改 setting、folder 或 category 只算一次；只改文件夹/分类时 `hasSettingChanges=false`，不会顺带写 setting。授权成功数仍单独统计；`onUpdated` 会关弹窗、清选择、递增项目分类树 `treeToken` 并重载列表。
- **已知限制**：分类仍是自由文本，无后端枚举/长度校验；清空分类依赖显式空串；批量分类只更新 `category`、不影响其他设置；批量分类逐个项目 `updateProject`，不是事务，中途失败会保留前面已成功的项目；项目名称在概述页可编辑，改完后列表/页头靠 `refreshSummary` 同步，不实时推给其他标签页。

### 0.4 项目三级授权（P12）

- **字段/迁移**：`t_project_partner.access_level tinyint NOT NULL DEFAULT 2`（迁移 `scripts/nas/migrate/36-partner-access-level.sql`，幂等）；`ProjectPartner` / `ProjectPartnerRequest` / `ProjectPartnerView` 都有 `accessLevel`。1=可查看，2=可编辑（含查看，默认），3=可授权（含编辑/查看）。
- **类型口径**：owner（type=1）固定 3；协作者/教师组（type=2）按请求级别；班级/学员答卷人（type=3）与外部导入答卷人（type=4）固定 1。迁移把历史 type=1 回填 3、type=3/4 回填 1，其余默认 2；新建项目的 owner 记录由 `addProjectPartner` 写 3。
- **接口**：授权/取消仍是 `/api/project/partner/create|delete`，调整级别是 `POST /api/project/partner/update {projectId?, id, accessLevel}`（只允许 type=2；`ProjectApi` 只做 `project:partner` 注解，真正闸门在 `ProjectPartnerService#assertCanGrant`）。
- **判定**：`ProjectPartnerService#accessLevel` 返回当前用户在该项目的 0/1/2/3；owner/admin/level3 可调成员（`assertCanGrant`），level2 可编辑项目内容（`ProjectServiceImpl#assertCanEditProject` 拦 updateProject/updateProjectStatus/deleteProject），level1 只能看。组授权按主组+附加组+祖先链继承级别。
- **前端**：`PartnerPanel`/授权弹窗显示级别 Tag 和下拉调整；教师组/协作者可选 1/2/3，班级/答卷人只读。当前 `ProjectView` 不返回 `myAccessLevel`，所以 level1/2 用户仍可能看到「授权」等全局按钮，点下去由后端 403 兜底；彻底隐藏要补 `ProjectView.myAccessLevel`（未做）。
- **已知**：level2 的协作者能编辑项目，但不能管理成员（成员管理要 3）；level3 才能继续授权；项目所有者删除接口仍受 `assertCanEditProject` 全权通过。

### 0.5 文件夹批量移动与设置页（P13）

- **设置页「所属文件夹」**：`/survey/:id` 基本信息卡新增 TreeSelect，候选来自 `GET /api/project/tree`（只保留 `mode=folder`，根 `'0'`）；回填 `project.parentId || '0'`。当前项目本身是 folder 时，候选会排除自己及整棵子树（`buildFolderOptions(..., project.id)`），防止把文件夹挂到自己下面；普通考试/问卷可挂到任意 folder。
- **保存**：`onSave` 的 `updateProject({id,name,category,parentId,setting})` 增加 `parentId`；留空/根目录统一传 `'0'`。名称、分类、文件夹、setting 一次保存；保存后 `refreshSummary` 重新拉项目，返回列表/文件夹树按新位置显示。
- **批量文件夹**：`BatchSettingModal` 顶部新增「文件夹」行：Checkbox + TreeSelect（`/api/project/tree` 仅 folder，根 `'0'`）；`hasAny` 纳入 `folderEnabled`。应用顺序是 setting → folder（逐个项目 `updateProject({id,parentId})`）→ category（逐项 `{id,category}`）→ 班级授权；`folderValue` 为空/根时传 `'0'`。
- **批量计数**：`updatedIds` 是项目 id 的 `Set`；同一项目同时改 setting/folder/category 只计一次，授权成功数另算。只勾文件夹/分类时 `hasSettingChanges=false`，不会顺带写 setting。
- **已知限制**：`parentId='0'` 表示根；批量移动是逐项 `updateProject`，非事务，中途失败会保留前面已成功的项目；文件夹重名仍只在前端同父校验，后端不拦；批量移动不改变项目名称/分类/setting（除非同时勾选对应项）；Overview 的文件夹候选只在进入页面时拉一次。

1. **创建**：列表页 `submitCreate` 调 `POST /api/project/create`。`ProjectServiceImpl.addProject` 先用 `completeSetting` 补齐默认设置（`status=0`、进度条/自动保存、空 `examSetting`），`normalizeCategory` 把分类 trim/空白转 null，生成 6 位 NanoId（不以数字开头），再写入一条 `t_project_partner`（`type=1 OWNER`、当前用户）。因此后续 `/project/update` 的 `@EnableDataPerm` 才能通过。
2. **列表**：`GET /api/project/list` 只返回根级项目（`parent_id IS NULL OR parent_id='0'`）；进文件夹必须显式带 `parentId`；分类筛选可同时走 `category`（见 0.2，选中分类时前端会清空 parentId）。可见性写在 SQL 的 EXISTS 子查询里，两个条件用 `and(...)` 包住：`t_project_partner` 中 `user_id=当前用户` 或 `group_id` 属于"主组 + 附加组 + 祖先链"（`UserDeptScopeService.DEPT_SCOPE_SQL`）且 `type IN (1,2,3)`；**或** `t_class_resource` 里本班（主组 + 附加组 + 祖先链）有这场考试的分配（`resource_type='project'`、`is_deleted=0`）。文件夹按 `mode='folder'` 排前，再按创建时间倒序。
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
| 分类列表/筛选 `/project/categories` | `project:list` 或 admin | 分类统计同样只认创建者/partner `type IN (1,2)`；count 含文件夹；空白归「未分类」 |
| 访问 `/project` 入口 | `project:list` | 有 `portal:teacher` 的账号重定向 `/teaching?tab=exam`；学员/无门户权限的只读账号渲染原列表 |
| 查看详情/设置 | `project:detail` + `@EnableDataPerm` | OWNER/COLLABORATOR（含组授权）或 admin |
| 新建/恢复 | `project:create` | 恢复还要求项目在 `getProjectPerms` 里 |
| 编辑题目/设置 | `project:update` + `@EnableDataPerm` | owner/admin 或 access_level>=2 协作者；level1 只能看（服务层再拦） |
| 发布开关 | `project:publish` + `@EnableDataPerm` | owner/admin 或 level>=2；level1 后端 403 |
| 删除/彻底删除 | `project:delete` + `@EnableDataPerm` | owner/admin 或 level>=2；彻底删除仍物理删 |
| 成员增删/导入/下载 | `project:partner` 或 admin + `assertCanGrant` | owner/admin/access_level=3 可改；level1/2 只能看（下载名单仍要 partner 权限） |
| 调整成员级别 | `project:partner` 或 admin + `assertCanGrant` | `POST /partner/update`；只能改 type=2 协作者，级别 1/2/3 |
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
- **分类 count 含文件夹**：`/api/project/categories` 统计的是所有可见项目（包括 folder），而右侧列表按分类筛选后可能包含 folder 行；不要把 count 当成「考试/问卷数」。
- **分类是自由文本，不是枚举**：后端只 trim 首尾空白，大小写与内部空格不同算不同分类；没有长度/枚举校验，超过 `varchar(64)` 由数据库报错。清空分类必须显式传空串（`category: ''`）；只传 `id+name` 的部分更新不会清空。
- **分类与文件夹互斥**：前端选中分类会清 `parentId`/面包屑，选中文件夹会清分类；后端本身可同时接受 `parentId + category`，如果绕过前端同时传，列表会按两个条件一起过滤（可能空列表）。
- **新建文件夹的重名校验只在前端**：`ProjectTree` 只比较当前父级的同层 folder 名称；后端 `createProject` 不校验重名，直接调接口可建同名文件夹。
- **项目三级授权不是「权限点」而是行级级别**：`t_project_partner.access_level` 只对 type=2 协作者/教师组有效；type=3 班级/学员与 type=4 导入答卷人固定 1，owner 固定 3。level2 可编辑项目但不能管理成员，level3 才能继续授权；level1 只能看。
- **level1/2 的 UI 仍显示全局按钮**：`ProjectView` 没有 `myAccessLevel`，列表/面板只能按功能权限渲染「授权/编辑」等按钮，level1/2 点进去由 `ProjectServiceImpl`/`ProjectPartnerService` 返回 403；不要把按钮可见当权限。
- **项目 owner 的 access_level=3**：迁移 36 回填/新建时写入；如果手工插入 owner 记录漏了 level，`accessLevel()` 仍按 type=OWNER 返回 3，但直接看库会看到默认 2，排查时以服务层判定为准。
- **文件夹移动的 root 是字符串 '0'**：Overview 留空、批量设置清空 TreeSelect 都会转成 `parentId='0'`；不要把 `null`/空串直接写库，否则列表根级过滤（`parent_id IS NULL OR '0'`）可能看不到。
- **Overview 排除自身/子树**：当前项目是 folder 时 `buildFolderOptions(..., project.id)` 过滤自己及 children；但后端没有循环校验，绕过前端直接 `updateProject({id,parentId})` 仍可把文件夹挂到自己的子树下。
- **批量文件夹/分类逐项执行**：setting → folder → category → 授权，每一步都是循环 `updateProject`/partner 调用，不是事务；中途失败保留已成功项目，`updated` 只统计已完成的项目。
- **分类统计与项目列表可见性不完全一致**：`listCategories` 只认创建者/partner `type IN (1,2)`，而 `/project/list` 还认 `type=3` 与 `t_class_resource` 班级分配；可能出现「列表里有项目、分类统计里没有/少 count」。
- **项目列表/回收站的 total 已排除匿名答卷**：P6 起 `ProjectServiceImpl` 两处 `t_answer` count 加 `is_anonymous=0`；不要把 total 当「含匿名提交」的总量。

## 验证

```bash
cd client && npm run check
npm run docs:check
```

手工回归：

1. 学员账号（只有 `project:list`/`project:answer`）打开 `/project` 仍看到"考试安排"，没有被重定向；只看到被授权的项目，没有"新建/回收站"入口，也不出现分类树。
2. 老师/管理员访问 `/project` 应重定向到 `/teaching?tab=exam`；`/teaching` 的「考试/问卷」Tab 只出现一份页头（ProjectList embedded），左侧是「分类 + 文件夹」双树，右侧列表随选中分类/文件夹切换。
3. 新建一个文件夹 → 再建一场考试放进该文件夹 → 树里文件夹 count 变为 1；重命名文件夹后面包屑同步、count 不丢；删除后树刷新。
4. 对一场 `loginRequired=true` 的考试点行内「复制链接」，文案应为「复制链接（需登录）」，粘贴出的地址是当前 origin 的 `/s/:id`；非 HTTPS 本地环境应弹出手动复制提示。
5. 老师建考试 → 列表出现 → 发布 → 学员能打开 `/s/:id`；关闭收集后再打开应提示"问卷已暂停回收"。
6. 协作者账号能看列表和答卷但改不了成员；项目所有者能加/删成员，组授权后组员能看到。
7. 删除项目 → 回收站能看到 → 恢复后回到列表；彻底删除后列表和回收站都不再出现。
8. 学生 A 在班级 X：给 X 分配一场考试后，A 的列表出现该考试；未分配该班的 B 打开链接应 404；把班级窗口设到未来/过去，A 打开分别提示未开始/已结束。
9. 把班级开关关掉（`t_class_resource.status=0`）→ A 打开提示「问卷已暂停回收」；重新打开后可正常进入。
10. 新建考试时填分类「保育员」→ 列表出现分类列；左侧「分类」树出现「保育员」且 count=1；点它右侧只剩该分类项目，点文件夹/「全部」会清空分类。
11. 选中「未分类」→ 只看到 `category` 为 NULL/空串的项目；把某项目分类清空（重命名弹窗留空保存）后它进入未分类；分类大小写/内部空格不同的值应分成不同项。
12. 分类树选择一个分类后，列表的「新建」默认沿用该分类；从题库组卷创建项目时分类应在创建成功后被补写；失败只提示、不挡编辑器。
13. 列表操作列不再出现「更多」；有权限的账号直接看到设置/编辑/数据/复制链接/开关/重命名/删除，文件夹只有重命名/删除。
14. 打开 `/survey/:id` 概述页：Row1 左侧「基本信息」可改项目名称/分类（AutoComplete 有候选项），保存后页头名称/分类更新，返回列表也同步；分类清空保存后变成「未分类」。
15. 概述页布局：基本信息(16)+每日收集(8) 同排且等高；无答卷时每日收集只显示两行；答题显示/回收限制、考试控制/投放与分享各占一排，协作者整行；窄屏（<lg）应单列，卡片不出现高低不齐。
16. 选中多个项目 → 批量设置只勾「分类」并填一个值：只改这些项目的 category（setting 不变），提示的「已更新 N 项」按项目去重；填空保存后项目进入「未分类」；同时勾 setting 与分类时也各只更新一次、计数不翻倍。
17. 在 `ProjectTree` 当前文件夹下点「新建文件夹」→ 填写名称 → createProject({mode:'folder',parentId}) 成功，树/右侧列表刷新；同一父级输入同名 folder 应前端提示「同一位置已有同名文件夹」；换父级可建同名；后端不拦重名。
18. 三级授权：给协作者设 level1 → 其能看项目但调 `/project/update`/`/project/status` 应 403；设 level2 → 可编辑但不能加/改成员；设 level3 → 可打开授权面板并继续授权；班级/答卷人记录只读；owner 记录 access_level=3。
19. 打开一个考试/问卷的 `/survey/:id`：基本信息卡「所属文件夹」TreeSelect 回填当前 parentId；选根目录保存后 parentId='0'，选文件夹后列表/文件夹树位置同步；当前项目是 folder 时，候选不应出现自己/子树。
20. 批量设置勾「文件夹」并选一个 folder：只移动所选项目的 parentId，名称/分类/setting 不变；选根目录传 '0'；与分类/setting/授权同时勾选时同一项目只计一次；中途失败保留已移动项目，提示计数按成功项目。

## 相关文档

- [考试编辑器与题型](./survey.md)
- [答卷、判分与报表](./answer.md)
- [从题库组卷到考试](../flows/repo-compose.md)
- [建班、加学员、分配老师与数据可见范围](../flows/class-grant.md)
- [权限、角色与用户组](./permissions.md)
- [数据模型](../architecture/data-model.md)
