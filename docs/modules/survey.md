---
id: module-survey
title: 考试编辑器与题型
status: current
keywords:
  - 编辑器
  - 题型
  - 问卷 schema
  - 规则引擎
  - 预览
  - 设计器
  - 随机题
  - 班级分配
  - 按班窗口
  - t_project.survey
source_globs:
  - client/src/pages/survey/**
  - client/src/designer/**
  - client/src/renderer/**
  - client/src/schema/**
  - server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/SurveyServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/PublicProjectLoader.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectAnswerValidator.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ClassResourceService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/PublicAnswerSubmitter.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/LoginFormValidator.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/PublicSurveyExtrasService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerLimitGuard.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectStatisticsService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerLookup.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RandomSurveyProcessor.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/SurveySchema.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/mapper/ProjectViewMapper.java
entrypoints:
  - client/src/pages/survey/Editor.tsx
  - client/src/pages/survey/Overview.tsx
  - client/src/designer/defaults.ts
  - client/src/renderer/registerAll.ts
  - client/src/renderer/SchemaRenderer.tsx
  - client/src/schema/rules/engine.ts
  - server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/SurveyServiceImpl.java
apis:
  - POST /api/public/loadProject
  - POST /api/public/projectOutline
  - POST /api/public/validateProjectOutline
  - POST /api/public/question
  - POST /api/public/validateProject
  - POST /api/public/saveAnswer
  - POST /api/public/tempSaveAnswer
  - POST /api/public/statistics
  - POST /api/public/loadExamResult
  - POST /api/public/attempts
  - POST /api/public/exam/switch-screen
  - GET /api/project
  - POST /api/project/update
tables:
  - t_project
  - t_answer
  - t_template
tests:
  - client:npm run check
  - docs:npm run docs:check
last_verified: 2026-11-22
verified_against: 8e9886a12b322d543a26c9d38d15f084b62f2c8e
---

# 考试编辑器与题型

## 30 秒摘要

题目不是独立表，而是 `t_project.survey` 里的一棵 `SurveySchema` JSON 树；编辑器只改这棵树，保存时整包写回项目。前端分三层：`schema/` 定义树与规则表达式，`designer/` 负责增删改/大纲/属性面板，`renderer/` 负责按题型渲染并收集答案。后端 `SurveyApi` 是公开答题接口，`SurveyServiceImpl` 负责访问校验、逐题下发、随机抽题和交卷；真正的判分在 [answer](./answer.md)。

## 什么时候看这篇

- 要加一种题型、改属性面板、改规则表达式或预览样式。
- 答题页出现"[未注册题型] xxx"、选项不显示、填空题提交 500。
- 要改"逐题下发"、题目随机顺序、随机抽题、闯关模式倒计时。
- 要确认考试模式下正确答案会不会被前端拿到。
- 想知道"到底有多少种题型"，以及旧文档里的 14/18 为什么对不上。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 编辑器 | `client/src/pages/survey/Editor.tsx` | 顶部编辑/设置/统计/分享/发布 + 「AI 组卷」「AI 质检」（`ai:use` 门控）；左栏题目/大纲/主题页签；右栏快捷/题目；画布整块选中；批量分值（计分关闭时隐藏）/必填；预览用弹窗内嵌真实答题页（`/s/:id?preview=1`）；JSON/主题/保存。卷头设置已挪到打印页 |
| 概述/发布设置 | `client/src/pages/survey/Overview.tsx` | 概览与全部 `setting` 合并保存；旧 `/setting` 路由兼容 |
| 题型定义 | `client/src/designer/defaults.ts` | `QUESTION_META`（面板 20 项）、`createQuestion`、`normalizeSchema` |
| 大纲/树操作 | `client/src/designer/tree.ts` | `insertNode` / `moveNode` / `cloneNode` / `flattenOutline` |
| 属性/规则面板 | `client/src/designer/AttributePanel.tsx`、`RuleEditor.tsx`、`RuleSettingRow.tsx`、`attributeSchema.ts` | 通用属性、显隐/必填条件、分值/答案/解析；跳转/计算是「一行摘要 + 点击设置」弹窗（`JumpRuleEditor` / `CalculateRuleEditor`，内容在弹窗里） |
| Schema 类型 | `client/src/schema/types.ts` | 与后端 `SurveySchema.java` 对应的 `QuestionType` / `Attribute` |
| 拍平/题号 | `client/src/schema/flatten.ts` | 只对 `DATA_TYPES` 递增题号，容器继续下钻 |
| 规则构建/求值 | `client/src/schema/rules/buildExpression.ts`、`engine.ts`、`jump.ts`、`calculate.ts` | 显隐/必填：`RuleConfig` → `AND(...)` → 布尔；跳转：条件 → 目标题/END；计算：六种运算 + 系数 + 精度 |
| 渲染注册表 | `client/src/renderer/registerAll.ts`、`registry.ts` | 17 个题型组件；未注册类型显示占位框 |
| 渲染入口 | `client/src/renderer/SchemaRenderer.tsx` | 按 `displays` 隐藏、渲染题号/题干/组件、处理题组/说明/分割线 |
| 公开接口 | `server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java` | `/api/public/**`，无 `@PreAuthorize`，校验在 Service |
| 业务实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/SurveyServiceImpl.java` | `loadProject` / `loadPublicQuestion` / `saveAnswer` / `loadExamResult` 的入口；门面只做委托，实现在 impl 包组件里（`PublicProjectLoader`、`PublicAnswerSubmitter`、`ProjectAnswerValidator`） |
| 打印 | `client/src/pages/survey/Print.tsx` | A4 分页、A3 双页拼版、卷头设置抽屉（标题/副标题/考生信息，保存即写库）、试卷信息/代码/密封线/页码/答题区/页边距、网格答题卡、答案速查（客观题 8 列格 + 简答逐题）；Word 导出同源，排版细节见 [compose](./compose.md) |
| 随机抽题 | `server/rdbms/src/main/java/cn/surveyking/server/impl/RandomSurveyProcessor.java` | 编辑器 `RandomSurvey` 节点 + `examSetting.randomSurvey` |
| 数据表 | `t_project`、`t_answer`、`t_template` | 项目含 schema；答案含随机卷快照；模板供抽题 |

## 关键流程

1. **打开编辑器**：`/survey/:id/edit`（路由守卫 `project:update`）调 `GET /api/project`，把 `survey` 放进 `useHistoryState`，`setting` 原样保留。左侧面板点击/拖拽 `QUESTION_META` 调 `createQuestion`，插入当前容器或当前题的父级；大纲支持同级拖拽排序，跨父级拖拽被忽略。
2. **保存**：`Editor.tsx` 的 `save` 先 `normalizeSchema(survey)` 补齐每道题的 `children`（后端提交链路会直接取 `children.get(0)`），再 `POST /api/project/update { id, name, survey, setting }`。整包覆盖，未改字段由编辑器现有状态保留。
   - **离开自动保存**：返回、设置、统计、打印统一走 `leaveTo`，有未保存改动时先写库再跳转；`beforeunload` 也会拦截刷新/关页。
   - **返回**：`components/BackButton.tsx` 优先 `navigate(-1)`，没有站内历史才回 fallback；概述页只保留一个「返回上一级」，不再重复「项目列表」。
   - **题型分值**：概述页显示每种题型的题数、每题分值、题型小计，以及整卷题数/总分/平均每题；可按整套总分 + 题型比例分配每题分值，再「按题型应用」。
3. **题型盘点**：设计器面板 `QUESTION_META` 共 **20 项**：选择类 8 项（单选、多选、下拉、NPS、矩阵单选/多选、级联、判断），填写类 9 项（填空、多空填空、多行文本、矩阵填空、地址、富文本、评分、签名、上传），结构类 3 项（题组、说明、分割线）。渲染器实际注册 **17 个组件**；后端 `SurveySchema.QuestionType` 有 31 个枚举值，其中 `dataType()` 24 个、`examType()` 7 个。签名/上传是文件类题：属性面板的 `fileAccept`/`maxFileSize`/`maxFileCount` 管允许的类型、单文件 MB 上限与数量，答案形如 `{题目id: {空位id: fileId}}`，空位 id 必须是 `children[0].id`。README 说的"18 种"是面板早期口径（当时 17 项 + 未进面板的 `Pagination` 容器，README 自己列出的名字也只有 17 个），`docs/scope.md` 的"14 种"是更早的旧口径。
4. **规则**：显隐/必填（`visibleRule` / `requiredRule`）仍是 JSON 条件，内容形如 `{ conditionLogic: 'AND', conditionItem: [...] }`；`buildExpression` 把它拼成 `AND(#{q1.o1} ,NOT(#{+q2}))`（分隔符是空格+逗号，不能改成纯逗号），`engine.evaluateRule` 求值。
   - **跳转（`jumpRule`）**：`{"targetType":"question","targetQuestionId":"…","conditionLogic":"AND","conditionItem":[...]}`；`targetType=end` 表示提前结束；`conditionItem` 为空 = 始终跳转。目标只能选当前题之后的题，条件可以引用当前题及之前的题。
   - **计算（`calculate`）**：`{"operation":"sum|avg|product|max|min|count","questionIds":[...],"coefficient":1,"precision":0}`；答题页在来源题变化时重算并回填本题。
   - 三个规则都只在**前端**求值，后端只负责存取；解析失败的规则返回 `undefined/success=false`，表现为"规则不生效"而不是报错。跳转只在答题页生效：到达 END 后后续题不再显示、也不再参与必填校验，但仍需手动交卷（与卷王一致）。
5. **预览**：编辑器右上「预览」用 iframe 打开 `/s/:id?preview=1`，跑的是真实答题页（`SchemaRenderer` 的 `mode='preview'` 分支只在答题页用），显隐规则、题号与学员看到的完全一致；编辑态一律按 `mode='edit'` 渲染，隐藏题不会在设计器里消失。`?preview=1` 由后端 `PublicProjectLoader#isPreviewAllowed` 处理：只对管理员/项目所有者/协作者跳过「能不能答」的校验（发布状态、考试时间窗、班级分配），「能不能看」没有放松，交卷也不走这段——所以未发布的卷子能预览，但预览里交不了卷。
6. **首屏与逐题下发**：答题页先 `POST /api/public/projectOutline`，后端 `loadProjectOutline` 只返回 `outline`（题号/题型/必填）和一个不含题干/选项的 shell；前端再按题 id 调 `POST /api/public/question` 取单题。`loadPublicQuestion` 会重新走 `loadProject` 校验项目访问权限（**包括班级分配**），并校验题目确实属于当前问卷/当前随机卷快照。
7. **答案剥离**：公开视图由 `ProjectViewMapper.toPublicProjectView` 生成，考试模式且非练习模式时会 `trimExamAnswerInfo` 去掉 `examCorrectAnswer`、`examScore`、`examMatchRule`；`loadPublicQuestion` 默认再剥一次正确答案/解析/分值。只有 `examSetting.exerciseMode=true` 时保留正确答案与解析给前端即时判题，分值仍然不下发。
8. **随机题**：`RandomSurveyProcessor.processRandomSurvey` 在考试模式下处理两种来源：编辑器里的 `RandomSurvey` 节点，以及 `examSetting.randomSurvey` 配置。抽出的卷子会写进 `t_answer.survey` 快照，并用 `rd_answer_id_<projectId>` Cookie（7 天）复用；`examSetting.randomOrder=true` 时 `ProjectViewMapper.randomSchemaOrder` 会打乱非填空/非简答题目，填空题顺序保持不变。
9. **交卷**：答题页 `POST /api/public/saveAnswer`，`SurveyServiceImpl.saveAnswer`（门面只做委托，实现在 impl 包组件里：校验走 `AnswerValidationService`，落库走 `PublicAnswerSubmitter`）先校验项目可提交（状态/截止/回收上限）、答案门槛（密码/登录/白名单/开始时间/限次），再交给 `AnswerServiceImpl` 保存、判分、写错题本。闯关模式的超时裁决在 `ExamControlService#applyPassModePenalty` 里完成（由 `PublicAnswerSubmitter` 调用）。

### 按班级分配（学生准入）

1. 公开链路的所有入口最终都会走 `ProjectAnswerValidator#validateProject`（`loadProject` / outline / 逐题 / 上传），交卷再走 `validateAnswerGate`；两处都会先调 `ClassResourceService#assertStudentCanAnswer`。
2. 登录用户是 `student` 时：没有班级、或所在班没有这场考试的 `t_class_resource` 分配 → `ProjectNotFound`（404，不泄露标题）；班级/全局未开始 → `ExamUnStarted`；已结束 → `ExamFinished`；班级开关关闭/项目停用 → `SurveySuspend`。
3. 全局窗口 `ProjectSetting.examSetting.startTime/endTime` 是硬上限；班级窗口为空继承全局，非空必须落在全局窗口内（由班级管理页维护，见 [teaching](./teaching.md)）。
4. 匿名、staff、管理员直接放行；练习/错题本伪项目（`ExerciseProjectTemplate.EXERCISE_PROJECT_ID`）也直接放行，不参与班级分配。

### 数据页与报表（2026-11）

- 数据页 `/survey/:id/data`：顶部过滤条六维条件（班级 / 交卷时间 / 交卷状态 / 批改状态 / 分数段 / 姓名，外加「含匿名 / 仅实名」开关），条件定义与导出共用 `data/filters.ts`；班级只存 URL（`?classId=`），报表页、教学页跳过来能直达。「未交」不是过滤答卷，而是把列表换成未交名单（`data/UnsubmittedPanel.tsx`，数据源是「班级在册学员 − 已交」，没选班级时只提示、不发请求）。
- 导出弹窗 `data/ExportModal.tsx`：五种格式——Excel 明细 + 成绩单 PDF / 答题卷 PDF / 长图 PNG / 成绩确认单（后四种走同一个异步任务、打成一个 ZIP），范围可选「当前筛选」或「仅勾选」，关掉弹窗会取消正在跑的任务。
  选「当前筛选」时六维条件会原样带进异步任务（批改状态/姓名/分数段/含匿名也算），所以 ZIP 里与屏幕上是同一批答卷；选「仅勾选」时只按 ids，不叠加筛选。
- 报表页 `Report.tsx`：班级 + 交卷时间筛选写进 URL，带班级时走 `/api/report/class/{id}`；逐题区块除分布图外还显示「答题 N 人 / 判分 M 人 / 正确率」。
- 判分、导出、统计的口径都在 [answer](./answer.md)，AI 批改与错题重练在 [ai](./ai.md)；这一页只记入口，不重复那边的规则。

### 编辑器里的 AI 入口（2026-11）

- 顶部「AI 组卷」（弹窗：从题库抽题、预览后写入画布，一次一个撤销步）与「AI 质检」（抽屉：读的是**已保存**的卷子），选中题的浮标 / 属性面板 / 右键菜单里还有「AI 优化题干」（抽屉：采纳后留题干快照，可「恢复原题干」）。
- 三个入口都按 `ai:use` 门控：没权限时**不渲染**（不是灰掉），权限列表没回来之前也不渲染。
- `/survey/:id/edit?ai=pick|check|rewrite` 可直达对应面板（对话里的「打开工具」就靠它）；参数只认一次，面板关闭时用 `replace` 摘掉，刷新不会再弹。
- 能力清单、限额，以及「AI 不写库 / 采纳后才写」的边界见 [ai](./ai.md)。

## 修改指南

### 新增一种题型

1. `client/src/schema/types.ts`：把类型加进 `QuestionType`，并判断是否加入 `DATA_TYPES` / `EXAM_TYPES`（决定是否存答案、是否可自动计分）。
2. `client/src/designer/defaults.ts`：在 `QUESTION_META` 加面板项，在 `createQuestion` 里写默认 `attribute` / `children` / `dataSource`。
3. `client/src/renderer/questions/` 写组件，并在 `registerAll.ts` `registerQuestion` 一行；否则答题页只会显示"[未注册题型]"。
4. 后端 `SurveySchema.QuestionType` 同步枚举；需要判分时再加 `AnswerScoreEvaluator` 的 evaluator 和 `EXAM_TYPES`。
5. 更新本页的题型盘点与 `source_globs`，并跑 `npm run check`。

### 新增/修改属性

1. `SurveySchema.Attribute`（后端）与 `client/src/schema/types.ts` 的 `Attribute` 同步。
2. `AttributePanel.tsx` 负责表单，`attributeSchema.ts` 负责分组/显隐；分值、答案、解析在考试分区。
3. 如果是答案格式相关的属性，还要改 `renderer/questions/answers.ts` 与数据页的 `pages/survey/data/format.ts`。

### 修改规则语义

1. 先改 `buildExpression.ts`（结构 → 表达式）与 `engine.ts`（求值）；两边要保持同一条语法约定。
2. 显隐/必填的候选题目只取当前题之前的题，避免自引用；跳转条件可以引用当前题（`JumpRuleEditor` 用 `questionsAll` 切到当前题），跳转目标只能取当前题之后的题。
3. 规则只在浏览器求值，服务端不做二次校验；如果规则影响"必填/分数"，必须在后端再实现一遍。跳转/计算不改变服务端判分口径：被跳过的题没有答案，按未作答计 0 分。

## 权限与数据范围

| 动作 | 权限 | 说明 |
|---|---|---|
| 打开编辑器 | `project:update` + `@EnableDataPerm` | 只有 OWNER/COLLABORATOR/admin 能改 |
| 打开概述/发布设置 | `project:detail` | 保存设置还要 `project:update` |
| 公开加载/逐题/交卷 | 无 `@PreAuthorize` | `/api/public/**` 放行，由 Service 校验项目状态、密码、登录、白名单、限次；student 还要通过班级分配/窗口校验 |
| 查看统计 | 无（公开统计） | `statProject` 只统计配置了 `statEnabled` 或 `quota` 的题 |
| 查看成绩单/解析 | 无（凭 answerId） | 是否返回答案/排名由 `submittedSetting` 决定 |

## 坑与已知限制

- **统计有 20000 份的硬上限**：`statProject` 先 `count()`，超过 `STAT_MAX_ANSWERS` 抛 `ErrorCode.StatisticsTooLarge(4060)`，提示按班级/时间段筛选。这个上限是为了在「全量内存聚合」的实现下守住 `-Xmx768m`；S2 把统计改成投影表 + `GROUP BY` 之后可以放开。
- **统计优先走投影表**：`statProject` 先比对 `t_answer_item` 覆盖的答卷数与该场总数，相等就用 `GROUP BY` 聚合（只回传「题 × 选项」计数），否则回退到旧的「全量内存遍历」。新增统计逻辑时优先扩投影表，不要往内存算法里加东西。
- **"18 种题型"是旧文案**：`QUESTION_META` 实际 20 项（2026-11 加了签名、上传）；`Pagination` 是 schema 支持但面板不提供的容器，`MatrixAuto`/`Barcode` 等后端枚举也不进面板。写文档/答复用户时不要按 18 去数，否则会和代码对不上。
- **未注册题型不会报错，只会占位**：`SchemaRenderer` 找不到组件时渲染橙色"[未注册题型] xxx"，答卷仍可提交但该题没有输入控件。加后端枚举/导入题时尤其容易踩。
- **选项有两份数据**：`dataSource`（渲染器读）和 `children` 的 `Option` 节点（答案 key、统计、计分读）必须同时存在。导入的题库题常常只有 `children`，练习页会补 `dataSource`；编辑器保存前也会 `normalizeSchema`。
- **考试模式公开视图会剥答案**：如果自定义页面直接读 `/api/public/loadProject` 的 `survey` 找 `examCorrectAnswer`，在非练习模式下永远拿不到；这是防泄题，不是 bug。
- **成绩单解析可能回退到项目 schema**：随机卷的历史快照可能已被剥掉正确答案，`loadExamResult` 只有在快照里确实有答案时才用快照，否则回退项目 schema。
- **规则表达式分隔符敏感**：`buildExpression` 输出用 `" ,"` 连接；把分隔符改成 `","` 会让 `splitTopLevel` 解析出空参数，规则静默失效。
- **`Remark` 的文字在 `attribute.content`**：设计器右侧「说明内容」用 `RichTextEditor` 编辑这个字段（不是 `title`/`description`）；渲染端 `DOMPurify.sanitize` 后 `dangerouslySetInnerHTML`。普通题的 `description` 也走同一个编辑器，保存时后端 `RichTextSanitizer` 再做白名单消毒；图片 src 只允许 `/api/public/preview/{id}`。`RichText` 是**答题者输入的富文本题**：编辑器支持字号/颜色/对齐/列表/缩进/链接/代码块/公式/题目引用/图片，答案按 HTML 字符串存，保存时 `AnswerScoringService` 再消毒；`Remark` 是只读展示题，两者不要混用。公式编辑态显示 LaTeX，阅读态由 `RichTextContent` 用 KaTeX 渲染。
- **矩阵题行列标题**：`AttributePanel` 的矩阵编辑器维护 `schema.row` 与 `dataSource`/`children`；新增/删除行或列会同步选项节点，避免只改显示不改答案 key。
- **题目描述图片安全**：编辑器上传后后端按魔数解码并重编码 JPEG/PNG/BMP/WBMP；图片响应禁止 MIME 嗅探并带 CSP；SVG 不在支持列表。
- **`randomSurvey` 没有前端入口**：`ExamSetting.randomSurvey` 只能通过接口/直接改 JSON 配置；编辑器只提供 `randomSurveyWrong` 开关。
- **逐题下发依赖服务端重新校验**：`/api/public/question` 不接受任意 `answerId` 绕过；但每次取题都会重新跑 `loadProject`，题目多时首屏请求数会明显上升。
- **按班准入只在 Service 层**：`/api/public/**` 没有 `@PreAuthorize`，班级分配/窗口全靠 `ProjectAnswerValidator`；新增公开入口时必须复用 `validateProject`/`validateAnswerGate`，否则拿到 projectId 就能绕过。
- **未分配是 404 不是 403**：`assertStudentCanAnswer` 对「没有班级 / 班级没有分配」统一抛 `ProjectNotFound`，避免泄露考试存在；排查「学生说打不开」时先查 `t_class_resource`，不要只看项目状态。

## 验证

```bash
cd client && npm run check
npm run docs:check
```

手工回归：

1. 新建考试，依次拖入单选/多选/填空/矩阵/题组/说明/分割线，保存后刷新，树结构与题号不变。
2. 给某题配"选中 A 时显示 B"，预览里勾选 A 后 B 出现，取消后 B 消失；答题页同样生效。
3. 考试模式下用浏览器 Network 看 `/api/public/question`，非练习模式不应出现 `examCorrectAnswer`。
4. 开启练习模式（`exerciseMode`）后，单题响应应带正确答案/解析，但仍不带 `examScore`。

### 问卷/考试模式分区（2026-11）

- 项目设置新增 `examSetting.scoringEnabled`：考试默认 true，问卷默认 false；问卷可手动开启计分。
- 关闭计分时，概述页隐藏题型分值/考试控制、编辑器隐藏「批量设置分值」按钮、数据页隐藏得分列，问卷属性的「考试」分组（分值、正确答案、解析、判分模式）不渲染。
- 报表「答卷概览」统计已开始/已提交/完成率/匿名数/平均填写时长；问卷也有这套收集指标，只是不出现正确率和分值段（除非手动开启计分）。
- 新建项目时按考试/问卷给出默认提示：考试默认计分，问卷默认匿名收集+回收限制。

## 2026-11-21 答题后自动下一题

- 「答题显示」卡片新增 `autoNextAfterAnswer`，与 `onePageOneQuestion` 同层；练习模式开启时开关禁用。
- 保存进 `answerSetting` JSON，前端类型见 `schema/project.ts`，无数据库迁移。

## 相关文档

- [考试与问卷（项目）](./project.md)
- [答卷、判分与报表](./answer.md)
- [题库与题目](./repo.md)
- [从题库组卷到考试](../flows/repo-compose.md)
- [前端结构](../architecture/frontend.md)

## 2026-11-19 报表页改版

- 分值分析从「三档百分比」改成**绝对分数段**（桶宽按满分自动选：≤20 分 5 分一档、≤60 分 10 分一档、其余 20 分一档），上方加 9 个指标：已判分/卷面满分/平均分/中位数/标准差/最高/最低/及格率/优秀率。
- 逐题分析从「每题一个折叠块」改成**一张可排序表 + 右侧抽屉**：列含答题/答对/正确率/均分/未答/难度/**区分度**（总分前 27% 与后 27% 的正确率差，D&lt;0.2 标橙）。
- 错题排行、逐题表在窄屏加横向滚动，不再把题干压成一字一行。
