---
id: module-import
title: 试卷导入（解析 / 预览 / 落地）
status: current
keywords:
  - 导入试卷
  - 文本导入
  - 批量导入
  - 解析预览
  - ImportWizard
  - ImportApi
  - ImportPreview
  - TextQuestionParser
  - ExcelQuestionParser
  - RepoTemplateExcelParseHelper
  - 导入去向
  - 题组
  - 矩阵题导入
  - Excel 内嵌图片
source_globs:
  - client/src/pages/import/**
  - client/src/api/import.ts
  - server/api/src/main/java/cn/surveyking/server/api/ImportApi.java
  - server/shared/src/main/java/cn/surveyking/server/core/importer/**
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateExcelParseHelper.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateI18n.java
  - server/shared/src/main/java/cn/surveyking/server/service/ImportService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ImportServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/PaperImportRecordRequest.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/RepoTemplateRequest.java
  - server/shared/src/test/java/cn/surveyking/server/core/importer/**
  - server/api/src/main/resources/template/旭日云课堂题库导入模板.xlsx
  - server/api/src/main/resources/template/旭日云课堂试卷导入模板.docx
entrypoints:
  - client/src/pages/import/ImportWizard.tsx
  - client/src/pages/project/List.tsx
  - client/src/pages/survey/Editor.tsx
  - client/src/pages/repo/Questions.tsx
  - server/api/src/main/java/cn/surveyking/server/api/ImportApi.java
apis:
  - POST /api/import/parse
  - POST /api/import/record
  - POST /api/repo/import
  - GET /api/file/downloadTemplate
tables:
  - t_project
  - t_template
tests:
  - client:npx tsc --noEmit
  - server:gradlew :shared:test --tests "cn.surveyking.server.core.importer.*"
last_verified: 2026-11-17
verified_against: 0c5a8ac03ba685926b817e7ed185a54d58454d89
---

# 试卷导入（解析 / 预览 / 落地）

## 30 秒摘要

导入被拆成两段：**解析（不写库）** 与 **落地（写库）**。

- 解析：POST /api/import/parse，服务端按来源选解析器，统一返回 ImportPreview（题目树 + 扁平列表 + 统计 + 警告）。
- 预览：前端 ImportWizard 三步（选择来源 → 预览确认 → 选择去向），可逐题剔除（题库导入除外）。
- 落地：试卷走既有的 POST /api/project/create 或 POST /api/project/update（整树 JSON，无新表）；题库走 POST /api/repo/import?kind=text。

四种来源都可用：**文本 / Excel / Word / JSON**。Excel 按题型分 sheet，13 个 sheet 覆盖编辑器里除「排序题」外的全部题型（章节列可选拆大题），
并支持**按行归属的内嵌图片**与**「高级配置(JSON)」兜底列**；Word 按「一、二、三」拆大题、用【题型】标注、抽取题干图片；JSON 吃本系统导出的整卷。

> 「排序题」不是本系统的题型：`SurveySchema.QuestionType` 里没有 Rank，前端设计器/渲染器也没有对应组件。
> 模板刻意不提供「排序题」sheet；文本里写【排序题】只会拿到一条 TYPE_UNKNOWN 提示，按内容回退。

## 什么时候看这篇

- 要加一种新的导入来源（Word / Excel / JSON），或调整现有文本解析规则。
- 要给 Excel 模板加一种题型 sheet / 一列表头（见「修改指南」的「加一种题型」）。
- 导入后题数/分值/答案不对、矩阵题行列错位、图片挂到了别的题上，或提示「未识别到题目」。
- 想改导入向导的落点规则（新建题组 / 现有题组）。
- 排查「点导入没反应 / 解析 403 / 创建了空试卷」。

## 代码地图

| 层 | 位置 | 说明 |
|---|---|---|
| 解析契约 | server/shared/src/main/java/cn/surveyking/server/core/importer/ImportPreview.java | 前端预览的唯一数据源；attachments 存图片字节（@JsonIgnore） |
| 文本解析 | server/shared/src/main/java/cn/surveyking/server/core/importer/TextQuestionParser.java | 标题/【题型】标记/选项/答案/解析/分值/多空/矩阵行与列 |
| Excel 解析 | server/shared/src/main/java/cn/surveyking/server/core/importer/ExcelQuestionParser.java | 复用题库模板；用 POI 抽内嵌图片，按锚点行写 [[IMG:n]]；补 dataSource |
| Excel 模板解析 | server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateExcelParseHelper.java | 按 sheet 名分发到 13 种题型，按**表头名字**定位列 |
| 模板 i18n | server/shared/src/main/java/cn/surveyking/server/core/uitls/RepoTemplateI18n.java | sheet 名与表头别名（SheetType / HeaderLabel / 行标题N / 列标题N / 选项树 / 高级配置） |
| Word 解析 | server/shared/src/main/java/cn/surveyking/server/core/importer/WordQuestionParser.java | 段落/表格拍平 → TextQuestionParser；图片抽成 [[IMG:n]] |
| 解析编排 | server/rdbms/src/main/java/cn/surveyking/server/impl/ImportServiceImpl.java | 限制大小、按 kind 分派、把 [[IMG:n]] 换成 <img src> |
| 接口 | server/api/src/main/java/cn/surveyking/server/api/ImportApi.java | /parse、/record |
| 模板下载 | server/rdbms/src/main/java/cn/surveyking/server/impl/FileServiceImpl.java | GET /api/file/downloadTemplate?name=，白名单映射到 classpath template/ |
| 模板资源 | server/api/src/main/resources/template/旭日云课堂题库导入模板.xlsx / 旭日云课堂试卷导入模板.docx | 跟着解析器一起改，改完跑 ImportTemplateFilesTest |
| 题库落地 | server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java | kind=text 改走文本解析；Excel 调 RepoTemplateExcelParseHelper + 按行挂内嵌图片 |
| 行图片索引 | server/shared/src/main/java/cn/surveyking/server/core/importer/ExcelRowImages.java | POI 读内嵌图片，按锚点左上角行索引（试卷导入与题库导入共用） |
| 图片挂题干 | server/shared/src/main/java/cn/surveyking/server/core/importer/QuestionImageUploader.java | 图片上传成 QUESTION_IMAGE（publicRead）并追加 `<img>` |
| 前端向导 | client/src/pages/import/ImportWizard.tsx | 三步 + 统计 + 警告 + 去向 |
| 前端接口 | client/src/api/import.ts | parseImport、recordPaperImport |
| 列表入口 | client/src/pages/project/List.tsx | 新建 → 导入试卷（唯一入口） |
| 编辑器入口 | client/src/pages/survey/Editor.tsx | 顶部「导入」+ 空卷引导 |
| 题库入口 | client/src/pages/repo/Questions.tsx | 导入下拉（Excel / 文本） |

## Excel 模板：13 个 sheet

一个 sheet 对应一种题型，sheet 名不要改（别名在 messages.properties 的 `repo.template.sheet.*`）。

| sheet | 题型 | 该 sheet 专有列 | 答案写法 |
|---|---|---|---|
| 单选题 | Radio | 选项A…选项H | `B`（一个字母） |
| 多选题 | Checkbox | 选项A…选项H | `AC`（多个字母） |
| 判断题 | Judge | 选项A/选项B | `A`（A=正确、B=错误） |
| 填空题 | FillBlank / MultipleBlank | 空1…空8 | 一格一个空；同一空多个答案用 `&` |
| 简答题 | Textarea | — | 答案列为参考答案 |
| 下拉题 | Select | 选项A…选项H | `B` |
| 评分题 | Score | — | 分数列当满星（默认 5） |
| NPS题 | Nps | — | 分数列当最高分（默认 10 → 0~10 共 11 档） |
| 级联题 | Cascader | 选项树(JSON) | 路径 `sd/jn`（取末级 value） |
| 矩阵单选题 | MatrixRadio | 行标题1…10 / 列标题1…10 | 每行一个字母，行之间 `\|`：`A\|B` |
| 矩阵多选题 | MatrixCheckbox | 行标题1…10 / 列标题1…10 | 行内多选用 `,`：`A,B\|C` |
| 上传题 | Upload | — | 答案列写「参考答案/示例说明」，可空 |
| 矩阵填空题 | MatrixFillBlank | 行标题1…10 / 列标题1…10 | 每行一个答案，行之间 `\|` |

公共列：`序号 / 章节 / 题干 / 分数 / 难度 / 标签 / 解析 / 答案`，最后都可跟 `高级配置(JSON)`。
表头**按名字识别**（`RepoTemplateI18n.HeaderLabel` + 行/列标题的序号别名），插列、删空列、换列序都不影响导入。

### 上传题

`schema.type=Upload`，属性跟设计器建题的默认值一致：`maxFileCount=1`、`maxFileSize=5`、`required=false`、`examAnswerMode=none`，并留一个空 `children`（后端有取 `getChildren().get(0)` 的地方）。前端 Upload 组件读的就是 `maxFileCount / maxFileSize`（不是 uploadCount）。答案列写「参考答案/示例说明」，存进 `attribute.examCorrectAnswer`，不参与判分。

### 矩阵题的 schema 形状

矩阵题按**设计器真正生成的形状**落地（`client/src/designer/defaults.ts` 的 MATRIX_TYPES 分支）：

```json
{
  "type": "MatrixRadio",
  "row": [{ "id": "r1", "title": "响应速度" }, { "id": "r2", "title": "专业程度" }],
  "dataSource": [{ "label": "满意", "value": "c1" }, { "label": "一般", "value": "c2" }],
  "children": [{ "id": "c1", "title": "满意", "type": "Option" }, { "id": "c2", "title": "一般", "type": "Option" }]
}
```

- **行**放 `row`（渲染层 `MatrixTable` 按它画行）；**列**放 `dataSource`，`children` 同步一份 Option 节点（答案 key 用）。
- 不生成「children 每行一个子题、子题再套 children」的两层写法：渲染层不认这个形状，会整题显示「未配置矩阵行/列」。
- 矩阵答案原样存进父题 `attribute.examCorrectAnswer`（行之间 `\|`、行内多选 `,`）。矩阵题**不参与自动判分**（前端 EXAM_TYPES 不含矩阵），所以 `examAnswerMode=none`。

### 高级配置(JSON) 兜底列

任何 sheet 都能用。一个 JSON 对象，解析后**深度合并**到该行生成的题目上，可覆盖 `type / title / attribute / children / dataSource`：

```json
{ "attribute": { "required": true, "examMatchRule": "contain" }, "tags": ["重点"] }
```

- 合并规则：对象递归合并，数组与标量整体替换（`children` 给了就整段替换）。未知字段会被 Jackson 忽略，不会报错。
- 某行 JSON 写错 → 只给一条 `ADVANCED_JSON_INVALID` 警告（含工作表名 + 行号 + 原因），该行按模板列照常导入，整份导入继续。
- 这是「不改模板也能加新题型」的兜底口子，但**模板列才是给老师用的**，别拿 JSON 当主路径。

### Excel 内嵌图片（按行归属）

- fastexcel 不读图片：`ExcelRowImages`（POI `XSSFWorkbook`）把同一个文件的字节再开一次，遍历 `getDrawingPatriarch()` 里的 `XSSFPicture`；**试卷导入（ExcelQuestionParser）和题库导入（RepoServiceImpl）共用这一层**。
- 归属规则：按 `XSSFClientAnchor` **左上角所在行**（`row1 + 1`）挂到该行题目，token `[[IMG:n]]` 追加到题干末尾（与 Word 一致），字节进 `ImportPreview.attachments`。
- 图片跨行、或锚点落在合并单元格里时，一律以左上角行为准，可能与肉眼位置差一行——导入后可在编辑器里手工挪。
- 超过 2MB 单张、或整份超过 50 张 → 跳过并给 warning；emf/wmf 这类前端渲染不了的矢量图静默跳过。
- 只支持 .xlsx；.xls 提示「请在 Excel 里另存为 .xlsx 后重试」（按文件内容判断，改名成 .xls 的 xlsx 仍可导）。
- 两条链路挂图方式不同：试卷导入产出 `[[IMG:n]]` token（落库时由 `ImportServiceImpl.applyAttachments` 换地址）；题库导入没有 token 这层，`QuestionImageUploader.attachRowImages` 直接把 `<img>` + `richTitle=true` 写进题干。
- `RepoTemplateExcelParseHelper` 给每条 `TemplateRequest` 填 `sourceSheet/sourceRow`（`@JsonIgnore`，不下发前端），图片就按这两个字段回挂到行。

## 关键流程

1. 列表「新建」→ 名称/类型/分类 → 新建方式选「导入试卷」→「下一步：上传」。
2. 向导第一步粘贴文本 / 选文件 → POST /api/import/parse（kind=text|excel|word|json）→ 第二步预览（题数/总分/题型/警告/逐题勾选）。
3. 第三步选去向：
   - 列表新建：固定「新建试卷」，提交时 POST /api/project/create（带整份 survey），失败即返回向导，不会残留空项目；
   - 编辑器：选「新建题组」或「现有题组」，前端 insertNode / updateNode 合并，一次导入 = 一个撤销步；
   - 题库：固定导入当前题库，POST /api/repo/import?kind=text（服务端重新解析全文，整批导入）。
4. 成功后：列表流程跳编辑器；编辑器流程提示「记得保存」；题库流程刷新列表。

## 修改指南

- **加一种来源**：在 core/importer 实现解析器 → 在 ImportServiceImpl 的 switch 里分派 → 前端把 formats 里对应项从「即将开放」改为可选。ImportPreview 不用改。
- **加一种 Excel 题型 sheet**（三步，少一步就「表头认不出来」）：
  1. `RepoTemplateI18n.SheetType` 加枚举值（key 写进 messages.properties / messages_en.properties）；
  2. `RepoTemplateExcelParseHelper.parseDataRow` 加 case + 一个 `parseXxx(Row)`，最后都走 `addQuestion(schema, r)`（它负责合并「高级配置(JSON)」并发警告）；
  3. 模板 `旭日云课堂题库导入模板.xlsx` 加 sheet（列名用 `RepoTemplateI18n.*Label()` 生成，别手写），并更新本页表格。
- **加一列通用表头**：`RepoTemplateI18n.HeaderLabel` 加枚举值 + `parseHeader` 里补分支（序号型表头参考 `rowTitleIndex/columnTitleIndex`）；用不到 i18n 的话至少加 `messages.properties` 的 key。
- **改文本规则**：只动 TextQuestionParser 与 TextQuestionParserTest；规则改动必须补测试样例。
- **改落点**：只动 Editor.tsx 的 handleImportSubmit 与 ImportWizard 的第三步，不要动解析层。
- **审计**：导入完成后前端调 POST /api/import/record，服务端写 IMPORT_PROJECT，不改业务数据。

## 权限与数据范围

- 解析：project:create / project:update / template:import 任一，或管理员。
- 试卷落地：沿用 project:create（新建）与 project:update（追加）；/api/project/update 仍受 @EnableDataPerm 约束。
- 题库落地：/api/repo/import 仍是 template:import + assertManageRepo。
- 模板下载：GET /api/file/downloadTemplate?name= 需要 file:import / template:import 任一（或管理员）。
- 审计记录：/api/import/record 需要 project:update，并按 projectId 做数据权限校验。

## 坑与已知限制

- **排序题不存在**：DSL 没有 Rank 题型、前端没有渲染器；即使后端硬造一个 type=Rank 也会在答题页「隐身」（SchemaRenderer 对未知类型只下钻 children）。要排序能力得先做题型，不是导入的事。
- **矩阵题不参与自动判分**：前端 EXAM_TYPES 不含矩阵类，`examAnswerMode` 一律 `none`；答案只作为题面数据保留。
- **矩阵评分题（MatrixScore）不做**：`registerAll.ts` 里没有 MatrixScore 渲染器（MatrixNps 同样没有），导进来只会显示「[未注册题型]」；模板里换成已注册的**上传题 Upload**。等前端补组件再加 sheet。
- **题库导入的图片在题库列表里是原始 HTML**：题库列表用 `row.template?.title` 直接出文本（Questions.tsx），带 `<img>` 的题干会把标签原样显示；题目预览/编辑走渲染层没这个问题。列表要显示图片，前端那两处得换成 `TitleContent`。
- **.doc / .xls 不支持**：只收 .docx / .xlsx，旧格式提示另存。
- **Word 公式会跳过**：`m:oMath` 只计数并给提示，题干里不会出现公式；图片会抽出来落文件。
- **图片走公开预览地址**：`/api/public/preview/{fileId}`（上传时 publicRead=true），题干以 `<img>` 富文本呈现，靠 `attribute.richTitle=true` 触发前端消毒渲染。
- **题库导入不能逐题剔除**：服务端按原文重新解析，前端勾选传不过去，所以题库流程固定整批导入。
- **表格行列错位不会报错**：矩阵 sheet 里把列标题写进行标题的列，会按「行」解析（示例模板已按列对齐）；老师手改后建议先在预览里看一眼行/列数量。
- **难度不落库**：SurveySchema 的难度列只写进解析结果的使用处，不单独建索引（历史遗留口径）。
- **标题识别是启发式**：首个非空行若以句号/问号结尾、或含下划线填空、或超过 80 字，不当作标题。
- **填空题题干保留下划线**：渲染时仍显示下划线 + 输入框，属已知观感问题。
- **老的 5 个 sheet 别混用「选项A…H」和「空1…8」**：单选/多选/判断/填空走的是「列区间内全部单元格」的旧实现，同一 sheet 两套列都在会把空格当成选项。新题型（下拉/评分/NPS/级联/矩阵）改为按列名精确取，混用没有影响。
- **题库「导出模板」方向只认 5 种题型**：RepoServiceImpl 从题库生成 Excel 时只处理 单选/多选/判断/填空/简答（MultipleBlank 也会被漏掉），新导入的下拉/评分/NPS/级联/矩阵题不会出现在导出的模板里。这是反向导出链路的缺口，不在导入链路。
- **Excel 表头之前的行会被忽略**：模板第一个 sheet 是「使用说明」（不是合法 sheet 名，解析时跳过）；如果老师在数据 sheet 表头上面加标题行，也按同样规则忽略，不会当成题目。

## 验证

- 解析器单测（importer 包 24 个用例）：
  - TextQuestionParserTest 10（含题型标记：【下拉题】【评分题】【NPS】【上传题】【矩阵单选/多选/填空】）；
  - ExcelQuestionParserAllTypesTest 4（13 个 sheet 全题型 / 图片按行 / JSON 兜底与 type+children 覆盖 / 坏 JSON 只警告 / .xls 拒绝）；
  - ExcelRowImagesTest 2（锚点行归属、坏文件退化成空表）；
  - QuestionImageUploaderTest 5（挂图、上传失败不炸、非图片字节跳过、按 sourceRow 精确挂图、文件头识别）；
  - ExcelQuestionParserTest 3（老模板兼容、章节分组、sourceSheet/sourceRow 回填）；
  - ImportTemplateFilesTest 2（随包的两个模板真的能导入，防模板与解析器漂移）；
  - WordQuestionParserTest 2、JsonQuestionParserTest 1。

~~~bash
cd server && ./gradlew :shared:test --tests "cn.surveyking.server.core.importer.*"
~~~

- 前端类型：cd client && npx tsc --noEmit。
- 手工：下载 `题库导入模板` → 在「矩阵单选题」sheet 填一行、在「上传题」sheet 填一行、在某行贴一张图 → 题库导入 → 打开题目确认行/列、属性（单文件 5MB）、图片都在位。

## 相关文档

- [题库与题目](./repo.md)
- [考试与问卷（项目）](./project.md)
- [从题库组卷到考试](../flows/repo-compose.md)
