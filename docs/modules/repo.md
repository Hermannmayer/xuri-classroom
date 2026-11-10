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
  - 组卷
  - 题库授权
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
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/RepoMapper.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/Repo.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/RepoPartner.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateExcelParseHelper.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateI18n.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/RepoRequest.java
entrypoints:
  - client/src/pages/repo/List.tsx
  - client/src/pages/repo/Questions.tsx
  - client/src/pages/repo/RepoExportModal.tsx
  - client/src/pages/repo/GrantModal.tsx
  - server/api/src/main/java/cn/surveyking/server/api/RepoApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java
apis:
  - GET /api/repo/list
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
  - POST /api/repo/partner/delete
  - GET /api/template/list
  - POST /api/template/update
  - POST /api/template/delete
tables:
  - t_repo
  - t_template
  - t_repo_partner
  - t_tag
  - t_user_book
tests:
  - client:npx tsc --noEmit
  - docs:npm run docs:check
last_verified: 2026-11-10
verified_against: 1057ec3ad2393c70b42ef96dedecc0bea1d0150e
---

# 题库与题目

## 30 秒摘要

题库（`t_repo`）是题目的容器，题目（`t_template`）挂在题库下。这一层负责：题库列表与增删改、题目浏览与单题编辑、Excel 导入导出、从题库抽题组卷、按用户组或按人授权题库，以及学员的错题本（`t_user_book`）。它**不负责**考试的生命周期（创建、发布、作答、判分）——那是 project/answer 模块；也**不负责**练习作答页——那是 exercise 模块。后端入口是 `RepoApi`，绝大部分规则落在 `RepoServiceImpl` 与 `RepoPartnerServiceImpl`；前端入口在 `client/src/pages/repo/`。

## 什么时候看这篇

