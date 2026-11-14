---
id: flow-paper-import
title: 从文件/文本导入一份试卷
status: current
keywords:
  - 导入试卷
  - 文本导入
  - Excel 导入
  - Word 导入
  - JSON 导入
  - 导入预览
  - 导入向导
  - 题组
  - 图片
source_globs:
  - client/src/pages/import/**
  - client/src/pages/project/List.tsx
  - client/src/pages/survey/Editor.tsx
  - client/src/api/import.ts
  - server/api/src/main/java/cn/surveyking/server/api/ImportApi.java
  - server/shared/src/main/java/cn/surveyking/server/core/importer/**
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ImportServiceImpl.java
entrypoints:
  - client/src/pages/import/ImportWizard.tsx
  - client/src/pages/project/List.tsx
  - client/src/pages/survey/Editor.tsx
apis:
  - POST /api/import/parse
  - POST /api/import/record
  - POST /api/project/create
  - POST /api/project/update
  - POST /api/repo/import
tables:
  - t_project
  - t_template
tests:
  - client:npx tsc --noEmit
  - 'server:gradlew :shared:test --tests "cn.surveyking.server.core.importer.*"'
last_verified: 2026-11-14
verified_against: 9b6e2829
---

# 从文件/文本导入一份试卷

## 目标

把老师手上的 Word / Excel / 纯文本 / JSON 变成一份可编辑的在线试卷，或者往已有试卷里追加一批题。
入口只有三个：列表「新建 → 导入试卷」、编辑器「导入」、题库「导入」。

## 前置条件

- 新建整卷需要 project:create + project:update；编辑器追加需要 project:update；题库导入需要 template:import。
- Word 只收 .docx（.doc 请先另存），单个文件 ≤10MB。
- Excel 用题库的五张题型 sheet；想按章节拆大题要在表头加「章节」列。

## 端到端步骤

1. **选来源**：列表「新建」填名称/类型/分类 → 新建方式选「导入试卷」→ 选来源（文本/Excel/Word/JSON）→「下一步：上传」。
2. **解析**：向导把文件或文本 POST 到 /api/import/parse（只解析不写库）。服务端按 kind 选解析器：
   - 文本：TextQuestionParser（【单选题】等标记、答案、解析、分值）；
   - Excel：ExcelQuestionParser（复用题库模板解析，章节列 → QuestionSet）；
   - Word：WordQuestionParser（中文数字大题、编号小题、图片抽成附件）；
   - JSON：JsonQuestionParser（整卷 JSON，重排全部 ID）。
   解析结果统一成 ImportPreview：tree + flat + stats + warnings。
3. **预览**：向导显示题数/总分/题型分布/警告，可逐题勾选（题库导入除外）。
4. **选去向**：
   - 列表新建：固定「新建试卷」，提交时 POST /api/project/create 带整份 survey；失败停在向导，不会留下空项目；
   - 编辑器：选「新建题组」或「现有题组」，前端 insertNode/updateNode 合并，一次导入 = 一个撤销步；
   - 编辑器「整份试卷（Word）/JSON」：直接把解析出的 tree.children 追加到试卷末尾；
   - 题库：POST /api/repo/import?kind=text|word，服务端重新解析后写 t_template。
5. **收尾**：列表流程跳编辑器；编辑器流程提示「记得保存」并写审计 IMPORT_PROJECT；题库流程刷新列表。

## 权限与数据范围

- /api/import/parse：project:create / project:update / template:import 任一，或管理员。
- /api/project/update：@EnableDataPerm 按项目校验（所有者/协作者）。
- /api/repo/import：template:import + assertManageRepo。

## 坑与已知限制

- Word 公式不落库（只给“已跳过 N 个公式”）；图片会落文件并以富文本 HTML 出现在题干。
- 题库导入整批生效，不支持逐题剔除（服务端按原文重新解析）。
- JSON 会重排题目/选项 ID，选择题的 examCorrectAnswer 同步改成新选项 ID。
- 导入后必须手动「保存」才写库（编辑器流程）。

## 验证

- 单测：cd server && ./gradlew :shared:test --tests "cn.surveyking.server.core.importer.*"（12 个用例）。
- 前端：cd client && npx tsc --noEmit。
- 手工：列表导入 Word 模板 → 4 大题 5 题；编辑器追加 Excel → 新题组；题库导入 Word → 题量增加。
