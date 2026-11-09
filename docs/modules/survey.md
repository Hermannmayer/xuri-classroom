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
  - t_project.survey
source_globs:
  - client/src/pages/survey/**
  - client/src/designer/**
  - client/src/renderer/**
  - client/src/schema/**
  - server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/SurveyServiceImpl.java
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
  - client:npm run test:rules
  - client:npm run test:tree
  - docs:npm run docs:check
last_verified: 2026-11-09
verified_against: f348f0ae1b4a2ba3f354702d89db0c9ab5c30bb1
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
| 编辑器 | `client/src/pages/survey/Editor.tsx` | 工具栏、题型面板、大纲、画布、预览、JSON/主题、保存 |
| 概述/发布设置 | `client/src/pages/survey/Overview.tsx` | 概览与全部 `setting` 合并保存；旧 `/setting` 路由兼容 |
| 题型定义 | `client/src/designer/defaults.ts` | `QUESTION_META`（面板 17 项）、`createQuestion`、`normalizeSchema` |
| 大纲/树操作 | `client/src/designer/tree.ts` | `insertNode` / `moveNode` / `cloneNode` / `flattenOutline` |
| 属性/规则面板 | `client/src/designer/AttributePanel.tsx`、`RuleEditor.tsx`、`attributeSchema.ts` | 通用属性、显隐规则、分值/答案/解析 |
| Schema 类型 | `client/src/schema/types.ts` | 与后端 `SurveySchema.java` 对应的 `QuestionType` / `Attribute` |
| 拍平/题号 | `client/src/schema/flatten.ts` | 只对 `DATA_TYPES` 递增题号，容器继续下钻 |
| 规则构建/求值 | `client/src/schema/rules/buildExpression.ts`、`engine.ts` | `RuleConfig` → `AND(...)` 表达式 → 布尔 |
| 渲染注册表 | `client/src/renderer/registerAll.ts`、`registry.ts` | 14 个题型组件；未注册类型显示占位框 |
| 渲染入口 | `client/src/renderer/SchemaRenderer.tsx` | 按 `displays` 隐藏、渲染题号/题干/组件、处理题组/说明/分割线 |
| 公开接口 | `server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java` | `/api/public/**`，无 `@PreAuthorize`，校验在 Service |
| 业务实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/SurveyServiceImpl.java` | `loadProject` / `loadPublicQuestion` / `saveAnswer` / `loadExamResult` |
| 随机抽题 | `server/rdbms/src/main/java/cn/surveyking/server/impl/RandomSurveyProcessor.java` | 编辑器 `RandomSurvey` 节点 + `examSetting.randomSurvey` |
| 数据表 | `t_project`、`t_answer`、`t_template` | 项目含 schema；答案含随机卷快照；模板供抽题 |

## 关键流程

1. **打开编辑器**：`/survey/:id/edit`（路由守卫 `project:update`）调 `GET /api/project`，把 `survey` 放进 `useHistoryState`，`setting` 原样保留。左侧面板点击/拖拽 `QUESTION_META` 调 `createQuestion`，插入当前容器或当前题的父级；大纲支持同级拖拽排序，跨父级拖拽被忽略。
2. **保存**：`Editor.tsx` 的 `save` 先 `normalizeSchema(survey)` 补齐每道题的 `children`（后端提交链路会直接取 `children.get(0)`），再 `POST /api/project/update { id, name, survey, setting }`。整包覆盖，未改字段由编辑器现有状态保留。
3. **题型盘点**：设计器面板 `QUESTION_META` 共 **17 项**：选择类 8 项（单选、多选、下拉、NPS、矩阵单选/多选、级联、判断），填写类 6 项（填空、多空填空、多行文本、矩阵填空、地址、评分），结构类 3 项（题组、说明、分割线）。渲染器实际注册 **14 个组件**；后端 `SurveySchema.QuestionType` 有 33 个枚举值，其中 `dataType()` 24 个、`examType()` 7 个。README 说的"18 种"来自"面板 17 + 未进面板的 `Pagination` 容器"，`docs/scope.md` 的"14 种"是更早的旧口径。
4. **规则**：属性里的 `visibleRule` / `requiredRule` / `finishRule` 等是 JSON 字符串，内容形如 `{ conditionLogic: 'AND', conditionItem: [...] }`。`buildExpression` 把它拼成 `AND(#{q1.o1} ,NOT(#{+q2}))`（分隔符是空格+逗号，不能改成纯逗号），`engine.evaluateRule` 求值。规则只在**前端**求值，后端只负责存取；解析失败的规则返回 `success=false`，表现为"规则不生效"而不是报错。
5. **预览**：`preview` 切换后同一棵 schema 交给 `SchemaRenderer`，并把 `values` 传进去；显隐规则只在预览/答题态应用，编辑态全部显示，否则隐藏题会在设计器里消失。预览不写答案，只用于检查题面与联动。
6. **首屏与逐题下发**：答题页先 `POST /api/public/projectOutline`，后端 `loadProjectOutline` 只返回 `outline`（题号/题型/必填）和一个不含题干/选项的 shell；前端再按题 id 调 `POST /api/public/question` 取单题。`loadPublicQuestion` 会重新走 `loadProject` 校验项目访问权限，并校验题目确实属于当前问卷/当前随机卷快照。
7. **答案剥离**：公开视图由 `ProjectViewMapper.toPublicProjectView` 生成，考试模式且非练习模式时会 `trimExamAnswerInfo` 去掉 `examCorrectAnswer`、`examScore`、`examMatchRule`；`loadPublicQuestion` 默认再剥一次正确答案/解析/分值。只有 `examSetting.exerciseMode=true` 时保留正确答案与解析给前端即时判题，分值仍然不下发。
8. **随机题**：`RandomSurveyProcessor.processRandomSurvey` 在考试模式下处理两种来源：编辑器里的 `RandomSurvey` 节点，以及 `examSetting.randomSurvey` 配置。抽出的卷子会写进 `t_answer.survey` 快照，并用 `rd_answer_id_<projectId>` Cookie（7 天）复用；`examSetting.randomOrder=true` 时 `ProjectViewMapper.randomSchemaOrder` 会打乱非填空/非简答题目，填空题顺序保持不变。
9. **交卷**：答题页 `POST /api/public/saveAnswer`，`SurveyServiceImpl.saveAnswer` 先校验项目可提交（状态/截止/回收上限）、答案门槛（密码/登录/白名单/开始时间/限次），再交给 `AnswerServiceImpl` 保存、判分、写错题本。闯关模式的超时裁决也在 `SurveyServiceImpl.applyPassModePenalty` 里完成。

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
2. `RuleEditor.tsx` 的候选题目只取当前题之前的题，避免自引用；不要把候选范围改成全量。
3. 规则只在浏览器求值，服务端不做二次校验；如果规则影响"必填/分数"，必须在后端再实现一遍。

## 权限与数据范围

| 动作 | 权限 | 说明 |
|---|---|---|
| 打开编辑器 | `project:update` + `@EnableDataPerm` | 只有 OWNER/COLLABORATOR/admin 能改 |
| 打开概述/发布设置 | `project:detail` | 保存设置还要 `project:update` |
| 公开加载/逐题/交卷 | 无 `@PreAuthorize` | `/api/public/**` 放行，由 Service 校验项目状态、密码、登录、白名单、限次 |
| 查看统计 | 无（公开统计） | `statProject` 只统计配置了 `statEnabled` 或 `quota` 的题 |
| 查看成绩单/解析 | 无（凭 answerId） | 是否返回答案/排名由 `submittedSetting` 决定 |

## 坑与已知限制

- **统计有 20000 份的硬上限**：`statProject` 先 `count()`，超过 `STAT_MAX_ANSWERS` 抛 `ErrorCode.StatisticsTooLarge(4060)`，提示按班级/时间段筛选。这个上限是为了在「全量内存聚合」的实现下守住 `-Xmx768m`；S2 把统计改成投影表 + `GROUP BY` 之后可以放开。
- **统计是"全量内存聚合"**：`statProject` 用 `pageSize=-1` 取整场答卷，再用 `ProjectStatHelper` 在堆里按「答卷 × 题 × 选项」做三层遍历；单场 500 份 × 100 题约几十毫秒，但 5000 份以上会明显变慢，届时应改为投影表 + `GROUP BY`（见 `docs/architecture/refactor-catalog.md` 的 S2）。统计路径已改用 `listAnswerForStat` 收窄 SELECT 列，不要改回 `listAnswer`。
- **"18 种题型"是旧文案**：`QUESTION_META` 实际 17 项；`Pagination` 是 schema 支持但面板不提供的容器。写文档/答复用户时不要按 18 去数，否则会和代码对不上。
- **未注册题型不会报错，只会占位**：`SchemaRenderer` 找不到组件时渲染橙色"[未注册题型] xxx"，答卷仍可提交但该题没有输入控件。加后端枚举/导入题时尤其容易踩。
- **选项有两份数据**：`dataSource`（渲染器读）和 `children` 的 `Option` 节点（答案 key、统计、计分读）必须同时存在。导入的题库题常常只有 `children`，练习页会补 `dataSource`；编辑器保存前也会 `normalizeSchema`。
- **考试模式公开视图会剥答案**：如果自定义页面直接读 `/api/public/loadProject` 的 `survey` 找 `examCorrectAnswer`，在非练习模式下永远拿不到；这是防泄题，不是 bug。
- **成绩单解析可能回退到项目 schema**：随机卷的历史快照可能已被剥掉正确答案，`loadExamResult` 只有在快照里确实有答案时才用快照，否则回退项目 schema。
- **规则表达式分隔符敏感**：`buildExpression` 输出用 `" ,"` 连接；把分隔符改成 `","` 会让 `splitTopLevel` 解析出空参数，规则静默失效。
- **`Remark` 用 `dangerouslySetInnerHTML`**：说明文字由设计者/老师录入，直接按 HTML 渲染；如果以后允许学员或外部来源写 `attribute.content`，必须先消毒。
- **`randomSurvey` 没有前端入口**：`ExamSetting.randomSurvey` 只能通过接口/直接改 JSON 配置；编辑器只提供 `randomSurveyWrong` 开关。
- **逐题下发依赖服务端重新校验**：`/api/public/question` 不接受任意 `answerId` 绕过；但每次取题都会重新跑 `loadProject`，题目多时首屏请求数会明显上升。

## 验证

```bash
cd client && npm run check
npm run test:rules
npm run test:tree
npm run docs:check
```

手工回归：

1. 新建考试，依次拖入单选/多选/填空/矩阵/题组/说明/分割线，保存后刷新，树结构与题号不变。
2. 给某题配"选中 A 时显示 B"，预览里勾选 A 后 B 出现，取消后 B 消失；答题页同样生效。
3. 考试模式下用浏览器 Network 看 `/api/public/question`，非练习模式不应出现 `examCorrectAnswer`。
4. 开启练习模式（`exerciseMode`）后，单题响应应带正确答案/解析，但仍不带 `examScore`。

## 相关文档

- [考试与问卷（项目）](./project.md)
- [答卷、判分与报表](./answer.md)
- [题库与题目](./repo.md)
- [从题库组卷到考试](../flows/repo-compose.md)
- [前端结构](../architecture/frontend.md)
