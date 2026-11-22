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
  - AI 智能导入
  - 多模态
  - 图片题
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
  - server/shared/src/main/java/cn/surveyking/server/core/importer/DocumentTextExtractor.java
  - server/shared/src/main/java/cn/surveyking/server/service/AiImportService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AiImportServiceImpl.java
  - server/ai/src/main/resources/prompts/import-ai.md
  - server/ai/src/main/resources/prompts/import-ai-image.md
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
  - POST /api/import/ai/parse
  - POST /api/import/record
  - POST /api/repo/import
  - POST /api/repo/import/questions
  - GET /api/file/downloadTemplate
tables:
  - t_project
  - t_template
tests:
  - client:npx tsc --noEmit
  - server:gradlew :shared:compileJava :rdbms:compileJava :api:compileJava
last_verified: 2026-11-22
verified_against: 35bbc98c9bead384064e644a82b21e40802537e8
---

# 试卷导入（解析 / 预览 / 落地）

## 30 秒摘要

导入被拆成两段：**解析（不写库）** 与 **落地（写库）**。

- 解析：POST /api/import/parse，服务端按来源选解析器，统一返回 ImportPreview（题目树 + 扁平列表 + 统计 + 警告）。
- 预览：前端 ImportWizard 三步（选择来源 → 预览确认 → 选择去向），可逐题剔除（题库导入除外）。
- 落地：试卷走既有的 POST /api/project/create 或 POST /api/project/update（整树 JSON，无新表）；
  题库走 POST /api/repo/import（`kind=excel|word|text`，Excel 还会按行挂内嵌图片）。

五种来源都可用：**文本 / Excel / Word / JSON / AI 智能识别**。Excel 按题型分 sheet，13 个 sheet 覆盖编辑器里最常用的题型
（单选/多选/判断/填空/简答/下拉/评分/NPS/级联/矩阵单选/矩阵多选/矩阵填空/上传），章节列可选拆大题，
并支持**按行归属的内嵌图片**与**「高级配置(JSON)」兜底列**；Word 按「一、二、三」拆大题、用【题型】标注、抽取题干图片；JSON 吃本系统导出的整卷。

AI 智能识别是**兜底来源**：上传 .docx / .pdf / .xlsx / .xls / .txt / .md / .csv，或直接给 png/jpg 图片，服务端先抽文本与图片，
交给当前 AI 模型转成与文本导入完全一致的 DSL，再复用 `TextQuestionParser` 归一。模型不支持图片时只做文字，图片题会明确提示；
模型勾了「图片」时，图片会被压缩成 JPEG data URL 交给模型，题干里的 `[[IMG:n]]` 只上传**被题目实际引用**的那几张。
签名题、地址、条码、矩阵评分、矩阵 NPS、矩阵自动、富文本这几类没有 sheet（见「坑与已知限制」）。

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
| 文档抽文本/图 | server/shared/src/main/java/cn/surveyking/server/core/importer/DocumentTextExtractor.java | docx/pdf/xlsx/xls/txt/md/csv/图片 → 文本 + ExtractedImage（context 附近文字），只在内存里读 |
| AI 解析 | server/rdbms/src/main/java/cn/surveyking/server/impl/AiImportServiceImpl.java | 文本分块 ≤8000 字 / 12 段 → 模型转 DSL → TextQuestionParser；图片分批 ≤5 张、只上传被题干引用的 [[IMG:n]] |
| AI 提示词 | server/ai/src/main/resources/prompts/import-ai.md、import-ai-image.md | 文本/图片两套；明确不执行文档内指令、不编造答案 |
| 图片预处理 | server/ai/src/main/java/cn/surveyking/server/ai/core/AiImageSupport.java | magic 校验 → 最长边 1568 → 白底 JPEG 0.82 → data URL；png/jpg/jpeg 可用（JDK 无 WebP 解码器） |
| 接口 | server/api/src/main/java/cn/surveyking/server/api/ImportApi.java | /parse、/ai/parse、/record |
| 模板下载 | server/rdbms/src/main/java/cn/surveyking/server/impl/FileServiceImpl.java | GET /api/file/downloadTemplate?name=，白名单映射到 classpath template/ |
| 模板资源 | server/api/src/main/resources/template/旭日云课堂题库导入模板.xlsx / 旭日云课堂试卷导入模板.docx | 跟着解析器一起改，改完用两份模板各导一次做冒烟 |
| 题库落地 | server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java | kind=text 改走文本解析；Excel 调 RepoTemplateExcelParseHelper + 按行挂内嵌图片 |
| 行图片索引 | server/shared/src/main/java/cn/surveyking/server/core/importer/ExcelRowImages.java | POI 读内嵌图片，按锚点左上角行索引（试卷导入与题库导入共用） |
| 图片挂题干 | server/shared/src/main/java/cn/surveyking/server/core/importer/QuestionImageUploader.java | 图片上传成 QUESTION_IMAGE（publicRead）并追加 `<img>` |
| 前端向导 | client/src/pages/import/ImportWizard.tsx | 三步 + 统计 + 警告 + 去向 |
| 题型说明 | client/src/pages/import/ImportHelp.tsx | 「支持哪些题型」折叠说明（向导与题库页共用）+ 预览里的题型标签、warnings 分级、图片计数；纯展示，不发请求 |
| 前端接口 | client/src/api/import.ts | parseImport、parseAiImport、importRepoQuestions、recordPaperImport |
| 列表入口 | client/src/pages/project/List.tsx | 新建 → 导入试卷（唯一入口；AI 页签在最后） |
| 编辑器入口 | client/src/pages/survey/Editor.tsx | 顶部「导入」+ 空卷引导；AI 智能导入单开 |
| 题库入口 | client/src/pages/repo/Questions.tsx | 导入下拉（Excel / 文本 / Word / AI） |

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

