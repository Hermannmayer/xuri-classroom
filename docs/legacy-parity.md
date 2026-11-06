# 旧前端功能盘点 × 新前端逐项对照

> 对象：`server/api/build/libs/surveyking-v1.13.0.jar` 内 `BOOT-INF/classes/static/` 的闭源 umi 构建产物（下称「旧前端」）
> 对照：`client/`（React 18 + AntD 5 重写，下称「新前端」）
> 范围口径：`docs/scope.md` 标注为「有意不做」的模块**不计入缺口**，单列在第 6 节。
> 快照说明：新前端工作区在本次核对期间**存在并行改动**（15:00 前后新增 `/repo/book/practice`、错题本「收藏/重点标记」等）。本文新前端侧以 **2026-11-06 15:12** 的工作树为准；此后新增的能力不在表内。

---

## 0. 结论摘要

- 旧前端不是「几个页面」：**39 条唯一路由 / 30 个页面 chunk / 124 个前端调用的接口 / 2115 个 i18n key（简·繁·日三语，含框架组件词条）/ 72 个权限串 / 30 种题型**，覆盖考试、问卷、题库、练习、数据、报表、系统管理、审批流、证书海报、AI 建卷。
- 新前端覆盖了「考试 + 问卷 + 题库 + 练习 + 数据/报表 + 基础系统管理」主干，主干上的**答题、判分、成绩单、公开查询、组卷、题库 CRUD、答卷回收站**都已对齐。
- 真正的差距集中在 5 处：**题型覆盖、公式/规则引擎、数据页运维能力、发布设置里的白名单/对外查询、微信与第三方登录**。另有 AI 建卷/AI 解析整块未接。

---

## 1. 材料与提取方法

### 1.1 材料

| 材料 | 位置 | 规模 | 来源 |
|---|---|---|---|
| 后端可执行 jar | `server/api/build/libs/surveyking-v1.13.0.jar` | 60.5 MB | 仓库 |
| 旧前端静态产物 | jar 内 `BOOT-INF/classes/static/` | 241 文件 / 15.3 MB（103 js + 61 css + 字体图片） | 【产物】 |
| 入口 | `static/umi.cc68a383.js` | 3.62 MB，`window.g_umi.version = "3.5.41"` | 【产物】 |
| 页面 chunk | `static/p__*.async.js` | 30 个（另有 `p__404`、2 个 layout） | 【产物】 |
| 清单 | `static/asset-manifest.json`、`index.html` | 页面 chunk ↔ 文件映射 | 【产物】 |
| 新前端 | `client/src/` | 92 个 ts/tsx，`router.tsx` 30 条 path 声明 | 仓库 |

解包落点：`%TEMP%\surveyking-legacy-static`（未写入仓库）。

### 1.2 提取手段（全部可复现）

1. **jar 解包**：`System.IO.Compression.ZipFile` 按 `BOOT-INF/classes/static/` 前缀抽取 241 个文件到系统临时目录。
2. **路由表**：在 `umi.<hash>.js` 中匹配 `path:"/..."` 字面量，去重得 **39 条唯一路由**，连同 `name` / `icon` / `authority` / `redirect` 一起还原；同时从 `function st(){var e=[...]}` 段落确认嵌套关系（`/survey/:id` 的 7 个子路由、`/repo` 的 4 个子路由等）。
3. **chunk 映射**：解析 webpack 运行时 `__webpack_require__.u`（chunkId → `p__Xxx.<hash>`）与 `r.e(<id>)` 调用，得到「路由 → 页面 chunk」的确定映射（例：`/system/setting` → `p__system__SystemSettings.1e747ea6`）。
4. **文案提取**：产物把中文写成 `\uXXXX` 转义（直接 grep 中文命中为 0），先把 `\uXXXX` 解码，再抽引号内字符串，按 chunk 落盘比对。
5. **i18n 目录**：`umi.js` 内嵌完整词条表，抽出 `"<id>":"<文案>"` 且值含中文的 5622 条（简/繁/日三语），去重后 **2115 个 key**（含 ProLayout/Quill/antd 组件自带词条）；按前缀分组：`pages.survey` 992、`pages.system` 215、`pages.project` 177、`pages.repo` 121、`pages.account` 97、`pages.answer` 75、`pages.exercise` 42、`pages.home` 48、`pages.login` 35、`pages.template` 20、`authority.*` 72。
6. **接口面**：`/api/...` 字面量去重 **124 条**；另用 `id→文案` 反查登录页、设置页的能力项。
7. **新前端对照**：读 `router.tsx`、`BasicLayout.tsx` 与各页面源码，配合按关键词 grep（`AI/文件夹/白名单/公式/打印/微信/绑定/收藏/…`）判定「有/无/部分」。

### 1.3 证据标记

| 标记 | 含义 |
|---|---|
| 【产物】 | 直接从 jar 解出的静态产物读到（路由、chunk 文案、i18n、接口字面量） |
| 【仓库】 | 新前端源码 / `docs/` 内文档 |
| 【文档】 | 仓库内的 `docs/scope.md`、`docs/permissions.md` 等既有结论 |
| 「无法从产物确认」 | 产物里只有路由/词条，推不出真实交互，或压缩后丢失了判断依据 |
| 【上游文档】 | 本次**未使用**外部上游文档（GitHub/Wiki）。所有结论均为产物 + 仓库源码，未做外部佐证 |

> 交叉参考说明：仓库内 `frontend-recon/` 是**另一份部署实例**的逆向记录（其中 `p__survey__Overview` 为 562 KB、还有 `p__Setup` 页；jar 里对应 chunk 只有 23 KB、且没有 `/setup` 路由）。因此本文所有结论以 jar 为准，`frontend-recon` 只用于印证方法，不作为证据。

---

## 2. 旧前端整体画像

### 2.1 可确认的技术形态【产物】

- UmiJS **3.5.41**（`window.g_umi.version`），React 单页应用，`index.html` + `umi.[hash].js` + 61 个 chunk css。
- Ant Design 4 + ProLayout / ProTable（产物内含 `columnsStateMap` 弃用提示、ProTable 筛选/列设置文案）。
- react-intl：内嵌三语词条（简体 / 繁體 / 日本語）。
- Quill 富文本（`component.quillEditor.*` 工具栏词条：加粗、颜色、图片、公式、题目引用、答案引用等）。
- KaTeX 字体（`static/KaTeX_*`），公式渲染。
- 流程设计器（`p__survey__Flow`：开始/审批/条件判断/发送/结束节点、会签/或签、抄送）。
- 登录页 console 打印 `v1.13.0` 与项目地址【产物·umi.js 内 `系统初始化完成，当前版本号 v1.13.0`】。

### 2.2 路由表（39 条，从 `umi.js` 还原）【产物】

