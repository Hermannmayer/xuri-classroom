# SurveyKing 页面结构清单

> 依据：32 个 `p__*.js` 页面 chunk（prettier 美化后可读）+ 1494 条 i18n 词条 + 路由配置。
> chunk 名直接对应源码路径（`p__survey__Data` ← `src/pages/survey/Data.tsx`）。
> **可信度分级**：`实测`=浏览器里看过；`代码`=从产物结构读出；`推断`=按命名与文案推测。

## 一、总览

| 页面 chunk | 路由 | 体积 | 行数 | 职责 | 可信度 |
|---|---|---:|---:|---|---|
| `p__repo__Template` | **`/survey/:id/edit`** · `/repo/template` · `/template` | 935 KB | 21 556 | **问卷设计器（共享组件库）** | 代码 |
| `p__survey__Overview` | `/survey/:id`（总览） | 562 KB | 16 093 | 问卷总览/入口卡片 | 推断 |
| `p__repo__Book` | `/repo/book` | 296 KB | 8 616 | 练习册管理 | 代码 |
| `p__survey__Flow` | `/survey/:id/flow` | 170 KB | 4 463 | 流程与逻辑编排 | 代码 |
| `p__survey__Data` | `/survey/:id/data` | 135 KB | 3 504 | 答卷数据表 | 代码 |
| `p__Project` | `/project` · `/project/:id` | 126 KB | 2 999 | 项目/问卷列表 | 代码 |
| `p__system__User` | `/system/user` | 100 KB | 2 725 | 用户管理 | 代码 |
| `p__system__Role` | `/system/role` | 99 KB | 2 767 | 角色权限 | 代码 |
| `p__system__SystemSettings` | `/system/setting` | 87 KB | 1 950 | 系统设置（AI/OAuth/备份） | 代码 |
| `p__Setup` | `/setup` | 73 KB | 1 602 | 首次安装向导 | 代码 |
| `p__survey__Poster` | `/survey/:id/poster` | 73 KB | 2 046 | 分享海报生成 | 代码 |
| `p__repo__Repo` | `/repo/index` | 69 KB | 1 804 | 题库列表 | 代码 |
| `p__survey__Setting` | `/survey/:id/setting` | 66 KB | 1 486 | 发布/答题设置 | 代码 |
| `p__user__Login` | `/user/login` | 55 KB | 1 445 | 登录（含 OAuth） | 代码 |
| `p__survey` | `/survey` | 51 KB | 1 512 | 问卷列表容器 | 代码 |
| `p__account__settings` | `/account/settings` | 46 KB | 1 167 | 个人设置 + 第三方绑定 | 代码 |
| `p__Answer__Practice` | `/s/:id/:answerId` | 39 KB | 1 016 | 答题/练习页 | 代码 |
| `p__system__Dept` | `/system/dept` | 38 KB | 1 127 | 部门树 | 代码 |
| `p__Answer__ExamResult` | `/s/:id/exam-result/:answerId` | 32 KB | 847 | 考试成绩单 | 代码 |
| `p__system__Dict` | `/system/dict` | 29 KB | 811 | 数据字典 | 代码 |
| `p__survey__Report` | `/survey/:id/report` | 29 KB | 778 | 统计分析图表 | 代码 |
| `p__user__Register` | `/user/register` | 28 KB | 660 | 注册 | 代码 |
| `p__Template` | `/template` | 26 KB | 806 | 模板广场 | 代码 |
| `p__Answer` | `/s/:id` | 26 KB | 602 | 公开答题入口 | 代码 |
| `p__Answer__PublicQuery` | `/s/:id/result/:resultId` | 21 KB | 594 | 公开结果查询 | 代码 |
| `p__system__Position` | `/system/position` | 16 KB | 422 | 职务管理 | 代码 |
| `p__user__mobile` | `/user/mobile` | 9 KB | 255 | 移动端登录 | 代码 |
| `p__Exercise` | `/exercise` | 1.5 KB | 62 | 我的练习（壳） | 代码 |
| `p__Exercise__mobile__Practice` | `/exercise/:repoId`(移动) | 3 KB | 85 | 移动端练习 | 代码 |
| `p__Home` | `/home` | 1.4 KB | 59 | 首页（壳，内容在别处） | 代码 |
| `p__repo__Questions` | `/repo/:repoId/questions/:mode` | 0.6 KB | 27 | 题目列表（壳） | 代码 |
| `layouts__BasicLayout` | 全局 | 1.3 KB | 52 | 主布局（侧栏+头） | 代码 |
| `layouts__AppLayout` | 全局 | 0.6 KB | 25 | 二级布局 | 代码 |

