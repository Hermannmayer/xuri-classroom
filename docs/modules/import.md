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
  - 导入去向
  - 题组
source_globs:
  - client/src/pages/import/**
  - client/src/api/import.ts
  - server/api/src/main/java/cn/surveyking/server/api/ImportApi.java
  - server/shared/src/main/java/cn/surveyking/server/core/importer/**
  - server/shared/src/main/java/cn/surveyking/server/service/ImportService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ImportServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/PaperImportRecordRequest.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/RepoTemplateRequest.java
  - server/shared/src/test/java/cn/surveyking/server/core/importer/**
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
tables:
  - t_project
  - t_template
tests:
  - client:npx tsc --noEmit
  - server:gradlew :shared:test --tests "cn.surveyking.server.core.importer.TextQuestionParserTest"
last_verified: 2026-11-14
verified_against: 5e7e4e076c798404def995ea5422e6ad5f629da3
---

# 试卷导入（解析 / 预览 / 落地）

## 30 秒摘要

导入被拆成两段：**解析（不写库）** 与 **落地（写库）**。

- 解析：POST /api/import/parse，服务端按来源选解析器，统一返回 ImportPreview（题目树 + 扁平列表 + 统计 + 警告）。
- 预览：前端 ImportWizard 三步（选择来源 → 预览确认 → 选择去向），可逐题剔除（题库导入除外）。
- 落地：试卷走既有的 POST /api/project/create 或 POST /api/project/update（整树 JSON，无新表）；题库走 POST /api/repo/import?kind=text。

四种来源都可用：**文本 / Excel / Word / JSON**。Excel 按题型分 sheet、章节列可选拆大题；Word 按「一、二、三」拆大题并抽取题干图片（转成富题干 HTML）；JSON 吃本系统导出的整卷。

## 什么时候看这篇

- 要加一种新的导入来源（Word / Excel / JSON），或调整现有文本解析规则。
- 导入后题数/分值/答案不对，或提示“未识别到题目”。
- 想改导入向导的落点规则（新建题组 / 现有题组）。
- 排查“点导入没反应 / 解析 403 / 创建了空试卷”。

## 代码地图

| 层 | 位置 | 说明 |
|---|---|---|
| 解析契约 | server/shared/src/main/java/cn/surveyking/server/core/importer/ImportPreview.java | 前端预览的唯一数据源 |
| 文本解析 | server/shared/src/main/java/cn/surveyking/server/core/importer/TextQuestionParser.java | 标题/题型标记/选项/答案/解析/分值/多空 |
| 解析编排 | server/rdbms/src/main/java/cn/surveyking/server/impl/ImportServiceImpl.java | 限制大小、按 kind 分派、审计 |
| 接口 | server/api/src/main/java/cn/surveyking/server/api/ImportApi.java | /parse、/record |
| 题库落地 | server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java | kind=text 时改走文本解析 |
| 前端向导 | client/src/pages/import/ImportWizard.tsx | 三步 + 统计 + 警告 + 去向 |
| 前端接口 | client/src/api/import.ts | parseImport、recordPaperImport |
| 列表入口 | client/src/pages/project/List.tsx | 新建 → 导入试卷（唯一入口） |
| 编辑器入口 | client/src/pages/survey/Editor.tsx | 顶部「导入」+ 空卷引导 |
| 题库入口 | client/src/pages/repo/Questions.tsx | 导入下拉（Excel / 文本） |

## 关键流程

1. 列表「新建」→ 名称/类型/分类 → 新建方式选「导入试卷」→「下一步：上传」。
2. 向导第一步粘贴文本 → POST /api/import/parse（kind=text）→ 第二步预览（题数/总分/题型/警告/逐题勾选）。
3. 第三步选去向：
   - 列表新建：固定「新建试卷」，提交时 POST /api/project/create（带整份 survey），失败即返回向导，不会残留空项目；
   - 编辑器：选「新建题组」或「现有题组」，前端 insertNode / updateNode 合并，一次导入 = 一个撤销步；
   - 题库：固定导入当前题库，POST /api/repo/import?kind=text（服务端重新解析全文，整批导入）。
4. 成功后：列表流程跳编辑器；编辑器流程提示「记得保存」；题库流程刷新列表。

## 修改指南

- **加一种来源**：在 core/importer 实现解析器 → 在 ImportServiceImpl 的 switch 里分派 → 前端把 formats 里对应项从“即将开放”改为可选。ImportPreview 不用改。
- **改文本规则**：只动 TextQuestionParser 与 TextQuestionParserTest；规则改动必须补测试样例（现有 7 个）。
- **改落点**：只动 Editor.tsx 的 handleImportSubmit 与 ImportWizard 的第三步，不要动解析层。
- **审计**：导入完成后前端调 POST /api/import/record，服务端写 IMPORT_PROJECT，不改业务数据。

## 权限与数据范围

- 解析：project:create / project:update / template:import 任一，或管理员。
- 试卷落地：沿用 project:create（新建）与 project:update（追加）；/api/project/update 仍受 @EnableDataPerm 约束。
- 题库落地：/api/repo/import 仍是 template:import + assertManageRepo。
- 审计记录：/api/import/record 需要 project:update，并按 projectId 做数据权限校验。

## 坑与已知限制

- **.doc 不支持**：只收 .docx，旧格式提示另存。
- **Word 公式会跳过**：`m:oMath` 只计数并给提示，题干里不会出现公式；图片会抽出来落文件。
- **图片走公开预览地址**：`/api/public/preview/{fileId}`（上传时 publicRead=true），题干以 `<img>` 富文本呈现，靠 `attribute.richTitle=true` 触发前端消毒渲染。
- **题库导入不能逐题剔除**：服务端按原文重新解析，前端勾选传不过去，所以题库流程固定整批导入。
- **难度不落库**：SurveySchema 没有 difficulty 字段，解析到「难度：」只给提示。
- **标题识别是启发式**：首个非空行若以句号/问号结尾、或含下划线填空、或超过 80 字，不当作标题。
- **填空题题干保留下划线**：渲染时仍显示下划线 + 输入框，属已知观感问题。
- **Excel 章节列要自己加**：模板默认没有「章节」列，加了才会按章节拆题组。

## 验证

- 解析器单测（文本 7 + Excel 2 + Word 2 + JSON 1 = 12 个用例）：

~~~bash
cd server && ./gradlew :shared:test --tests "cn.surveyking.server.core.importer.TextQuestionParserTest"
~~~

- 前端类型：cd client && npx tsc --noEmit。
- 手工：新建 → 导入试卷 → 粘贴示例 → 预览题数/总分 → 创建 → 编辑器里题目可编辑、可保存。

## 相关文档

- [题库与题目](./repo.md)
- [考试与问卷（项目）](./project.md)
- [从题库组卷到考试](../flows/repo-compose.md)
