---
id: module-repo
title: 题库与题目
status: current
keywords:
  - 题库
  - 题目
  - 导入导出
  - 导出弹窗
  - 导入模板
  - 班级分配
  - 题库窗口
  - 全局开放期
  - openStartAt
  - openEndAt
  - 学员题库详情
  - 题库分类
  - 分类文件夹
  - RepoCategoryTree
  - 题库授权
  - 授权级别
  - access_level
  - 三级授权
  - repo:grant
  - repo:export
  - template:import
  - t_repo
  - t_template
  - t_repo_partner
source_globs:
  - client/src/pages/repo/**
  - server/api/src/main/java/cn/surveyking/server/api/RepoApi.java
  - server/api/src/main/java/cn/surveyking/server/api/TemplateApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RepoPartnerServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/TemplateServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/RepoMapper.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/Repo.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/RepoPartner.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/RepoCategory.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/RepoCategoryMapper.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/RepoCategoryView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/RepoCategoryRequest.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/RepoPartnerRequest.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/RepoPartnerView.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateExcelParseHelper.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateI18n.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/RepoRequest.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/RepoView.java
  - scripts/nas/migrate/32-repo-open-window.sql
  - scripts/nas/migrate/35-repo-category.sql
  - scripts/nas/migrate/36-partner-access-level.sql
entrypoints:
  - client/src/pages/repo/List.tsx
  - client/src/pages/repo/RepoCategoryTree.tsx
  - client/src/pages/repo/Questions.tsx
  - client/src/pages/repo/RepoExportModal.tsx
  - client/src/pages/repo/GrantModal.tsx
  - server/api/src/main/java/cn/surveyking/server/api/RepoApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java
apis:
  - GET /api/repo/list
  - GET /api/repo/categories
  - POST /api/repo/categories/create
  - GET /api/repo/detail
  - POST /api/repo/create
  - POST /api/repo/update
  - POST /api/repo/delete
  - POST /api/repo/import
  - GET /api/repo/export
  - POST /api/repo/export/token
  - POST /api/repo/pick
  - GET /api/repo/partner/list
  - POST /api/repo/partner/create
  - POST /api/repo/partner/update
  - POST /api/repo/partner/delete
  - GET /api/template/list
  - POST /api/template/update
  - POST /api/template/delete
tables:
  - t_repo
  - t_repo_category
  - t_template
  - t_repo_partner
  - t_class_resource
  - t_tag
  - t_user_book
tests:
  - client:npx tsc --noEmit
  - docs:npm run docs:check
last_verified: 2026-11-10
verified_against: d6dc54f68daad66f319455a951f620bc8f809560
---

# 题库与题目

## 30 秒摘要

题库（`t_repo`）是题目的容器，题目（`t_template`）挂在题库下。这一层负责：题库列表与增删改、题目浏览与单题编辑、Excel 导入导出、从题库抽题组卷、按用户组/按人授权题库（P12 三级授权）、按班级分配题库（P2）、题库全局开放期与班级窗口硬上限（P3）、题库分类/空文件夹侧栏（P11），以及学员的错题本（`t_user_book`）。它**不负责**考试的生命周期（创建、发布、作答、判分）——那是 project/answer 模块；也**不负责**练习作答页——那是 exercise 模块。后端入口是 `RepoApi`，绝大部分规则落在 `RepoServiceImpl` 与 `RepoPartnerServiceImpl`；前端入口在 `client/src/pages/repo/`。

## 什么时候看这篇

- 题库列表出现「空的」「只有自己的」「管理员也看不到别人建的」之类问题。
- 要改题库/题目的字段、标签、分类、排序，或新增一个题库接口。
- 导入 Excel 报错、导入后题目被覆盖、导出文件为空或缺少某种题型。
- 「从题库组卷」抽不到题、抽到的题不对、总分和预期不一致（详细链路见 [repo-compose](../flows/repo-compose.md)）。
- 要把题库授权给班级/个人，或排查「授权了但看不到」。
- 班级分配了题库，学员列表能看到但打不开题目或练习。
- 题库开放时间设错、清不掉，或班级窗口提示「题库开放时间必须在全局开放时间内」。
- 需要确认老师、学员分别能对题库做什么（老师题库默认可读，授权级别见 P12）。
- 题库分类树看不到空文件夹/计数不对，或授权了「可编辑」仍改不了题库。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 题库列表页 | `client/src/pages/repo/List.tsx` | 双栏：左侧分类树 + 右侧题库表；工具栏上移（新建/搜索/导出等）；新建/编辑含分类 AutoComplete 与「全局开放时间」RangePicker；按钮按 `repo:create/update/delete/grant/export/practice` 渲染 |
| 题库分类树 | `client/src/pages/repo/RepoCategoryTree.tsx` | `GET /api/repo/categories` 扁平列表按 `/` 拆树；根「全部分类」+ 各路径 count；「新建分类文件夹」→ `/categories/create`；选中 path 过滤列表 |
| 题目页 | `client/src/pages/repo/Questions.tsx` | 题目表格、单题编辑、导入 Excel、导入旁「下载模板」、导出 xlsx；读取权限与导入/导出权限分开判定 |
| 导出弹窗 | `client/src/pages/repo/RepoExportModal.tsx` | 列表页/题目页共用：未设导出密码直接下载；设了密码先换一次性 token，再走 `/api/repo/export` |
| 授权弹窗 | `client/src/pages/repo/GrantModal.tsx` | 按用户组或按人授权，选择 access_level（1 可查看/2 可编辑/3 可授权）；组树来自 `/api/system/dept/list`，人来自 `/api/system/user/options`；成员行可改级别 |
| 错题本/练习册 | `client/src/pages/repo/Book.tsx`、`BookPractice.tsx` | 学员的错题与收藏，数据表 `t_user_book` |
| 前端请求 | `client/src/api/index.ts` | `getWithPagination`、`post`、`download`；导出/导入都走它 |
| 题库接口 | `server/api/src/main/java/cn/surveyking/server/api/RepoApi.java` | `@PreAuthorize` 与导出守卫；`/repo/pick`、`/repo/import` 也在这里 |
| 题目接口 | `server/api/src/main/java/cn/surveyking/server/api/TemplateApi.java` | `/template/list` 允许 `template:list`、`repo:detail`、`repo:questions:read` |
| 业务实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java` | 可见性 `assertReadableRepo`、管理权 `assertManageRepo`（owner/admin/level>=2）、分类树 `listRepoCategories`、建分类、抽题、导入导出 |
| 授权实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/RepoPartnerServiceImpl.java` | `t_repo_partner` 增删查/改级别；组授权解析走 `UserDeptScopeService`；成员管理 `assertManagePermission`（owner/admin/level3）；`hasPracticePermission` 也认班级分配 |
| 题目实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/TemplateServiceImpl.java` | 题目列表、单题更新/删除，以及题库可读性判断（`isReadableRepo` 认班级分配） |
| 班级分配 | `server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java` | `t_class_resource` 的 repo 行：列表只判断「有没有分配」，`canStudentReadRepo` 校验班级开关 → 题库全局期 → 本班窗口 |
| 题库全局开放期 | `server/rdbms/.../domain/model/Repo.java`、`server/shared/.../dto/RepoRequest.java`、`RepoView.java`、`init-mysql.sql`、`scripts/nas/migrate/32-repo-open-window.sql` | `t_repo.open_start_at/open_end_at`（datetime，NULL=不限）；`RepoServiceImpl#updateRepo` 显式 set，支持清空 |
| 统计 SQL | `server/rdbms/src/main/java/cn/surveyking/server/mapper/RepoMapper.java` | 每个题库的题量、题型分布、标签分布 |
| 数据表 | `t_repo`、`t_repo_category`、`t_template`、`t_repo_partner`、`t_class_resource`、`t_tag`、`t_user_book` | 题库、分类目录、题目、授权（含 access_level）、班级分配、标签、错题本 |
| Excel 解析 | `server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateExcelParseHelper.java` | 按 sheet 名分题型解析，行级安全校验 |
| Excel 文案 | `server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateI18n.java` | sheet 名与表头的中英文别名，导入导出共用 |

## 关键流程

1. **题库列表**：`List.tsx` 调 `GET /api/repo/list`（`name`、`category`、`sortBy`、`memberOnly`）。`category` 是**精确值**（前端传分类树的 path，不做 trim/规范化）；`RepoApi.listRepo` 在调用方没有 `repo:list` 时强制 `isPractice=true`、`memberOnly=true`；`RepoServiceImpl.listRepo` 对管理员不加成员条件，对其他人按「自己创建 / 共享 / 逐个授权 / 所属组授权 / 本班在 `t_class_resource` 有 repo 分配」收窄（班级分配只对非管理员生效，实际只影响学员）。列表返回后逐行补题量、标签分布、题型分布；排序走 `applyRepoOrder` 白名单（`name`、`category` 用 GBK 转码实现拼音序）。
2. **题目列表**：`Questions.tsx` 调 `GET /api/template/list?repoId=...`。`TemplateApi.listQuestionTemplate` 接受 `template:list`、`repo:detail`、`repo:questions:read` 三者之一；`TemplateServiceImpl.listTemplate` 先用 `assertReadableRepo` 校验题库可读，再分页查题目。题库名从路由 state、`?repoName=`、或 `GET /api/repo/detail` 依次兜底。`/api/repo/detail` 现在接受 `repo:detail` 或 `repo:questions:read`，但服务层仍走 `assertReadableRepo`（管理员/创建者/共享/partner/班级分配），学员只能读可见题库。
3. **导入题目**：`Questions.tsx` 用 `FormData` 提交 `repoId` 与 `file` 到 `POST /api/repo/import`（权限 `template:import`，管理员放行）。导入按钮旁的「下载模板」调 `GET /api/file/downloadTemplate?name=题库导入模板`（白名单与别名见 [files](./files.md)）。`RepoServiceImpl.importFromTemplate` 调 `RepoTemplateExcelParseHelper.parse` 解析出 `TemplateRequest` 列表，再进 `batchAddRepoTemplate`：同一题库里「序号 + 题型」都相同的题目会更新，否则新增；成功后写一条 `IMPORT_REPO` 审计。
4. **导出题目**：入口有两处，都只在有 `repo:export` 时显示——题库列表每行「导出」与题目页右上角「导出」，共用 `RepoExportModal`。
   - 打开弹窗先读 `GET /api/system` 的 `setting.exportPasswordEnabled`：为 `false` 时**直接自动开始下载**，不再让用户对着空密码框猜；为 `true` 才显示密码输入。
   - 下载流程：`POST /api/repo/export/token`（密码换一次性 token，60 秒、绑定用户、用一次即失效）→ `GET /api/repo/export?id=...&exportToken=...`。密码只走 POST body，URL 里只出现 token。
   - `ExportGuardService` 校验密码/令牌（系统未配置密码时直接放行），`RepoServiceImpl.exportRepoQuestions` 用 fastexcel 生成「单选/多选/判断/填空/简答」多个 sheet，最后写一条 `EXPORT_REPO` 审计。
5. **授权题库**：`GrantModal.tsx` 调 `GET /api/repo/partner/list` 展示已有授权；新增走 `POST /api/repo/partner/create`，传 `deptId` 表示按组、传 `userIds` 表示按人；取消走 `/partner/delete`。组授权只存一条 `dept_id` 记录，组员靠「主组 + 附加组 + 祖先链」自动继承；接口要求 `repo:grant` 或管理员，服务层再要求调用者是题库创建者或管理员。
6. **抽题**：`POST /api/repo/pick` 的请求体是 `ProjectSetting.RandomSurveyCondition` 列表（`repoId`、`types`、`questionsNum`、`examScore`、可选 `tags`）。`pickQuestionFromRepo` 对每个条件先 `assertReadableRepo`（认班级分配），按题型/标签过滤，`Collections.shuffle` 后截断到 `questionsNum`，给每道题写入 `examScore`，跨条件按题目 id 去重，最后按题型排序返回 `SurveySchema` 列表。

### 按班级分配题库（P2）

1. 数据：`t_class_resource` 一行 = 班级 + `resource_type='repo'` + 题库；由班级管理页「考试与问卷 / 题库」面板的「题库」页签维护（见 [teaching](./teaching.md)）。
2. 可见性：`RepoServiceImpl#listRepo` 的非管理员分支追加 `CLASS_REPO_ASSIGN_SQL`——本班（主组 + 附加组 + 祖先链）在 `t_class_resource` 上有该题库的分配就可见；`t_class_resource.is_deleted=0` 必须显式过滤。
3. 题库列表/资源面板只判断「有没有分配」，不判断状态/窗口；真正打开时 `ClassResourceService#canStudentReadRepo` 会校验「班级开关 → 题库全局开放期 → 本班窗口」，关闭/未开始/已结束返回 false。
4. 读题目/模板：`TemplateServiceImpl#isReadableRepo` 放行班级分配，`/api/template/list` 接受 `repo:questions:read`（学员有）；因此学员能看被分配题库的题目。
5. 练习入口：`/api/repo/pick` 接受 `repo:detail` 或 `repo:book`，`RepoServiceImpl#assertReadableRepo` 认班级分配；旧 `PublicProjectLoader` 的练习入口走 `RepoPartnerServiceImpl#hasPracticePermission`，同样认班级分配，但要求 `repo.isPractice=true`。
6. **`/api/repo/detail` 接受 `repo:detail` 或 `repo:questions:read`**：学员有 `repo:questions:read`，所以能调详情，但仍只限「自己可见」的题库（共享 / partner / 班级分配）；没分配/窗口未开放时 `assertReadableRepo` 会拒绝。
7. 删除题库：`RepoServiceImpl#deleteRepo` 调 `ClassResourceService#removeByResource("repo", id)` 清掉该题库的 `t_class_resource` 行（逻辑删），但**仍不清理 `t_repo_partner`**。

### 题库全局开放期与班级窗口硬上限（P3）

1. 字段：`t_repo.open_start_at` / `open_end_at`（datetime NULL，留空=不限）；迁移 `scripts/nas/migrate/32-repo-open-window.sql` 幂等加列。实体/DTO 为 `Repo.openStartAt/openEndAt`、`RepoRequest.openStartAt/openEndAt`、`RepoView.openStartAt/openEndAt`。
2. 前端入口：题库列表的新建/编辑弹窗都加「全局开放时间」RangePicker；提交 epoch 毫秒，留空提交 `null` 表示不限。编辑是整表单保存，**清空时间 = 不限**；`updateRepo` 用显式 `lambdaUpdate().set(...)` 写这两列，因为 `updateById` 会跳过 null。
3. 语义：题库全局开放期是**班级窗口的硬上限**。班级资源 assign/update 时，`ClassResourceService#assertRepoAssignable` 校验：开始不为空且早于全局开始 → 400「题库开放时间必须在全局开放时间内」；结束不为空且晚于全局结束 → 同样报错；班级窗口为空 = 继承全局。
4. 返回：`ClassResourceView.globalStartAt/globalEndAt` 对 repo 回填题库全局期（不再恒为 null）；前端资源面板显示真实全局时间。
5. 判断顺序：repo 的 `effectiveStatus` / 学员可读都按 **班级开关 → 题库全局开放期 → 本班窗口（为空用全局）**；任一环节不通过即 `CLOSED/NOT_STARTED/ENDED` 或读接口 403。
6. 已知限制：题库已有班级窗口超出新设全局期时**不会自动修正**；学生按硬上限判（全局期外直接不可用），老师需重新设班级窗口。题库列表仍不按窗口过滤。

### 题库分类与文件夹（P11）

1. **数据**：新表 `t_repo_category`（`id/name/parent_id/path/create_at/create_by`，`path` 唯一，迁移 `scripts/nas/migrate/35-repo-category.sql`）。它是「目录登记表」，只负责空文件夹和目录名；题库自己的分类仍是 `t_repo.category`（自由文本），两者不是外键关系。表里没有 `is_deleted`，删目录就是真删，题库的 category 不受影响。
2. **列表接口**：`GET /api/repo/categories`（`repo:list` 或 admin）返回**扁平** `RepoCategoryView`：`id / name / parentId / path / parentPath / count`。数据源 = 登记表全部路径 ∪ 当前用户可见题库的 `category` 去重值；逐段补齐祖先（如 `保育员/初级` 自动补 `保育员`）；同一路径只出现一次。`count` 是该路径下（含子目录）**可见题库数**，由题库所在路径向祖先累加；没有分类的题库归「未分类」（`path=''`，只在真的存在时返回）。返回顺序是父在前、子紧跟的前序，同层按 name 排。
3. **创建接口**：`POST /api/repo/categories/create`（`repo:create` 或 admin），body `{name, parentId? , parentPath?}`。name 必填、不能含 `/`、trim；parentId 优先于 parentPath（parentPath 给「t_repo.category 已有层级但没登记」用）；path 长度上限 255；同名 path 返回 400「分类已存在」，并发由唯一键兜底。建空文件夹不需要挂题库。
4. **前端**：`RepoCategoryTree` 按 `/` 拆树，根「全部分类」+ 各路径 count；标题旁「新建分类文件夹」（`repo:create`）；选中节点把 `path` 传给 `/api/repo/list?category=` 过滤，新建成功后重拉树并选中新路径。「未分类」只在有未分类题库时显示数量，节点 `selectable=false`，不能当筛选值（`listRepo` 没有对应的精确 category 值）。
5. **双栏列表**：题库列表左侧分类树 + 右侧表格，工具栏上移；新建/编辑题库的分类用 `AutoComplete`（候选来自 `/categories` 的 path，可自由输入；`repo.category` 仍按原字段写入）。新建/删除/改名后递增 `treeToken`，树重新拉 counts。
6. **已知限制**：分类 registry **全局可见**（空文件夹对所有能看分类树的人显示，不按创建者过滤）；`t_repo.category` 是 `varchar(64)`，而登记表 `path` 是 255，深层路径可能能建目录但放不进题库 category；`listRepo` 的 category 过滤是**原始精确值**，不 trim/不把反斜杠转 `/`，手工写库的前后空白/反斜杠会导致树里能看见但筛选不到；目录没有删除接口/前端入口；未分类不能筛选。

### 题库三级授权（P12）

1. **字段/迁移**：`t_repo_partner.access_level tinyint NOT NULL DEFAULT 2`（迁移 36，幂等）；`RepoPartner` / `RepoPartnerRequest` / `RepoPartnerView` 都有 `accessLevel`。1=可查看，2=可编辑（含查看，默认），3=可授权（含编辑/查看）。
2. **接口**：新增/取消仍是 `/api/repo/partner/create|delete`；调整级别 `POST /api/repo/partner/update {repoId?, id, accessLevel}`（`repo:grant` 或 admin 注解，服务层再判）。列表 `/partner/list` 只要求 `repo:list`，但服务层 `assertManagePermission` 要求 owner/创建者/admin/level3，所以 level1/2 实际打不开授权列表。
3. **判定**：题库创建者/admin 全权；`RepoServiceImpl.assertManageRepo` 对题库内容写操作要求 access_level>=2（level1 只读）；`RepoPartnerServiceImpl.assertManagePermission` 对「改成员/改级别」要求 access_level>=3。组授权一条 `dept_id` 记录，组员按主组+附加组+祖先链继承级别；个人授权按 `user_id`。
4. **前端**：`GrantModal` 新增级别下拉（1 可查看/2 可编辑/3 可授权）与成员行级别 Tag/修改；`RepoList` 的授权入口仍按 `repo:grant` 渲染。`RepoView` 没有 `myAccessLevel`，level1/2 仍可能看到全局「授权/编辑」按钮，点下去后端 403 兜底。
5. **已知**：级别只对 `t_repo_partner` 行有意义，owner 记录迁移/新建写 3；共享题库（`shared=1`）所有能进题库列表的人可读，不受级别限制；班级分配是另一条可见性/读闸门，不参与 partner level；授权级别 2 可改题库内容但不能改成员。

## 修改指南

### 改行为

1. 先判断改的是「可见性/管理权」还是「数据本身」：前者在 `RepoServiceImpl.assertReadableRepo`、`assertManageRepo`、`RepoPartnerServiceImpl.assertManagePermission`，后者在列表、导入、导出、抽题的具体方法里。
2. 改可见性口径时，必须同时检查 `TemplateServiceImpl.isReadableRepo`（题目读取）、`RepoPartnerServiceImpl.hasPracticePermission`（旧练习入口）、`ClassResourceService.canStudentReadRepo`（班级分配）、`UserDeptScopeService`（组链解析）和 `TeachingMapper.listClasses`（学情聚合），否则会出现「列表能看见、点进去 403」。
3. 改权限串时同步四处：`PermissionEnum`、`init-mysql.sql` 的角色种子、`scripts/nas/migrate/` 的新迁移、前端 `can(authorities, '...')` 判定。
4. 改前端按钮权限时只认`can()`，不要手写 `ROLE_admin` 放行；管理员对学员专属权限（`repo:practice`、`repo:book`）不应因此出现练习入口。

### 新增字段/接口

1. 后端：`Repo` 实体 → `RepoRequest`/`RepoView` → `RepoMapper`/`RepoViewMapper` → `RepoServiceImpl`。
2. 数据库：改 `init-mysql.sql`，同时在 `scripts/nas/migrate/` 加一份幂等迁移；有数据的库不要重跑初始化脚本。
3. 接口：在 `RepoApi` 加映射并写明 `@PreAuthorize`；涉及单题库的读/写，服务层要再调 `assertReadableRepo`/`assertManageRepo`。
4. 前端：补 `RepoView` interface、表单字段与请求参数；最后更新本页 frontmatter 的 `source_globs` 与 `apis`。

### 改导入/导出模板

1. sheet 名与表头以 `RepoTemplateI18n` 为准（中英文别名都认），改文案要同时考虑导入解析与导出表头。
2. 解析逻辑在 `RepoTemplateExcelParseHelper` 的 `parseRadioOrJudge`、`parseCheckbox`、`parseFillBlank`、`parseTextarea`；新增题型要先确认 `SheetType` 与导出 sheet 都有对应实现。
3. 导出列在 `RepoServiceImpl.exportRepoQuestions` 里逐题型拼装，改完先用「导出 → 原样导入」做一次闭环验证。

## 权限与数据范围

| 动作 | 权限 | 数据范围 |
|---|---|---|
| 查看题库列表 | `repo:list`（或 `exercise:list` 兜底） | 管理员全量；其他人 = 自己创建 + 共享 + 按人授权 + 所属组授权（主组 + 附加组 + 祖先链）+ 本班在 `t_class_resource` 有 repo 分配；无 `repo:list` 时强制只查练习库且只查成员范围 |
| 查看题库详情 | `repo:detail` 或 `repo:questions:read` | 管理员 / 创建者 / 共享 / partner / 班级分配；接口注解放宽后仍走 `RepoServiceImpl#assertReadableRepo`，学员只能读自己可见的题库 |
| 查看题库题目 | `template:list` 或 `repo:detail` 或 `repo:questions:read` | 题库必须可读；学员用 `repo:questions:read`，班级分配在 `isReadableRepo` 放行 |
| 新建题库 | `repo:create` | 无数据范围限制 |
| 查看/新建分类 | `repo:list` / `repo:create` | 分类树按当前用户可见题库统计；空目录登记表全局可见；新建目录需要 `repo:create` |
| 修改题库/题目 | `repo:update`、`template:update` | admin/创建者或 access_level>=2 的成员（含组授权）；level1 只能看 |
| 删除题库/题目 | `repo:delete`、`template:delete` | admin/创建者或 access_level>=2；删除题库会连带删题目与标签 |
| 导入题目 | `template:import` | admin/创建者或 access_level>=2；导入旁「下载模板」还要 `file:import`/`template:import` |
| 导出题库 | `repo:export` | 题库可读即可导出；未配置导出密码时直接下载，配置后需密码换 token |
| 授权/改级别 | `repo:grant` 或管理员 | 服务层 `assertManagePermission`：owner/创建者/admin/access_level=3；可授权到组或人，`POST /partner/update` 调 1/2/3 |
| 错题本/收藏 | `repo:book` | 只操作自己的 `t_user_book` 记录 |
| 抽题组卷/练习抽题 | `repo:detail` 或 `repo:book` 或管理员 | 每个被抽的题库都要可读；班级分配在 `assertReadableRepo` 放行；旧练习入口还要求 `isPractice=true` |

> 角色现状（仅题库域）：老师只有 `repo:list`、`repo:detail`、`repo:grant`、`template:list`、`template:import`，**没有** `repo:create/update/delete`、`repo:export` 与题目写权限；但被授到 access_level>=2 后可编辑题库、>=3 可继续授权（权限串与级别是两层）。学员只有 `repo:list`、`repo:questions:read`、`repo:book`、`repo:practice`——学员没有 `repo:detail`，但 `/api/repo/detail` 现在也接受 `repo:questions:read`。

## 坑与已知限制

- `updateRepo` 会先按 `entity_id` 删光题库标签，再用请求里的 `tag` 重建。只传 `id + name` 的调用会把标签清空；前端改名时必须把 `tag/category/mode/shared/isPractice/...` 原样带回。
- `deleteRepo` 只删题库、题目、标签，并清理 `t_class_resource` 的 repo 分配；**仍不清理 `t_repo_partner`**，会留下指向已删题库的授权行（目前只有删除用户组时才会清理组授权）。
- **`/api/repo/detail` 权限已放宽但仍受数据范围约束**：注解接受 `repo:detail` 或 `repo:questions:read`，学员能调；但服务层 `assertReadableRepo` 只放行管理员/创建者/共享/partner/班级分配，没分配/窗口未开放仍会 403。
- **题库全局开放期是班级窗口的硬上限**：`t_repo.open_start_at/open_end_at` 留空=不限；班级窗口非空端越界会被 `assertRepoAssignable` 拒绝（400「题库开放时间必须在全局开放时间内」）。
- **已存在的班级窗口不会随全局期变化自动修正**：老师把题库全局期改窄后，旧班级窗口可能仍超出；学生按硬上限判（全局期外不可用），需要老师重设班级窗口。
- **题库列表不按窗口/开关过滤**：`CLASS_REPO_ASSIGN_SQL` 只判断分配存在；班级开关关闭、未开始、已结束时列表仍可能显示，点开/练习才被 `canStudentReadRepo` 拒绝。
- **班级分配只对 student 生效**：`canStudentReadRepo` 对 staff/管理员/匿名返回 false，不会放宽教职工口径。
- **`ClassResourceService#assertStudentCanAccessRepo` 目前没有调用方**：实际读闸门是 `canStudentReadRepo`（RepoServiceImpl / TemplateServiceImpl / RepoPartnerServiceImpl 各自调用）；新增入口时不要误以为它已兜底。
- **`updateRepo` 是整表单保存**：清空全局开放时间（前端传 null）会通过显式 `set` 落 NULL；只传 `id+name` 的脚本/调用会连 `openStartAt/openEndAt` 一起清空，改题库时务必带上完整字段。
- 导出不含「多空填空」（`MultipleBlank`）：`exportRepoQuestions` 只处理单选、多选、判断、填空（单空）、简答；多空填空会丢。空题库导出会因 fastexcel 不允许 0 个 sheet 而 500，前端已提前拦截并提示。
- 导入是按「序号 + 题型」匹配的 upsert：同一题库里序号相同、题型相同的行会覆盖原题，不是追加。导入前先导出一份当模板最稳。
- `/api/project/selectRepo`（编辑器选题库）只返回「自己创建 + 共享」，没有管理员放行、也不含组授权/班级分配；但组卷弹窗 `ComposeModal` 用的是 `/api/repo/list`（含组授权与班级分配），不要按 `selectRepo` 的口径判断老师在组卷弹窗里能选到的题库。
- `shared`（共享题库）在题库列表页没有开关，只能通过接口或直接改库设置；共享后所有能进题库列表的人都能读。
- 老师虽然有 `repo:grant`，但服务层只允许「题库创建者/管理员/access_level=3 的成员」授权；老师没有 `repo:create/update`，只有被授到相应级别后才能编辑/转授。level2 能改题库内容但不能管理成员。
- `repo/export/token` 的一次性令牌存在进程内存里：后端重启、多实例部署都会导致令牌失效或校验不到。
- **未配置导出密码时前端直接下载**：`RepoExportModal` 读 `/api/system` 的 `exportPasswordEnabled`；如果系统设置刚被改过，前端可能先按「无需密码」发起，失败后会退回密码输入。不要在系统设置里只清空密码却保留旧的前端缓存。
- **「下载模板」只认白名单 name**：题库页固定传 `题库导入模板`；改成其它名字会 404（白名单在 files 模块）。
- 题库名/分类排序用 `CONVERT(... USING gbk)` 近似拼音序；生僻字不在 GBK 里会退化成其他顺序。
- `RepoQuery` 的注释只写了 `name/updateAt/createAt`，实际 `applyRepoOrder` 还支持 `category/mode/tag/total`；改排序逻辑时以方法实现为准。
- 列表里的「题量」是逐行实时统计（`t_template` 子查询），题库多时注意 N+1 式开销；标签/题型分布也是每个题库各查一次。
- **分类树 count 含子目录**：`/api/repo/categories` 的 count 是从题库路径向上累加的「含后代」数量；「未分类」节点不可筛选，只能看数量。
- **题库分类 registry 全局可见**：`t_repo_category` 的空文件夹不按创建者过滤，任何能看分类树的人都会看到；`t_repo.category` 是自由文本（varchar64），`path` 是 255，深层目录可能能建但无法写进题库。
- **`listRepo` 的 category 是原始精确值**：前端传分类树 path；手工写库的前后空白/反斜杠不会自动规范化，树里能看见但筛选不到。
- **三级授权是行级级别，不是权限串**：`access_level>=2` 才能改题库内容，`>=3` 才能改成员/授权；level1 只读。`RepoView` 没有 `myAccessLevel`，level1/2 仍可能看到全局授权/编辑按钮，后端 403 兜底。
- **owner 记录写 3**：迁移 36 回填 type=1 owner=3；新建题库 owner 由服务层写 3。共享（shared=1）仍对所有能进题库列表的人可读，不受级别限制。

## 验证

```bash
cd client && npx tsc --noEmit
npm run docs:check
```

预期：类型检查通过，`docs:check` 对本模块无报错。

手工冒烟（本地或 NAS 开发环境）：

1. 管理员建一个题库 → 导入一份按题型分 sheet 的 xlsx → 题目页能查到、能改单题。
2. 导出该题库 → 再导入同一文件 → 题量不翻倍（同序号同题型被更新）。
3. 把题库授权给一个用户组 → 组内学员在「题库列表」能看到，能点开题目但看不到新建/编辑/删除/导入/导出。
4. 在「教学管理 → 新建考试 → 从题库组卷」里选择该题库，能抽到题并生成试卷。
5. 管理员在系统设置里清空导出密码 → 题库列表/题目页点「导出」应直接开始下载；设置导出密码后 → 弹窗要求输入，错误密码提示「导出密码错误」，正确密码能下载。
6. 给班级分配一个题库（班级资源面板切到「题库」）：该班学生列表能看到；未分配该班的学生看不到；关闭/未开始/已结束窗口时学生打开题目或练习应被拒。
7. 学员直接用 `repo:questions:read` 调 `/api/repo/detail`：对本班被分配且窗口开放的题库应 200；未分配/窗口关闭/未开始/已结束应 403。没有 `repo:detail` 不再直接拦死。
8. 管理员给题库设全局开放期（例如 09:00~18:00），班级老师把班级窗口设到 08:00 或 19:00 应 400「题库开放时间必须在全局开放时间内」；设到 10:00~17:00 成功。
9. 把题库全局期改窄后，未重设的旧班级窗口不会自动修正；学生按全局硬上限判断，需老师重设班级窗口。
10. 题库分类树：新建空文件夹「安全生产/三级」→ 树里父路径自动补齐且可展开；右侧列表按 path 过滤；空文件夹 count 为 0；「未分类」只显示数量不可选；同名 path 再建应 400「分类已存在」。
11. 给老师授 level1：能看题库/题目，但改题库/导入/删除应 403；授 level2：能改题库内容，但打开授权列表/加成员应 403；授 level3：能打开授权并继续授人/组。owner/admin 不受级别拦截。
12. 迁移 36 后查库：`t_repo_partner.access_level` 默认 2；项目 owner=3、type=3/4=1；组授权一条 dept_id 记录，组员按主组+附加组+祖先链继承级别。

## 相关文档

- [班级与用户组](./teaching.md)：授权弹窗里的组树、班级与用户组的关系。
- [从题库组卷到考试](../flows/repo-compose.md)：抽题 → 建考试 → 发布 → 学情的完整链路。
- [权限与角色](./permissions.md)：权限串总表与历史基线。
- [功能范围](../architecture/scope.md)：题库模块「做了什么 / 不做什么」。
- [文档入口](../start/docs-workflow.md)：按任务定位其他模块。