> 小 chunk（<2 KB）不是页面为空，而是把实现拆到了数字命名的公共 chunk 里。

## 二、布局与共享组件

### 主布局 `layouts__BasicLayout`

- 用 dva 连接全局状态：`isMobile`、`currentUser()`
- 挂载时自动拉 `GET /api/currentUser`
- 结构：AntD `Layout` → `Sider`（可折叠）+ `Header` + `Content`
- Header：Logo、系统名（后台可配）、帮助、语言切换、用户下拉

### 侧边菜单（实测）

`首页`(`home`) → `我的项目`(`project`) → `我的练习`(`form`) → `题库中心`(`database`, 二级) → `模板广场`(`copy`) → `系统管理`(`setting`, 二级)

### 技术选型（对重写有意义）

- **表单引擎：Formily**（`__FORMILY_DEV_TOOLS_HOOK__` 可证）。字段联动用 `reactions`，取值用 `query().get('value')`
- 状态：dva model
- 图表：**G2**（G2 系，可能经 `@ant-design/charts` 封装；另见少量 echarts 痕迹）
- 富文本：**Quill**（主要）+ **Slate**（编辑器内核），非 ProseMirror

## 三、重点页面详解

### 1. 问卷设计器 —— `p__repo__Template`（935 KB，最大）

`/survey/:id/edit` 与模板编辑复用同一个组件库，故 chunk 名带 `repo/Template`。
这是整个前端最重的部分，**约等于一个完整的表单搭建器**。

**面板划分**（来自 i18n id `pages.survey.editor.panels.*`）：

| 面板 | 词条数 | 作用 |
|---|---:|---|
| `logic` | 23 | 逻辑编排：显隐/跳转/校验/计算规则 |
| `mainTool` | 14 | 主工具栏：撤销重做、预览、保存、发布、切换模式 |
| `theme` | 9 | 主题：背景图、头图、配色、字号 |
| `template` | 6 | 模板套用 |
| `question` | 5 | 题目编辑 |
| `sidebar` | 3 | 左侧题型/大纲栏 |

**属性面板**（`pages.survey.editor.attributes.*`，163 条 → 与 `SurveySchema.Attribute` 字段一一对应）：

| 分组 | 词条数 | 对应字段 |
|---|---:|---|
| `scope` | 46 | `scope` / `softScope`（数据范围校验，含日期、数字、文本长度等） |
| `examAnswerMode` | 12 | `examAnswerMode`（6 种计分方式说明） |
| `regexp` | 7 | `regexp: ExpressionMessage[]` |
| `modeAttribute` | 6 | 问卷/考试模式下的差异属性 |
| `dataSource` | 6 | 选项编辑 |
| `answerLimit` | 5 | `answerLimit` |
| `replaceTextRule` / `rejectOther` / `jumpRule` / `finishRule` / `visibleRule` / `calculate` / `checkedRule` | 各 5 | 同名规则字段 |
| `matrixType` | 4 | 矩阵四种子类型 |
| `validateRule` / `requiredRule` | 各 4 | 校验规则 |
| `autoSize` / `hidden` | 各 3 | 展示属性 |

**题型组件**：`pages.survey.editor.widgets.*`（96 条）—— 每种题型一个编辑组件
**题目渲染**：`pages.survey.editor.questions.*`（61 条）

> 重写建议：这一块直接对应 `SurveySchema` + Formily。如果沿用 Formily，渲染层能省一半工；
> 但**规则表达式引擎**（见 `model.md` 第三节）必须自己写。

### 2. 答卷数据 —— `p__survey__Data`（135 KB）