公共列：`序号 / 章节 / 题干 / 分数 / 难度 / 标签 / 解析 / 答案`（填空题另有 `单空分数`），最后都可跟 `高级配置(JSON)`。
表头**按名字识别**（`RepoTemplateI18n.HeaderLabel` + 行/列标题的序号别名），插列、删空列、换列序都不影响导入；
带不带 `(JSON)` 后缀都认（`选项树(JSON)` 与 `选项树`、`高级配置(JSON)` 与 `高级配置` 等价，全角括号也按半角处理）。

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
- 只认「纵向落在一行之内」的图片：`row2 == row1 + 1 && rowOff2 == 0`（正好填满一个单元格，Excel/POI 的标准写法）或 `row2 <= row1`（比格子矮）。
  **跨行、或压进下一行的图片直接跳过**并给一条 `IMAGE_ANCHOR_SPANS_ROWS` 警告（带工作表名与行号，提示「请把图片贴到单个单元格内」）——
  这种图片按左上角硬挂就是猜，挂错了会变成「图贴到别的题上」，比少一张图更难发现。
  注意别把规则写成 `row1 != row2`：单格图片的 `row2` 本来就是 `row1 + 1`，那样会把所有正常图片全丢掉。
- 超过 2MB 单张、或整份超过 50 张 → 跳过并给 warning；emf/wmf 这类前端渲染不了的矢量图静默跳过。
- 只支持 .xlsx；.xls 提示「请在 Excel 里另存为 .xlsx 后重试」（按文件内容判断，改名成 .xls 的 xlsx 仍可导）。
- 两条链路挂图方式不同：试卷导入产出 `[[IMG:n]]` token（落库时由 `ImportServiceImpl.applyAttachments` 换地址）；题库导入没有 token 这层，`QuestionImageUploader.attachRowImages` 直接把 `<img>` + `richTitle=true` 写进题干。
- `RepoTemplateExcelParseHelper` 给每条 `TemplateRequest` 填 `sourceSheet/sourceRow`（`@JsonIgnore`，不下发前端），图片就按这两个字段回挂到行。

### Word / 文本的题型标记

Word 与文本共用一套规则（`WordQuestionParser` 先把段落/表格拍平成文本，再交给 `TextQuestionParser`），
所以**Word 里能用的标记就是文本里能用的**：