- 题库列表出现「空的」「只有自己的」「管理员也看不到别人建的」之类问题。
- 要改题库/题目的字段、标签、分类、排序，或新增一个题库接口。
- 导入 Excel 报错、导入后题目被覆盖、导出文件为空或缺少某种题型。
- 「从题库组卷」抽不到题、抽到的题不对、总分和预期不一致（详细链路见 [repo-compose](../flows/repo-compose.md)）。
- 要把题库授权给班级/个人，或排查「授权了但看不到」。
- 需要确认老师、学员分别能对题库做什么（老师题库只读，见下）。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 题库列表页 | `client/src/pages/repo/List.tsx` | 列表、新建/改名/删除、练习入口、批量授权、行内「导出」；按钮按 `repo:create/update/delete/grant/export/practice` 渲染 |
| 题目页 | `client/src/pages/repo/Questions.tsx` | 题目表格、单题编辑、导入 Excel、导入旁「下载模板」、导出 xlsx；读取权限与导入/导出权限分开判定 |
| 导出弹窗 | `client/src/pages/repo/RepoExportModal.tsx` | 列表页/题目页共用：未设导出密码直接下载；设了密码先换一次性 token，再走 `/api/repo/export` |
| 授权弹窗 | `client/src/pages/repo/GrantModal.tsx` | 按用户组或按人授权；组树来自 `/api/system/dept/list`，人来自 `/api/system/user/options` |
| 错题本/练习册 | `client/src/pages/repo/Book.tsx`、`BookPractice.tsx` | 学员的错题与收藏，数据表 `t_user_book` |
| 前端请求 | `client/src/api/index.ts` | `getWithPagination`、`post`、`download`；导出/导入都走它 |
| 题库接口 | `server/api/src/main/java/cn/surveyking/server/api/RepoApi.java` | `@PreAuthorize` 与导出守卫；`/repo/pick`、`/repo/import` 也在这里 |
| 题目接口 | `server/api/src/main/java/cn/surveyking/server/api/TemplateApi.java` | `/template/list` 允许 `template:list`、`repo:detail`、`repo:questions:read` |
| 业务实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java` | 可见性 `assertReadableRepo`、管理权 `assertManageRepo`、抽题、导入导出 |
| 授权实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/RepoPartnerServiceImpl.java` | `t_repo_partner` 的增删查；组授权解析走 `UserDeptScopeService` |
| 题目实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/TemplateServiceImpl.java` | 题目列表、单题更新/删除，以及题库可读性判断 |
| 统计 SQL | `server/rdbms/src/main/java/cn/surveyking/server/mapper/RepoMapper.java` | 每个题库的题量、题型分布、标签分布 |
| 数据表 | `t_repo`、`t_template`、`t_repo_partner`、`t_tag`、`t_user_book` | 题库、题目、授权、标签、错题本 |
| Excel 解析 | `server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateExcelParseHelper.java` | 按 sheet 名分题型解析，行级安全校验 |
| Excel 文案 | `server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateI18n.java` | sheet 名与表头的中英文别名，导入导出共用 |

## 关键流程

1. **题库列表**：`List.tsx` 调 `GET /api/repo/list`（`name`、`category`、`sortBy`、`memberOnly`）。`RepoApi.listRepo` 在调用方没有 `repo:list` 时强制 `isPractice=true`、`memberOnly=true`；`RepoServiceImpl.listRepo` 对管理员不加成员条件，对其他人按「自己创建 / 共享 / 逐个授权 / 所属组授权」收窄。列表返回后逐行补题量、标签分布、题型分布；排序走 `applyRepoOrder` 白名单（`name`、`category` 用 GBK 转码实现拼音序）。
2. **题目列表**：`Questions.tsx` 调 `GET /api/template/list?repoId=...`。`TemplateApi.listQuestionTemplate` 接受 `template:list`、`repo:detail`、`repo:questions:read` 三者之一；`TemplateServiceImpl.listTemplate` 先用 `assertReadableRepo` 校验题库可读，再分页查题目。题库名从路由 state、`?repoName=`、或 `GET /api/repo/detail` 依次兜底。
3. **导入题目**：`Questions.tsx` 用 `FormData` 提交 `repoId` 与 `file` 到 `POST /api/repo/import`（权限 `template:import`，管理员放行）。导入按钮旁的「下载模板」调 `GET /api/file/downloadTemplate?name=卷王题库导入模板`（白名单与别名见 [files](./files.md)）。`RepoServiceImpl.importFromTemplate` 调 `RepoTemplateExcelParseHelper.parse` 解析出 `TemplateRequest` 列表，再进 `batchAddRepoTemplate`：同一题库里「序号 + 题型」都相同的题目会更新，否则新增；成功后写一条 `IMPORT_REPO` 审计。
4. **导出题目**：入口有两处，都只在有 `repo:export` 时显示——题库列表每行「导出」与题目页右上角「导出」，共用 `RepoExportModal`。
   - 打开弹窗先读 `GET /api/system` 的 `setting.exportPasswordEnabled`：为 `false` 时**直接自动开始下载**，不再让用户对着空密码框猜；为 `true` 才显示密码输入。
   - 下载流程：`POST /api/repo/export/token`（密码换一次性 token，60 秒、绑定用户、用一次即失效）→ `GET /api/repo/export?id=...&exportToken=...`。密码只走 POST body，URL 里只出现 token。
   - `ExportGuardService` 校验密码/令牌（系统未配置密码时直接放行），`RepoServiceImpl.exportRepoQuestions` 用 fastexcel 生成「单选/多选/判断/填空/简答」多个 sheet，最后写一条 `EXPORT_REPO` 审计。
5. **授权题库**：`GrantModal.tsx` 调 `GET /api/repo/partner/list` 展示已有授权；新增走 `POST /api/repo/partner/create`，传 `deptId` 表示按组、传 `userIds` 表示按人；取消走 `/partner/delete`。组授权只存一条 `dept_id` 记录，组员靠「主组 + 附加组 + 祖先链」自动继承；接口要求 `repo:grant` 或管理员，服务层再要求调用者是题库创建者或管理员。
6. **抽题**：`POST /api/repo/pick` 的请求体是 `ProjectSetting.RandomSurveyCondition` 列表（`repoId`、`types`、`questionsNum`、`examScore`、可选 `tags`）。`pickQuestionFromRepo` 对每个条件先 `assertReadableRepo`，按题型/标签过滤，`Collections.shuffle` 后截断到 `questionsNum`，给每道题写入 `examScore`，跨条件按题目 id 去重，最后按题型排序返回 `SurveySchema` 列表。

## 修改指南

### 改行为

1. 先判断改的是「可见性/管理权」还是「数据本身」：前者在 `RepoServiceImpl.assertReadableRepo`、`assertManageRepo`、`RepoPartnerServiceImpl.assertManagePermission`，后者在列表、导入、导出、抽题的具体方法里。
2. 改可见性口径时，必须同时检查 `TemplateServiceImpl.isReadableRepo`（题目读取）和 `UserDeptScopeService`（组链解析），否则会出现「列表能看见、点进去 403」。
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
| 查看题库列表 | `repo:list`（或 `exercise:list` 兜底） | 管理员全量；其他人 = 自己创建 + 共享 + 按人授权 + 所属组授权（主组 + 附加组 + 祖先链）；无 `repo:list` 时强制只查练习库且只查成员范围 |
| 查看题库详情 | `repo:detail` | 同上（管理员 / 创建者 / 共享 / 被授权） |
| 查看题库题目 | `template:list` 或 `repo:detail` 或 `repo:questions:read` | 题库必须可读；学员用 `repo:questions:read` |
| 新建题库 | `repo:create` | 无数据范围限制 |
| 修改题库/题目 | `repo:update`、`template:update` | 管理员或题库创建者 |
| 删除题库/题目 | `repo:delete`、`template:delete` | 管理员或题库创建者；删除题库会连带删题目与标签 |
| 导入题目 | `template:import` | 管理员或题库创建者；导入旁「下载模板」还要 `file:import`/`template:import` |
| 导出题库 | `repo:export` | 题库可读即可导出；未配置导出密码时直接下载，配置后需密码换 token |
| 授权题库 | `repo:grant` 或管理员 | 管理员或题库创建者；可授权到组或到人 |
| 错题本/收藏 | `repo:book` | 只操作自己的 `t_user_book` 记录 |
| 抽题组卷/练习抽题 | `repo:detail` 或 `repo:book` 或管理员 | 每个被抽的题库都要可读 |

> 角色现状（仅题库域）：老师只有 `repo:list`、`repo:detail`、`repo:grant`、`template:list`、`template:import`，**没有** `repo:create/update/delete`、`repo:export` 与题目写权限；学员只有 `repo:list`、`repo:questions:read`、`repo:book`、`repo:practice`。

## 坑与已知限制

- `updateRepo` 会先按 `entity_id` 删光题库标签，再用请求里的 `tag` 重建。只传 `id + name` 的调用会把标签清空；前端改名时必须把 `tag/category/mode/shared/isPractice/...` 原样带回。
- `deleteRepo` 只删题库、题目、标签，不清理 `t_repo_partner`，会留下指向已删题库的授权行；目前只有删除用户组时才会清理组授权。
- 导出不含「多空填空」（`MultipleBlank`）：`exportRepoQuestions` 只处理单选、多选、判断、填空（单空）、简答；多空填空会丢。空题库导出会因 fastexcel 不允许 0 个 sheet 而 500，前端已提前拦截并提示。
- 导入是按「序号 + 题型」匹配的 upsert：同一题库里序号相同、题型相同的行会覆盖原题，不是追加。导入前先导出一份当模板最稳。
- `/api/project/selectRepo`（编辑器选题库）只返回「自己创建 + 共享」，没有管理员放行、也不含组授权；被授权的题库在编辑器里看不到，但组卷弹窗用的是 `/api/repo/list`，口径同样不含组授权（详见 [repo-compose](../flows/repo-compose.md)）。
- `shared`（共享题库）在题库列表页没有开关，只能通过接口或直接改库设置；共享后所有能进题库列表的人都能读。
- 老师虽然有 `repo:grant`，但服务层只允许「题库创建者或管理员」授权；老师没有 `repo:create`，所以授权入口对老师基本不可用（除非库里还有他早期创建的题库）。
- `repo/export/token` 的一次性令牌存在进程内存里：后端重启、多实例部署都会导致令牌失效或校验不到。
- **未配置导出密码时前端直接下载**：`RepoExportModal` 读 `/api/system` 的 `exportPasswordEnabled`；如果系统设置刚被改过，前端可能先按「无需密码」发起，失败后会退回密码输入。不要在系统设置里只清空密码却保留旧的前端缓存。
- **「下载模板」只认白名单 name**：题库页固定传 `卷王题库导入模板`；改成 `题库导入模板` 等别名会 404（白名单在 files 模块）。
- 题库名/分类排序用 `CONVERT(... USING gbk)` 近似拼音序；生僻字不在 GBK 里会退化成其他顺序。
- `RepoQuery` 的注释只写了 `name/updateAt/createAt`，实际 `applyRepoOrder` 还支持 `category/mode/tag/total`；改排序逻辑时以方法实现为准。
- 列表里的「题量」是逐行实时统计（`t_template` 子查询），题库多时注意 N+1 式开销；标签/题型分布也是每个题库各查一次。

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

## 相关文档

- [班级与用户组](./teaching.md)：授权弹窗里的组树、班级与用户组的关系。
- [从题库组卷到考试](../flows/repo-compose.md)：抽题 → 建考试 → 发布 → 学情的完整链路。
- [权限与角色](./permissions.md)：权限串总表与历史基线。
- [功能范围](../architecture/scope.md)：题库模块「做了什么 / 不做什么」。
- [文档入口](../start/docs-workflow.md)：按任务定位其他模块。