- 表格展示全部答卷，支持搜索/筛选/分页
- 支持**自定义列与公式列**（i18n `pages.survey.data.download.formula.*` 有 `uploadDate` / `sourceName` 等变量提示，说明有表达式列生成器）
- 导出（Excel）、批量删除、恢复（回收站）
- 调用：`GET /api/answer/list`、`POST /api/answer/download`

### 3. 统计分析 —— `p__survey__Report`（29 KB）

- 单题统计：饼图/柱图/词云，按 `questionType` 选图表
- 交叉分析、答题人画像（来自 `ReportStatKeyEnum`）
- 调用：`GET /api/report/{shortId}`、`GET /api/report/`

### 4. 流程编排 —— `p__survey__Flow`（170 KB）

- 可视化流程图编辑器（节点/连线/审批人）
- 后端 `/api/workflow/*` 有 10 个端点，但前端接入较浅——**半成品状态**

### 5. 发布设置 —— `p__survey__Setting`（66 KB）

完全对应 `ProjectSetting`：

- 答题设置：密码、进度条、是否登录、题号、自动保存、回收上限、截止时间、微信限制、IP/Cookie/登录/白名单限次、一页一题、答题卡、校验触发时机、默认语言
- 提交后：自定义 HTML、允许改答案、跳转链接、公开查询、答案解析、成绩单、排行榜
- 考试设置：起止时间、最短/最长交卷、排名、练习模式、闯关模式、随机抽题、错题练习、切屏次数

### 6. 项目列表 —— `p__Project`（126 KB）

- 卡片/列表视图切换，支持文件夹树（`parentId`）
- 创建问卷 / 创建考试 / 从模板创建 / 从 Excel / 纯文本导入
- 复制、移动、回收站、恢复、彻底删除
- 协作人管理（`/api/project/partner/*`）

### 7. 题库 —— `p__repo__Repo` + `p__repo__Book` + `p__repo__Questions`

- `Repo`：题库列表（增删改、导入导出、绑定项目）
- `Book`：练习册（296 KB，含练习编排）
- `Questions`：题目管理，按 `mode` 区分（顺序/随机/错题/收藏/标记）

### 8. 公开答题侧 —— `p__Answer*`

| 页面 | 路由 | 职责 |
|---|---|---|
| `p__Answer` | `/s/:id` | 答题入口：校验密码/登录/时间/次数，然后进 Practice |
| `p__Answer__Practice` | `/s/:id/:answerId` | **答题主界面**：渲染 32 种题型、答题卡、自动保存、提交 |
| `p__Answer__ExamResult` | `/s/:id/exam-result/:answerId` | 成绩单：得分、逐题对错、解析 |
| `p__Answer__PublicQuery` | `/s/:id/result/:resultId` | 公开查询 |

> `Practice` 是**第二重要的重写对象**（39 KB / 1016 行）：它才是真正把 `SurveySchema` 渲染成可交互表单的地方。

### 9. 系统管理

`User` / `Role`（含 AclEditor 权限矩阵）/ `Dept`（树）/ `Position` / `Dict`（字典+条目）/ `SystemSettings`（AI、OAuth、备份、存储）

### 10. 登录注册

`Login`（账号密码 + 图形/滑块验证 + Google/微信 OAuth）、`Register`（可选角色选择）、`mobile`（移动端）、`Setup`（首次初始化：选数据库、建表、建管理员）

## 四、还原度说明

| 项 | 状态 |
|---|---|
| 全部 32 个页面 chunk | ✅ 已抓取、已美化、已定位路由 |
| 页面 → API 调用关系 | ✅ 见 `spec/api.md` |
| 页面 → 文案/功能点 | ✅ 1494 条 i18n 已导出 |
| 组件级细节（每个按钮位置、每个表单校验） | ⚠️ 需逐页细读，成本在于 21 556 行的设计器 |
| 视觉还原（间距/配色/图标） | ⚠️ 产物只有 CSS 类名，精确像素值需从 `umi.*.css` 反推或实测截图 |

**未做**：没有尝试把压缩产物还原成可编译的 TSX 源码。技术上可行（webpack 结构完整、chunk 名保留），但产出是「能读不能跑」的代码——对「重写一套新前端」这个目标，读得懂规格比拿到半可编译源码更有价值。