- 原有标记：`【单选题】【多选题】【判断题】【填空题】【多项填空】【简答题】`（多空填空 = `MultipleBlank`）；
- 本轮新增：`【下拉题】【评分题】【NPS】【上传题】`（评分也认「打分」「星级」，NPS 也认「净推荐」）；
- 矩阵题：`【矩阵单选题】【矩阵多选题】【矩阵填空题】`，标记后面必须再写若干 `行：xxx` / `列：xxx` 定义表头，
  答案按行写、行之间用 `|`、行内多选用 `,`；缺「行：」或「列：」会整题跳过（`MATRIX_TITLES_MISSING`），
  答案行数与「行：」条数不符只给 `MATRIX_ANSWER_MISMATCH` 警告、照常导入；
- `【欢迎语】` 是说明块，不算题目；
- 没有【排序题】：DSL 里没有 Rank 题型，写了只会拿到 `TYPE_UNKNOWN` 提示并按内容推断。

分值/答案/解析/标签仍用 `（10分）`、`答案：A`、`解析：…`、`标签：…`；难度只提示、不落库。

### AI 智能识别（多模态）

- 入口：导入向导的「AI 智能识别」页签，或编辑器「导入 → AI 智能导入」。前端先调 `GET /api/ai/status`：
  `ready=false` 时禁用并显示后端 reason；`supportsImage=false` 时显示「当前模型未开启图片输入」，仍可导纯文字文档。
- 文件：`.docx / .pdf / .xlsx / .xls / .txt / .md / .csv` + `.png / .jpg / .jpeg`（WebP 先转 png/jpg）。
- 链路：`DocumentTextExtractor` 抽文本 + 图片（docx 内嵌图、PDF 按页渲染、Excel 锚点行图、纯图片）；
  文本按空行切块（≤8000 字、最多 12 段）逐段调模型；图片每批 ≤5 张、每次 ≤10 张，逐张带「附近文字」交给模型；
  模型输出仍是文本 DSL，经 `WordQuestionParser.parseSections` + `TextQuestionParser` 归一，**不新写题型映射**。
- 图片题：提示词要求模型在题干/选项里用 `[[IMG:n]]` 标出图片位置；服务端只上传**被题目实际引用**的图片（`QUESTION_IMAGE` + publicRead），
  替换成 `<img src="/api/public/preview/{id}">` 并置 `richTitle=true`；没被引用的图片一律不上传。
- 模型没勾「图片」：纯图片文档直接中文报错；图文混合文档保留文字并 warning `AI_IMAGE_SKIPPED`。
- 落库：AI 预览与规则导入完全同构；题库落地走 `POST /api/repo/import/questions`，直接落前端勾选后的题目，不重新解析源文件。

## 关键流程

1. 列表「新建」→ 名称/类型/分类 → 新建方式选「导入试卷」→「下一步：上传」。
2. 向导第一步粘贴文本 / 选文件 / 上传给 AI → `POST /api/import/parse`（kind=text|excel|word|json）或 `POST /api/import/ai/parse` → 第二步预览（题数/总分/题型/警告/逐题勾选）。
3. 第三步选去向：
   - 列表新建：固定「新建试卷」，提交时 POST /api/project/create（带整份 survey），失败即返回向导，不会残留空项目；
   - 编辑器：选「新建题组」或「现有题组」，前端 insertNode / updateNode 合并，一次导入 = 一个撤销步；
   - 题库：规则导入走 POST /api/repo/import（Excel / Word / 文本；服务端重新解析、整批导入，不能逐题剔除）；
     AI 导入走 POST /api/repo/import/questions（题目来自预览勾选结果，服务端只做 sanitize + 落库）。
4. 成功后：列表流程跳编辑器；编辑器流程提示「记得保存」；题库流程刷新列表。

## 修改指南