| 分组 | 路由 |
|---|---|
| 公开答题 | `/s/:id`、`/s/:id/:answerId`、`/t/:id`、`/t/:id/:answerId`、`/s/:id/result/:resultId`、`/s/:id/exam-result/:answerId` |
| 登录注册 | `/user/login`、`/user/register`（`layout:false`） |
| 主框架 | `/`、`/home`、`/project`、`/project/:id`、`/exercise`、`/exercise/:repoId` |
| 题库 | `/repo`、`/repo/index`、`/repo/template`、`/repo/book`、`/repo/:repoId/questions/:mode` |
| 模板 | `/template` |
| 考试详情 | `/survey`（重定向 `/survey/new`）、`/survey/:id`、`/survey/:id/edit`、`/survey/:id/poster`、`/survey/:id/setting`、`/survey/:id/flow`、`/survey/:id/data`、`/survey/:id/report` |
| 账号 | `/account`、`/account/settings`、`/account/settingsH5` |
| 系统 | `/system`、`/system/user`、`/system/role`、`/system/dept`、`/system/position`、`/system/dict`、`/system/setting` |

页面 chunk（30 个）：`p__Home`、`p__Project`、`p__Exercise`、`p__Exercise__mobile__Practice`、`p__repo__Repo`、`p__repo__Template`、`p__repo__Book`、`p__repo__Questions`、`p__Template`、`p__survey`（考试详情外壳）、`p__survey__Overview`、`p__survey__Setting`、`p__survey__Flow`、`p__survey__Poster`、`p__survey__Data`、`p__survey__Report`、`p__system__User/Role/Dept/Position/Dict/SystemSettings`、`p__account__settings`、`p__user__Login/Register/mobile`、`p__Answer`、`p__Answer__Practice`、`p__Answer__ExamResult`、`p__Answer__PublicQuery`。

### 2.3 菜单与权限【产物】

一级菜单（路由 `name` + `authority`）：首页 `home`、我的项目 `project`、我的练习 `exercise`、题库中心 `repo`（列表/模板/练习册）、模板广场 `template`、系统管理 `system`（用户/角色/机构/岗位/字典/设置）、个人页 `account`。

权限串共 **72 个 `authority.*` key**，形态与后端 `@PreAuthorize` 一致：`project:list/create/update/delete/detail/report`、`answer:list/create/update/delete/detail/export/upload`、`repo:list/create/update/delete/detail/book`、`template:list/create/update/delete/category/tag`、`system:user|role|dept|position|dict|dictItem` 各 `list/create/update/delete`、`file:list/detail/import/delete`、`exercise:list`、`home`、`user:update`。

### 2.4 旧前端功能面清单（按模块）

| 模块 | 旧前端具备的能力（证据均在对应 chunk / i18n 前缀内） |
|---|---|
| 项目列表 | 新建（问卷/考试）、新建文件夹、AI 建卷、Excel 导入、文本导入、JSON 模板导入、回收站、复制、预览、发布/停止、重命名、移动/移出文件夹、协作者、列表列（答卷数/更新时间） |
| 编辑器 | 30 种题型、大纲树、拖拽、右键、复制/剪切/粘贴、上下左右移动、撤销/重做、快捷键、属性面板、选项编辑、批量加选项、显示/必填/跳转/计算/结束/标题替换逻辑、公式与函数库、答案唯一、选项配额、选项自动勾选、分值/解析、校验规则、随机抽题、主题（表单/电脑/手机）、四视图预览、保存到题库/模板库、JSON 视图、总分 |
| 发布设置 | 答题显示、校验时机、默认语言、默认答案、回收限制（上限/截止/登录/密码/IP/Cookie/微信）、白名单、考试控制、提交后（成绩单/排名/解析/修改）、跳转与图文、对外查询页面、协作管理员、链接与二维码 |
| 数据 | 表格、筛选、排序、编辑/补录、导入、导出（全量/当页/选中/附件/格式/命名规则/自定义）、回收站、详情（上一条/下一条/打印/全屏）、列设置、自定义页码 |
| 报表 | 逐题统计、平均/最高/最低/合计/计数/占比、按内容/按日期筛选 |
| 题库 | 题库 CRUD（分类/类型/标签/共享/练习库）、成员管理、Excel/文本/模板导入、题目 CRUD、批量删除、题库模板页、组卷抽题 |
| 练习 | 练习列表/记录、顺序/随机/错题、继续上次、查看答案、笔记、标记、收藏、自动下一题、答题卡、手机练习中心 |
| 答题/成绩 | 公开答题、一页一题、进度条、答题卡、字号、切屏、限时、必填、暂存续答、微信授权、提交后跳转、成绩单（分数/排名/时长/解析）、公开查询改答案、AI 解析 |
| 账号/登录 | 账号密码、滑块验证、微信扫码、语言切换、注册（含角色）、个人资料（头像/手机/邮箱/简介）、修改密码、第三方绑定、通知设置、手机个人中心 |
| 系统管理 | 用户（导入/岗位/机构/角色/启停/重置密码）、角色（CRUD/功能权限/授权用户）、机构（树/排序）、岗位（数据权限）、字典（系统/问卷/字典项/导入）、系统设置（品牌/版权/备案/验证码/注册角色/强密码）、第三方登录配置、AI 设置、高德 Key、版本号 |
| 其它 | 模板广场（公共库/私有库/分类/标签/预览/应用/下载）、流程编排与审批、证书海报设计器、整体风格设置、站内信通知、PWA 离线提示 |

### 2.5 接口面（124 条，按模块）

| 前缀 | 代表接口 | 说明 |
|---|---|---|
| `/api/project/*` | create / update / delete / restore / destroy / trash / list / partner/* / select{Dept,Dict,Role,User,Repo,Tag,Template,Position} | 项目 + 协作者 + 选择器 |
| `/api/answer/*` | list / create / update / delete / trash / restore / destroy / download | 答卷全生命周期 |
| `/api/repo/*` | list / create / update / delete / batchCreate / pick / unbind / book/* / partner/* | 题库 + 练习册 + 授权 |
| `/api/template/*` | list / get / create / delete / listCategory / listTag | 模板广场 |
| `/api/exercise/*` | list / delete | 练习记录 |
| `/api/system/*` | user / role / dept / position / dict / dictItem / permission / update / aiSetting / oauthSetting | 系统管理 |
| `/api/public/*` | loadProject / loadQuery / getQueryResult / loadExamResult / loadLinkResult / loadDict / login / register / oauth/* / upload | 公开侧 |
| `/api/ai/chat/*` | create-conversation / stream / models / answer-analysis/* | AI 建卷 + AI 解析 |
| `/api/workflow/*` | getFlow / saveFlow / deploy / approvalTask / getAuditRecord / statics … | 审批流 |
| 其它 | `/api/file/*`、`/api/user`、`/api/currentUser`、`/api/userOverview`、`/api/listUserTask`、`/api/listHistoryTask`、`/api/report/` | — |

---

## 3. 主表：逐项对照

> 判定：✅ 对齐　◐ 部分　✗ 缺失　⛔ 有意不做（`docs/scope.md`）　➕ 新前端新增　？ 无法确认

### 3.1 框架与全局

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 1 | 路由与页面结构 | 39 条唯一路由，8 个一级域【产物·umi.js 路由表】 | 30 条 path 声明（含布局壳 `/` 与 404 `*`），考试详情/题库/系统管理均有裁剪【仓库·client/src/router.tsx】 | ◐ |
| 2 | 一级菜单与权限过滤 | 7 个一级菜单 + 72 个 `authority.*` 串【产物·umi.js routes / i18n】 | 首页/我的考试/我的练习/题库中心/系统管理，按 `authorityList` 前缀过滤【仓库·layout/BasicLayout.tsx】 | ◐ |
| 3 | 多语言（简/繁/日） | 三语词条 5622 条，顶栏可切换【产物·i18n 目录 + 4981 chunk「简体中文/繁體中文/日本語」】 | 仅 `zh-CN.json`（1493 条），`i18n/index.ts` 无切换 UI【仓库·i18n/index.ts】 | ✗ |
| 4 | 整体风格设置 | 导航模式（侧边/顶部/混合）、主题色、暗色菜单、固定 Header/侧栏、内容宽度、色弱、页脚【产物·875 chunk + 4981「整体风格设置」】 | 亮/暗两套主题 + 页面缩放（90%–175%）【仓库·theme.ts、BasicLayout.tsx】 | ◐ |
| 5 | 顶栏个人区 | 账号设置 / 退出登录 / 使用文档 / 语言 / 整体风格【产物·4981 chunk】 | 账号设置 / 退出登录 / 缩放 / 亮暗【仓库·BasicLayout.tsx】 | ◐ |
| 6 | 移动端框架 | 手机布局 + 底部 TabBar（首页/我的项目/我的练习/个人中心）+ `/account/settingsH5` + 手机练习中心【产物·7554 chunk（BasicLayout 的移动分支）+ 路由】 | `MobileTabBar`（权限分组）+ 列表卡片化；无移动个人中心、无移动练习页【仓库·layout/MobileTabBar.tsx、router.tsx】 | ◐ |
| 7 | 404 页 | `p__404`，英文文案 + Back Home【产物·p__404 chunk】 | `Placeholder title="页面不存在"`【仓库·router.tsx】 | ✅ |
| 8 | 站内信/通知 | 通知设置：账户密码 / 系统消息 / 待办【产物·`pages.account.settings.notification.*`】 | 无【仓库·grep「站内信/系统消息」0 命中】 | ✗ |
| 9 | 版本号展示 | 账号设置内显示「版本号 v1.13.0」【产物·`pages.account.settings.system.version`】 | 无【仓库】 | ✗ |
| 10 | PWA 离线提示 | 有 `app.pwa.offline` / `serviceworker.updated` 词条【产物·i18n】 | 无【仓库】 | ✗ |

### 3.2 项目列表（考试/问卷）

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 11 | 新建考试/问卷（空白） | 下拉菜单：调查 / 在线考试【产物·`pages.project.dropdown.survey/exam`】 | 「新建」弹窗：类型 + 空白新建【仓库·pages/project/List.tsx】 | ✅ |
| 12 | 从题库组卷 | 编辑器内随机抽题规则（题库/题型/数量/分值）【产物·4235 chunk「随机抽题配置」】 | `ComposeModal`：选题库 → 按题型配题数与分值【仓库·pages/project/ComposeModal.tsx】 | ✅ |
| 13 | 文件夹 | 新建文件夹 / 改名 / 删除到回收站 / 子项计数【产物·`pages.project.folder.*`】 | 只有面包屑下钻，无创建/改名/删除入口【仓库·pages/project/List.tsx】 | ✗ |
| 14 | AI 智能创建问卷 | 对话式建卷、模型选择、流式重试【产物·`pages.project.aiImport.*` + `/api/ai/chat/*`】 | 无【仓库·grep「AI 智能/AI 对话」0 命中于 project】 | ✗ |
| 15 | Excel 导入项目 | 「通过 Excel 导入(快查)」+ 4 条解析规则 + 模板下载【产物·`pages.project.importExcel.*`】 | 无【仓库】 | ✗ |
| 16 | 文本导入项目 | 文本编辑器 + `【题型】` 标记解析 + 题目预览 + 示例帮助【产物·`pages.project.importText.*`】 | 无【仓库】 | ✗ |
| 17 | JSON 模板导入 | 拖拽 `.json` 模板文件导入【产物·`pages.project.importTemplate.*`】 | 无【仓库】；模板广场被 `scope.md` 判为有意不做【文档·docs/scope.md:58】，但「拖 JSON 文件导入」是独立入口，是否一并放弃需产品确认 | ✗ |
| 18 | 复制 / 预览 | 行菜单「复制」「预览」【产物·`pages.project.menu.copy/preview`】 | 无复制、无项目级预览（仅编辑器预览）【仓库·List.tsx】 | ✗ |
| 19 | 发布 / 停止 / 重命名 | 二次确认 + 状态流转【产物·`pages.project.menu.publish/stop/rename`】 | 有（`setStatus` / `openRename`）【仓库·List.tsx】 | ✅ |
| 20 | 回收站 | 恢复 / 彻底删除 / 清空选择 / 删除时间列【产物·`pages.project.recycle.*`】 | `/project/trash` + restore / destroy【仓库·pages/project/Trash.tsx】 | ✅ |
| 21 | 列表列 | 名称/类型/状态/答卷数/创建时间/更新时间/操作【产物·`pages.project.list.column.*`】 | 名称/类型/状态/答卷/创建时间/操作（无更新时间）【仓库·List.tsx】 | ◐ |
| 22 | 协作者 / 授权 | `project/partner/create / delete / import / list`，协作者可编辑与看数据【产物·`/api/project/partner/*` + `协作管理员列表`】 | `PartnerPanel`：加协作者 + 按班级授权【仓库·pages/survey/PartnerPanel.tsx】 | ✅ |
| 23 | 批量设置 / 批量删除 | 产物无批量设置词条与接口【产物·`pages.project.*` 无 batch】 | `BatchSettingModal` 16 项 + 批量删除【仓库·pages/project/BatchSettingModal.tsx】 | ➕ |

### 3.3 编辑器

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 24 | 题型覆盖 | **30 项**：单选/多选/判断/单行/多行/多空/横向填空/打分/NPS/矩阵单选·多选·填空·量表·打分·自增/级联/地址/下拉/上传/签名/扫码/分页/题组/备注/分割线/富文本/用户/部门/选项/问卷【产物·`pages.repo.template.question.*`】 | **17 项**：14 种渲染（Radio/Checkbox/Select/NPS/MatrixRadio/MatrixCheckbox/Cascader/Judge/FillBlank/MultipleBlank/Textarea/MatrixFillBlank/Address/Score）+ 题组/说明/分割线【仓库·renderer/registerAll.ts、designer/defaults.ts】 | ✗ 缺 **11 类实义题型**：横向填空、矩阵量表、矩阵打分、矩阵自增、上传、签名、扫码、分页、富文本、用户题、部门题；另有 2 项旧结构/容器项（`option`、`survey`）语义「无法从产物确认」，不计入缺口数 |
| 25 | 结构题 | 题组 / 备注 / 分割线 / 分页 / 富文本 / 图片 / 视频 / 欢迎语【产物·4235 chunk】 | 题组 / 说明 / 分割线【仓库·designer/defaults.ts】 | ◐ |
| 26 | 大纲树 / 拖拽 / 右键 | 大纲、题型面板、拖动排序、右键菜单、题目库 tab【产物·`pages.survey.editor.panels.*`（question.tab.outline/types/library）】 | 大纲树 + 拖拽 + 右键菜单【仓库·pages/survey/Editor.tsx、designer/tree.ts】 | ✅ |
| 27 | 复制 / 剪切 / 粘贴 / 移动节点 | 「复制当前选中节点 / 剪切 / 粘贴 / 上移下移左移右移」【产物·4235 chunk】 | 右键菜单：复制一份 / 上移 / 下移 / 删除【仓库·Editor.tsx】；无剪切、无跨父级粘贴、无左右移动 | ◐ |
| 28 | 撤销 / 重做 | 有【产物·`mainTool.undo/redo`】 | `useHistory` + Ctrl+Z/Y【仓库·designer/useHistory.ts、Editor.tsx】 | ✅ |
| 29 | 快捷键 | 「当前可用快捷键」面板【产物·`mainTool.shortcuts`】 | 无【仓库·grep「快捷键」0 命中】 | ✗ |
| 30 | 属性面板 / 选项编辑 | 属性面板 + 选项编辑 + 批量添加选项【产物·`panels.*`、`widgets.batchAddOption.*`】 | `AttributePanel` + `OptionEditor`；无批量添加选项【仓库·designer/】 | ◐ |
| 31 | 逻辑规则 | 显示 / 必填 / 跳转 / 计算 / 结束 / 标题替换 / 选项自动勾选，全部可视化配置【产物·4235 + `editor.panels.logic.*`】 | 四个规则字段（visibleRule/requiredRule/jumpRule/calculate）以 JSON 文本框编辑；另有可视化条件编辑器（AND/OR、13 种条件）【仓库·designer/attributeSchema.ts、RuleEditor.tsx】 | ◐ 缺「结束/标题替换/自动勾选」与可视化结果分支 |
| 32 | 公式 / 函数库 | 公式文档、函数列表、搜索公式、公式简介、REPLACE/SUBSTITUTE/逻辑/统计函数【产物·4235、1485、`component.quillEditor.toolbar.formula`】 | 无【仓库·grep「公式」0 命中】 | ✗ |
| 33 | 判分设置 | 分值、正确答案、解析、答案唯一校验、选项配额、答对几项得几分【产物·4235 chunk】 | 分值 / 判分模式（onlyOne/selectAll/selectCorrect/select/manual/none）/ 正确答案 / 解析【仓库·designer/attributeSchema.ts】；无答案唯一、配额、自动勾选 | ◐ |
| 34 | 校验规则 | 正则、范围强/软校验、文本长度、小数位、答案数、矩阵行数、日期范围【产物·4235 + `pages.answer.validation.*`】 | scope / softScope / textLimit / answerLimit / numericScale【仓库·attributeSchema.ts】；无正则 | ◐ |
| 35 | 随机抽题 / 组卷规则 | 从不同题库按题型、标签、数量、分值抽题【产物·「随机抽题配置」+ i18n】 | 按题型配题数与分值【仓库·ComposeModal】；标签筛选受后端限制【文档·scope.md:75】 | ◐ |
| 36 | 问卷主题 | 表单主题 / 电脑端主题 / 手机端主题，三套可预览【产物·4235「预览(表单主题/电脑主题/手机主题)」】 | 仅答题页背景图 / 头图 URL【仓库·Editor.tsx】 | ✗ |
| 37 | 视图切换 | 编辑器 / 表单预览 / 电脑预览 / 手机预览【产物·`mainTool.screen.form/mobile/pc`】 | 预览开关 + `PhonePreview`【仓库·Editor.tsx、designer/PhonePreview.tsx】 | ◐ |
| 38 | 保存到题库 / 模板库 | 保存到题库、保存到问卷模板库、应用模板、预览模板【产物·`editor.template.*`】 | 无【仓库】 | ✗（其中「模板广场」维度为 ⛔） |
| 39 | JSON 视图 | 「JSON 内容有误，修改失败」【产物·4235】 | Schema JSON 弹窗【仓库·Editor.tsx】 | ✅ |
| 40 | 总分显示 | `mainTool.totalScore`、总分/题数汇总【产物·4235「总分 {score} 分」】 | 无【仓库】 | ✗ |

### 3.4 发布设置（`/survey/:id/setting`）

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 41 | 答题显示 | 一页一题 / 进度条 / 答题卡 / 题号 / 允许复制 / 自动暂存【产物·`pages.survey.setting.answer.*`】 | 6 项（自动暂存/进度条/一页一题/答题卡/题号/允许复制）【仓库·Setting.tsx】 | ✅ |
| 42 | 校验时机 | 输入时 / 失焦时 / 提交时【产物·`answer.triggerType.*`】 | 无【仓库】 | ✗ |
| 43 | 默认语言 | 跟随浏览器 / zh-CN / en-US【产物·`answer.defaultLocale.*`】 | 无【仓库】 | ✗ |
| 44 | 默认答案 | `initialValues`，答案自动带入【产物·`setting.initialValues.*`】 | 无【仓库】 | ✗ |
| 45 | 回收限制 | 上限 / 截止时间 / 需登录 / 密码 / IP 限次 / Cookie / 每账号限次 / 仅微信 / 微信信息【产物·`answerLimit.*`】 | 上限 / 截止 / 需登录 / 密码 / IP 限次 / 设备限次【仓库·Setting.tsx】 | ◐（无微信相关） |
| 46 | 白名单 | 名单、Excel/文本导入、未访问/已访问/已答状态、批量删除【产物·`setting.whitelist.*`】 | 无【仓库】；`scope.md` 已知缺口【文档·scope.md:76】 | ✗ |
| 47 | 考试控制 | 起止时间 / 最短最长交卷 / 最大切屏 / 随机顺序 / 练习模式 / 错题练习【产物·`setting.exam.*`】 | 起止 / 最短最长 / 切屏 / 闯关限时 / 排名 / 练习模式 / 错题 / 随机 / 闯关【仓库·Setting.tsx】 | ✅ |
| 48 | 提交后设置 | 成绩单 / 排名 / 答案解析 / 允许修改答案 / 对外查询【产物·`setting.submitted.*`】 | 成绩单 / 排名 / 解析 / 允许修改答案【仓库·Setting.tsx】 | ◐（无对外查询开关） |
| 49 | 提交后跳转 / 图文 | 自定义跳转链接（含参数）+ 富文本提示页【产物·`setting.redirect.*`、`contentHtml.*`】 | `redirectUrl` + `contentHtml`【仓库·Setting.tsx】 | ✅ |
| 50 | 对外查询页面 | 新增查询页、查询条件、字段权限（隐藏/只读/可编辑）、有效期（永久/日期段）、密码（公开/私有）、分页【产物·`setting.publicQuery.*`】 | 无配置 UI；仅保留 `/s/:id/result/:resultId` 结果页【仓库·router.tsx、PublicQuery.tsx】 | ✗ |
| 51 | 协作管理员 | 协作者列表 / 增删 / 角色（创建者/协作者）【产物·`setting.member.*`】 | `PartnerPanel`【仓库】 | ✅ |
| 52 | 链接 / 二维码 | 带值链接（参数自动填答案）、二维码尺寸（大/中/小）、下载二维码【产物·`setting.links.*`】 | 分享链接 + 复制 + 二维码【仓库·survey/Overview.tsx】；无带参链接与尺寸选择 | ◐ |

### 3.5 数据（`/survey/:id/data`）

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 53 | 表格 / 筛选 / 排序 | 数据表格、按内容筛选、排序、列设置、全屏【产物·p__survey__Data】 | 筛选 + 排序表格【仓库·pages/survey/Data.tsx】 | ✅ |
| 54 | 编辑 / 补录 | 编辑数据、添加数据、提交并再填一份【产物·`data.edit.*`、`data.addData.*`】 | `AnswerEditorModal` 编辑 + 补录【仓库·pages/survey/Data.tsx】 | ✅ |
| 55 | 导入 | 导入数据（Excel）【产物·`data.upload.*`】 | 「导入数据」【仓库·Data.tsx】 | ✅ |
| 56 | 导出 | 全量 / 当前页 / 选中、导出格式（数据 / 数据+附件）、导出内容、附件命名规则、自定义导出【产物·`data.download.*`】 | 单一「导出数据」（全量）【仓库·Data.tsx】 | ◐ |
| 57 | 回收站 | 恢复 / 彻底删除 / 二次确认【产物·`data.recycle.*`】 | `TrashDrawer`【仓库·pages/survey/data/TrashDrawer.tsx】 | ✅ |
| 58 | 数据详情 | 上一条 / 下一条 / 打印本条 / 全屏【产物·`data.detail.tooltip.*`】 | 无【仓库】 | ✗ |
| 59 | 附件 | 附件列、导出附件、附件命名规则（题目/文件名/日期/日期时间）【产物·`data.download.attachment` + 命名规则词条】 | 无（仅回收站提示附件会清）【仓库】 | ✗ |
| 60 | 列设置 / 自定义页码 | 列展示/固定、自定义页码【产物·`data.pagination.custom` + 列设置】 | 无【仓库】 | ✗ |

### 3.6 报表（`/survey/:id/report`）

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 61 | 逐题统计 | 选项/占比/数据量/合计，按题型分块【产物·p__survey__Report】 | `QuestionBlock` 选项分布 + 占比【仓库·pages/survey/report/QuestionBlock.tsx】 | ✅ |
| 62 | 图表形态 | 产物只留下统计表字段，图表库类型「无法从产物确认」【产物】 | 条形/柱形/扇形三态切换【仓库·QuestionBlock.tsx】 | ？ |
| 63 | 数值统计 | 平均 / 最高 / 最低 / 合计 / 计数【产物·`report.table.*`】 | 均 / 最小 / 最大 / 合计【仓库·Report.tsx】 | ✅ |
| 64 | 筛选 | 按数据内容 / 按提交日期【产物·p__survey__Report 文案】 | 仅按题干关键词搜索【仓库·Report.tsx】 | ✗ |

### 3.7 题库（`/repo`）

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 65 | 题库 CRUD | 名称/分类/类型/描述/标签/共享/练习库【产物·`repo.repo.field.*`】 | 名称/分类/类型/描述/标签【仓库·pages/repo/List.tsx】 | ◐（无共享、无练习库开关） |
| 66 | 共享题库 | 共享/未共享状态与开关，共享后所有人可见【产物·`repo.repo.status.shared/unshared`、`field.shared.tooltip`】 | 只在列表显示 shared 标签，无开关、无提交入口【仓库·List.tsx】 | ✗ |
| 67 | 题库成员 | 成员列表、添加成员（用户/机构）、批量删除成员【产物·`repo.repo.partner.*`、`/api/repo/partner/*`】 | 仅按用户组授权，无成员列表与撤销【仓库·pages/repo/GrantModal.tsx】 | ◐ |
| 68 | 题库导入 | Excel / 文本 / 模板三种【产物·`repo.repo.action.import/importText/importTemplate`】 | 仅 Excel（在题目页）【仓库·pages/repo/Questions.tsx】 | ◐ |
| 69 | 题目管理 | 增删改、答案、分值、标签、题型、索引、批量编辑【产物·`repo.template.*`】 | 增删改、答案、分值、解析、标签【仓库·Questions.tsx】 | ✅ |
| 70 | 批量删除题目 | 有【产物·`repo.template.modal.batchDelete`】 | 有【仓库·Questions.tsx】 | ✅ |
| 71 | 题库模板页 | 路由 `/repo/template`，菜单名「问题管理」【产物·umi.js + `menu.repo.template`】 | 无此路由【仓库·router.tsx】 | ✗（该页具体用途「无法从产物确认」） |
| 72 | 列表列 | 名称/分类/类型/题量/共享/练习库【产物·`repo.repo.column.*`】 | 名称/分类/类型/题量/标签【仓库·List.tsx】 | ◐ |

### 3.8 练习（`/exercise`、`/repo/book`）

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 73 | 练习列表 / 记录 | 名称/类型/进度/开始时间/状态/删除/查看结果【产物·`pages.exercise.mine.*`】 | 状态/进度/删除/开始/继续/成绩【仓库·pages/exercise/List.tsx】 | ✅ |
| 74 | 三种练习 | 顺序 / 随机 / 错题【产物·`practice.ordered/random/wrong`】 | 顺序 / 随机 / 错题【仓库·Practice.tsx、repo/List.tsx】 | ✅ |
| 75 | 继续上次 | 继续答题 + 本地进度【产物·`exercise.action.resume`、3833 chunk「继续上次填写？」】 | `mode=resume` + localStorage 进度【仓库·Practice.tsx】 | ✅ |
| 76 | 练习辅助 | 查看答案、笔记、标记、收藏、自动下一题、练习设置【产物·7983 chunk、`pages.answer.favorite/addNote/mark/autoNextPage`】 | 错题本练习新增了统计与「标记已掌握」【仓库·pages/repo/BookPractice.tsx】；无「查看答案」「自动下一题」「练习设置」，题库练习页（exercise/Practice）仍只有一页一题/瀑布流/字号 | ◐ |
| 77 | 答题卡 | 练习/答题均有答题卡，可快速定位【产物·7983「可在答题卡中快速找到」】 | 公开答题页有答题卡；错题本练习页新增答题卡【仓库·BookPractice.tsx】；题库练习页无 | ◐ |
| 78 | 手机端练习中心 | `/exercise/:repoId`：分类、可练题库、练习记录、继续【产物·`pages.exercise.mobile.*`】 | `Placeholder title="练习详情"`【仓库·router.tsx】 | ✗ |
| 79 | 练习册（错题本） | 我的错题 / 我的收藏 / 笔记 / 错误次数 / 删除【产物·p__repo__Book + `pages.repo.book.*`】 | 错题 + 收藏两个 tab、笔记、错误次数、重点标记、批量删除【仓库·pages/repo/Book.tsx】 | ✅ |

### 3.9 答题与成绩（公开侧）

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 80 | 公开答题 | `/s/:id`、`/s/:id/:answerId`【产物·路由】 | 有【仓库·router.tsx】 | ✅ |
| 81 | 展示能力 | 一页一题 / 进度条 / 答题卡 / 题号 / 字号【产物·`setting.answer.*` + p__Answer】 | 一页一题 / 进度 / 答题卡 / 字号 0.9–2.0×【仓库·PublicAnswer.tsx】 | ✅ |
| 82 | 切屏 / 限时 / 必填 | 切屏次数提示与强制提交【产物·p__Answer 文案】 | 有【仓库·PublicAnswer.tsx】 | ✅ |
| 83 | 暂存续答 | 自动暂存 + 继续上次填写【产物·p__Answer、3833 chunk】 | 本地草稿 + 远程 tempSave【仓库·PublicAnswer.tsx】 | ✅ |
| 84 | 微信 | 仅微信填写、公众号授权、OpenID/昵称/头像写入答卷【产物·p__Answer、`/api/public/oauth/*`、`setting.answerLimit.wechat*`】 | 无【仓库·grep「微信」0 命中】 | ✗ |
| 85 | 提交后 | 跳转链接、图文页、感谢语【产物·p__Answer】 | `redirectUrl` / `contentHtml` / 默认感谢【仓库·PublicAnswer.tsx】 | ✅ |
| 86 | 成绩单 | 总分 / 当前排名 / 答题时长 / 提交时间 / 逐题解析【产物·p__Answer__ExamResult】 | 分数 / 排名 / 逐题解析【仓库·pages/answer/ExamResult.tsx】；无「答题时长」展示 | ◐ |
| 87 | 公开查询 | 条件查询、查询结果、答案更新【产物·p__Answer__PublicQuery】 | `PublicQuery`：条件表单 + 结果 + 密码【仓库·PublicQuery.tsx】 | ✅ |
| 88 | AI 解析 | 生成/重新生成/AI 正在生成解析【产物·`pages.answer.aiAnalysis.*` + `/api/ai/chat/answer-analysis/*`】 | 无【仓库】 | ✗ |
| 89 | `/t/:id` 入口 | 路由存在，加载练习答题 chunk【产物·umi.js + p__Answer__Practice】 | 无【仓库·router.tsx】 | ✗（用途「无法从产物确认」） |

### 3.10 账号与登录

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 90 | 登录 | 账号密码 + 滑块验证（`pages.captcha.slide`「向右滑动完成验证」）+ 微信扫码 + 语言切换 + 记住我 + 注册入口 + 忘记密码词条【产物·p__user__Login、`pages.login.*`】 | 账号密码 + 滑块验证 + 注册入口【仓库·pages/user/Login.tsx、components/LoginCaptcha.tsx】 | ◐ |
| 91 | 注册 | 登录账号 + 姓名 + 密码 + 选择角色 + 语言【产物·p__user__Register】 | 手机号 + 姓名 + 密码；默认角色由系统设置分配【仓库·Register.tsx】 | ◐ |
| 92 | 个人资料 | 头像 / 姓名 / 手机 / 邮箱 / 个人简介【产物·p__account__settings】 | 姓名 / 手机 / 邮箱 / 性别【仓库·account/Settings.tsx】 | ◐ |
| 93 | 修改密码 | 旧/新/确认 + 强密码规则【产物·p__account__settings】 | 有，同样 8–16 位强规则【仓库·account/Settings.tsx】 | ✅ |
| 94 | 第三方绑定 | 微信扫码绑定/解绑/绑定状态【产物·p__account__settings】 | 无【仓库】 | ✗ |
| 95 | 通知设置 | 账户密码 / 系统消息 / 待办【产物·`pages.account.settings.notification.*`】 | 无【仓库】 | ✗ |
| 96 | 手机端个人中心 | `/account/settingsH5`：个人信息/账号安全/退出【产物·p__user__mobile + 路由】 | 无【仓库】 | ✗ |
| 97 | 退出登录 | 顶栏 + 手机端「退出登录」【产物·4981、p__user__mobile】 | 顶栏下拉退出【仓库·BasicLayout.tsx】 | ✅ |

### 3.11 系统管理

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 98 | 用户管理 | 新建/修改/删除、批量导入、岗位、机构、角色、激活/失活、重置密码【产物·p__system__User】 | 新建/编辑/删除、导入模板、用户组、角色、状态、重置密码（编辑时改密）【仓库·system/User.tsx】 | ◐（无岗位） |
| 99 | 角色管理 | 角色 CRUD、功能权限、授权用户、批量取消授权【产物·p__system__Role】 | 无页面；`scope.md` 明确不做权限矩阵编辑【文档·scope.md:62】 | ⛔ |
| 100 | 机构 / 用户组 | 机构树、排序、负责人、内置机构保护【产物·p__system__Dept、2264 chunk「机构管理/负责人」】 | 用户组树：新建/改名/删除/上级分组【仓库·system/Group.tsx】 | ◐（无排序/负责人/内置保护提示） |
| 101 | 岗位 | 岗位 CRUD + 数据权限 5 档基础【产物·p__system__Position】 | 无【文档·scope.md:60】 | ⛔ |
| 102 | 字典 | 系统字典 / 问卷字典、字典项、Excel 导入【产物·p__system__Dict】 | 无【文档·scope.md:61】 | ⛔ |
| 103 | 系统设置 | 系统名称/图标、版权、备案号、验证码、开放注册、注册角色、强密码、AI、第三方登录、高德 Key【产物·p__system__SystemSettings】 | 品牌（名称/简称/Logo/版权/备案/Favicon）+ 登录与保护（验证码/内容保护/开放注册/默认角色/默认部门）+ AI【仓库·system/Setting.tsx】 | ◐ |
| 104 | 强密码开关 | 「开启强密码验证」【产物·`account.settings.system.field.strongPassword`】 | 无开关，规则写死【仓库·account/Settings.tsx（PASSWORD_RULE）】 | ✗ |
| 105 | 第三方登录配置 | 微信网站扫码 / 微信公众号 / Google，回调地址、密钥、系统外部访问地址【产物·p__system__SystemSettings + `account.settings.oauth.*`】 | 无【仓库】 | ✗ |
| 106 | AI 设置 | Base URL / Key / 模型列表 / 默认模型 / 系统提示词 / 开关【产物·p__system__SystemSettings】 | 同左（同名字段）【仓库·system/Setting.tsx】 | ✅ |
| 107 | 高德地图 Key | 高德 Key + 安全密钥；地址题用高德定位/选点【产物·p__system__SystemSettings、7983「高德地图加载失败」】 | 无 Key 配置；地址题退化为省/市/区三个输入框【仓库·renderer/questions/Address.tsx】 | ✗ |

### 3.12 其它模块

| # | 功能面 | 旧前端（产物证据） | 新前端（仓库证据） | 判定 |
|---:|---|---|---|---|
| 108 | 模板广场 | `/template`：公共库/私有库、分类、标签、搜索、预览、应用、添加、删除、下载【产物·p__Template + `pages.template.*`】 | 无【文档·scope.md:58】 | ⛔ |
| 109 | 流程编排 | `/survey/:id/flow`：开始/审批/条件判断/发送/结束、会签/或签、抄送、负责人、岗位【产物·p__survey__Flow】 | 无【文档·scope.md:59】 | ⛔ |
| 110 | 审批操作 | 我的审批、通过/拒绝/回退/撤回/转交、流程日志、处理反馈【产物·p__survey__Overview】 | 无（随 109） | ⛔ |
| 111 | 海报 / 证书设计器 | `/survey/:id/poster`：背景图、边框、圆角、字体大小/粗细/颜色、动画、图片、二维码、荣誉证书模板【产物·p__survey__Poster（362 KB）】 | `Placeholder title="分享海报"`【仓库·router.tsx】 | ✗ |

---

## 4. Top 5 缺口（按影响面排序）

### ① 题型缺 11 类：旧卷可能打不开、编辑会丢题

- 旧：30 项题型（含上传、签名、扫码、分页、富文本、用户题、部门题、横向填空、矩阵量表/打分/自增）【产物·`pages.repo.template.question.*`】。
- 新：17 项（14 种渲染 + 题组/说明/分割线）【仓库·`renderer/registerAll.ts`、`designer/defaults.ts`】。
- 影响：存量问卷里只要有一道上传/签名/扫码/矩阵量表题，新编辑器就无法渲染该题的编辑态，答题端也拿不到组件；这是**数据兼容性**问题，不只是「少几个按钮」。
- 建议：优先补 `Upload`、`Signature`、`Barcode`、`Pagination`、`MatrixNps/MatrixScore`，再补 `RichText`、`User/Dept`、`HorzBlank`。

### ② 公式与规则引擎降级为 JSON 文本框

- 旧：可视化显示/必填/跳转/计算/结束/标题替换逻辑 + 公式函数库（REPLACE/SUBSTITUTE/逻辑/统计）+ 选项配额 + 答案唯一 + 选项自动勾选【产物·4235、`editor.panels.logic.*`】。
- 新：`visibleRule/requiredRule/jumpRule/calculate` 四个 JSON 文本框 + 一个只能配条件的编辑器（AND/OR）【仓库·`designer/attributeSchema.ts`、`RuleEditor.tsx`】。
- 影响：非技术用户无法维护旧卷逻辑；「结束问卷」「标题替换」「选项配额」三类规则在新前端完全不可见。旧卷逻辑仍由后端存储、前端求值，一旦保存可能被覆盖/丢失。

### ③ 数据页的交付能力不足（导出 / 附件 / 打印 / 详情）

- 旧：导出全量/当前页/选中，导出格式（数据 / 数据+附件）、附件命名规则、自定义导出（公式+变量）、打印本条、上一条/下一条、全屏、列设置、自定义页码【产物·`pages.survey.data.*`】。
- 新：单一「导出数据」按钮 + 编辑/补录/导入/回收站【仓库·`Data.tsx`】。
- 影响：成绩归档、附件打包、逐条核对（考试复核场景）都做不了；附件题若补齐，导出附件也缺。

### ④ 发布设置缺「白名单 / 对外查询 / 默认答案 / 默认语言 / 校验时机」

- 旧：白名单（名单+Excel/文本导入+访问状态）、对外查询页面（条件、字段权限、有效期、密码）、默认答案、默认语言、校验时机【产物·`setting.whitelist.*`、`publicQuery.*`、`initialValues.*`、`defaultLocale.*`、`triggerType.*`】。
- 新：只有答题显示/考试/回收/提交后/协作五组【仓库·`Setting.tsx`】。
- 影响：名单制考试（职业技能认定常见）无法在 UI 配置；公开查询页只能靠旧数据或接口手配；`scope.md` 已把白名单列为已知缺口。

### ⑤ 微信与第三方登录整块缺失

- 旧：微信扫码登录、公众号内登录、仅微信填写、OpenID/昵称/头像写入答卷、个人中心绑定/解绑、后台第三方登录配置（微信网站/公众号/Google + 回调 + 密钥）【产物·`p__user__Login`、`p__account__settings`、`p__system__SystemSettings`、`/api/public/oauth/*`】。
- 新：仅账号密码 + 滑块验证码【仓库·`Login.tsx`、`LoginCaptcha.tsx`】。
- 影响：微信是旧系统的主投放渠道（问卷分享、公众号答题），缺失会直接砍掉一类使用场景；且 `docs/scope.md` 未把它列入「有意不做」。

### 次优先（不占 Top 5，但值得排期）

- **AI 建卷 / AI 解析**：后台 AI 设置已经有了（`system/Setting.tsx`），但前端的「AI 对话建卷」「答案解析生成」没有任何入口，配置等于空转。
- **题库共享 / 成员管理**：新前端只按用户组授权，缺「共享给所有人」与成员增删。
- **项目管理**：文件夹创建、Excel/文本导入、复制、预览全缺，旧用户迁移成本高。
- **多语言**：旧三语，新仅中文（i18n 基础设施已在，缺词条与切换）。

---

## 5. 无法从产物确认的项

| 项 | 原因 |
|---|---|
| `/t/:id`、`/t/:id/:answerId` 的真实用途 | 路由存在且加载练习答题 chunk，但页面内只有通用答题文案，无标题/说明可判定是「模板答题」还是「公开练习」 |
| `/repo/template` 页面职责 | 路由与 chunk 存在，chunk 内只有表格化文案；与 `/repo/:repoId/questions/:mode` 的分工无法判定 |
| 报表图表类型 | 旧报表 chunk 只有统计表字段（平均/最高/最低/合计/占比），没有图表库类型词条 |
| 「整体风格设置」在生产是否真正开放 | 配置面板 chunk 自带「配置栏只在开发环境用于预览」提示，无法判断生产是否隐藏 |
| 手机号登录 / 忘记密码 | 仅存在于 i18n 词条（`pages.login.phoneLogin.*`、`forgotPassword`），登录页 chunk 内没有对应控件 |
| 旧前端流程模块在部署实例里是否可用 | 前端有完整流程页与 `/api/workflow/*` 调用；本仓库 `server/flow` 存在 `FlowApi`，但 `server/api/build.gradle` 只依赖 shared/rdbms/ai，未依赖 flow → 打出的 jar 里 `/api/workflow/*` 不可达【仓库·server/api/build.gradle、server/flow】 |
| 站内信/通知是否真实投递 | 只有通知设置词条，未在产物中找到消息中心页面 |

---

## 6. 有意不做（不计入缺口，来自 `docs/scope.md`）

| 模块 | 旧前端对应 | 说明 |
|---|---|---|
| 模板广场 | `/template` 公共库/私有库 | 后端创建项目不读模板，模板只在客户端 localStorage 参与 |
| 流程编排 | `/survey/:id/flow` + 审批 | `server/flow` 未进 `api` 的依赖（`build.gradle` 只有 shared/rdbms/ai），jar 内 `/api/workflow/*` 不可达【仓库·server/api/build.gradle】 |
| 职务（岗位） | `/system/position` | 唯一下游是工作流按岗位选审批人 |
| 数据字典 | `/system/dict` | 仅 `dataType=selectDict` 使用，初始库无默认字典 |
| 角色权限矩阵编辑页 | `/system/role` | 权限体系需要角色数据，但用 SQL/接口维护 |
| MCP 智能体接入 | 产物中未见 | 企业版能力，开源代码库没有实现 |

> 注意：`/system/role` 在旧前端不只有「权限矩阵」，还有角色 CRUD 与「授权用户」。新前端把整页都去掉了——按 `scope.md` 的口径归入「有意不做」，但如果后续要恢复角色管理，需要补的不止矩阵。

---

## 7. 新前端有、旧产物无（不算缺口）

| # | 能力 | 新前端证据 | 说明 |
|---:|---|---|---|
| 1 | 批量设置（16 项）+ 批量删除 | `BatchSettingModal.tsx` | 旧项目页只有行级操作 |
| 2 | 整页缩放 90%–175% | `BasicLayout.tsx`、`ZoomControl.tsx` | 旧只有浏览器缩放 |
| 3 | 全站内容保护（水印 + 禁右键/复制/开发者工具） | `system/Setting.tsx`、`CopyGuard.tsx`、`Watermark.tsx` | 旧只有「允许复制题目」 |
| 4 | 答题页字号 0.9–2.0× | `PublicAnswer.tsx`、`Practice.tsx` | 旧无字号调节 |
| 5 | `/setup` 初始化向导占位 | `router.tsx` | jar 内没有 `/setup` 路由，旧产物无此页 |

## 8. 附：旧前端题型与接口清单

### 8.1 题型（`pages.repo.template.question.*`，30 项）

单选 `radio`、多选 `checkbox`、判断 `judge`、单行文本 `fillBlank`、段落文本 `textarea`、多项填空 `multipleBlank`、横向填空 `horzBlank`、打分 `score`、NPS `nps`、矩阵单选 `matrixRadio`、矩阵多选 `matrixCheckbox`、矩阵填空 `matrixFillBlank`、矩阵量表 `matrixNps`、矩阵打分 `matrixScore`、矩阵自增 `matrixAuto`、级联 `cascader`、地址 `address`、下拉 `select`、上传 `upload`、签名 `signature`、扫码 `barcode`、分页 `pagination`、题组 `questionSet`、备注 `remark`、分割线 `splitLine`、富文本 `richText`、用户 `user`、部门 `dept`、选项 `option`、问卷 `survey`。

### 8.2 接口（124 条，去重后）

```
/api/ai/chat/{create-conversation,stream,models,close-conversation}
/api/ai/chat/answer-analysis/{create-conversation,stream,close-conversation}
/api/answer/{create,update,delete,destroy,restore,list,trash,download}
/api/currentUser  /api/user  /api/userOverview  /api/listUserTask  /api/listHistoryTask
/api/exercise/{list,delete}
/api/file/{create,list,delete}
/api/oauth/{bindings,bind/*}
/api/project  /api/project/{create,update,delete,destroy,restore,trash,list}
/api/project/partner/{create,delete,import,list}
/api/project/select{Dept,Dict,Position,Repo,Role,Tag,Template,User}
/api/public/{loadProject,loadQuery,getQueryResult,loadExamResult,loadLinkResult,loadDict,login,logout,register,upload}
/api/public/oauth/{login,register,survey/wechat/start}
/api/repo/{create,update,delete,list,batchCreate,pick,unbind}
/api/repo/book/{create,update,delete,list,question}
/api/repo/partner/{create,delete,list}
/api/report/
/api/system  /api/system/{update,aiSetting,oauthSetting}
/api/system/{user,role,dept,position,dict,dictItem,permission}/*
/api/system/checkUsernameExist
/api/template/{create,delete,get,list,listCategory,listTag}
/api/workflow/{approvalTask,deploy,getAuditRecord,getFlow,getFlowTasks,getRevertNodes,loadSchema,saveFlow,statics}
```

---

## 9. 复核建议

1. 拿一份真实的旧版答卷 JSON（含上传/矩阵量表/签名题）导入新编辑器，验证「渲染即丢题」的具体表现，作为题型补齐的验收用例。
2. 对 5 个 Top 缺口各建一条端到端用例（旧数据 → 新前端打开 → 保存 → 再打开），确认没有静默降级。
3. 本文所有「✗」都可用一条命令复核：`grep -r "<关键词>" client/src`；所有「【产物】」都可在 `%TEMP%\surveyking-legacy-static` 对应 chunk 中复现（解码 `\uXXXX` 后检索）。