- **加一种来源**：在 core/importer 实现解析器 → 在 ImportServiceImpl 的 switch 里分派 → 前端把 formats 里对应项加入。ImportPreview 不用改。
- **改 AI 识别口径**：只动 `prompts/import-ai*.md` 与 `AiImportServiceImpl` 的抽文本/切块/合并逻辑；不要把题型映射再写一份，所有 DSL 都走 `TextQuestionParser`。
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
- AI 解析：额外要 `ai:use`（`/api/import/ai/parse`），并受 AI 每日 token 限额约束。
- 试卷落地：沿用 project:create（新建）与 project:update（追加）；/api/project/update 仍受 @EnableDataPerm 约束。
- 题库落地：/api/repo/import 与 /api/repo/import/questions 都是 template:import + assertManageRepo。
- 模板下载：GET /api/file/downloadTemplate?name= 需要 file:import / template:import 任一（或管理员）。
- 审计记录：/api/import/record 需要 project:update，并按 projectId 做数据权限校验。

## 坑与已知限制

- **排序题不存在**：DSL 没有 Rank 题型、前端没有渲染器；即使后端硬造一个 type=Rank 也会在答题页「隐身」（SchemaRenderer 对未知类型只下钻 children）。要排序能力得先做题型，不是导入的事。
- **没有 sheet 的题型**：签名（Signature）、地址（Address）、条码（Barcode）、矩阵自动（MatrixAuto）、矩阵评分（MatrixScore）、
  矩阵 NPS（MatrixNps）、富文本（RichText）都不在 13 个 sheet 里。其中签名/地址/富文本在 `registerAll.ts` 里有渲染器
  （可以在设计器里建，也可以走「高级配置(JSON)」把 type 覆盖过去）；矩阵自动/矩阵评分/矩阵 NPS/条码**连渲染器都没有**，
  导进来只会显示「[未注册题型]」。
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
- **AI 导入的源文件不落盘**：`/api/import/ai/parse` 只在请求内存里读 MultipartFile，解析完即丢弃，不写 `t_file`、不写业务目录；重试就是重新上传。
- **AI 图片题依赖模型能力**：模型必须在 系统设置 → AI → 模型目录 勾「图片」，`/api/ai/status` 的 `supportsImage` 才是 true；没勾时纯图片文档直接报错，图文混合只保留文字并给 `AI_IMAGE_SKIPPED`。
- **只上传被题干引用的图片**：AI 输出里的 `[[IMG:n]]` 才会走 `QUESTION_IMAGE` 上传；没被引用的图片不落盘。上传发生在预览阶段，保存项目/题库后才由 `t_file_ref` 绑定；取消导入的孤儿 7 天后由每日清理回收。
- **图片格式**：支持 png / jpg / jpeg；WebP 需要先转 png/jpg（JDK 没有 WebP 解码器）。单张 ≤2MB、最长边压到 1568px、每次最多 10 张。
- **长文档会截断**：文本最多 12 段 × 8000 字；超出会 warning `AI_TRUNCATED`，让老师拆分后分段导入。
- **供应商差异**：`image_url` + data URL 只在真正支持视觉的 OpenAI 兼容端点上有效（OpenAI、通义 VL、GLM-4V 等）；DeepSeek/纯文本模型会 4xx，报错会带中文提示。

## 验证

- 当前仓库的 server 测试目录没有 importer 用例（旧版文档写的 29 个已随重构移除），改动解析器时按下面三条验证：
~~~bash
cd server && ./gradlew :shared:compileJava :rdbms:compileJava :api:compileJava
~~~
  - 用临时 Runner（放 %TEMP%，不要入库）对样例 .docx/.xlsx 调对应 parser，核对题数/总分/答案/解析；
  - AI 链路额外用 AiImportServiceImpl 的 buildPreview 喂一段假 AI DSL（含「一、单选题」+ 答案/分值），确认分组与选项答案正确（不真调模型）；
  - 手工：列表导入「消防安全知识培训测试.docx」这类真实文档，预览里核对 20 题 / 100 分 / 答案。

- 前端类型：cd client && npx tsc --noEmit。
- 手工：下载 `题库导入模板` → 在「矩阵单选题」sheet 填一行、在「上传题」sheet 填一行、在某行贴一张图 → 题库导入 → 打开题目确认行/列、属性（单文件 5MB）、图片都在位。

## 相关文档

- [题库与题目](./repo.md)
- [考试与问卷（项目）](./project.md)
- [从题库组卷到考试](../flows/repo-compose.md)
