---
id: module-compose
title: 组卷中心（题库 → 成套卷子 → 打印）
status: current
keywords:
  - 组卷
  - 从题库组卷
  - 试卷集
  - 多套
  - 难度
  - 章节
  - 打印试卷
  - 答题卡
  - 抽题
source_globs:
  - client/src/pages/compose/**
  - client/src/pages/survey/BankPickModal.tsx
  - client/src/pages/survey/Print.tsx
  - client/src/api/compose.ts
  - server/api/src/main/java/cn/surveyking/server/api/ComposeApi.java
  - server/shared/src/main/java/cn/surveyking/server/service/ComposeService.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/Compose*.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ComposeServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/core/export/PaperDocxExporter.java
  - server/api/src/main/java/cn/surveyking/server/api/PaperExportApi.java
entrypoints:
  - client/src/pages/compose/ComposePage.tsx
  - client/src/pages/compose/BatchDetail.tsx
  - client/src/pages/survey/Print.tsx
apis:
  - GET /api/compose/stats
  - POST /api/compose/plan
  - POST /api/compose/create
  - GET /api/compose/batches
  - GET /api/compose/batch
  - POST /api/compose/pick
  - GET /api/paper/{id}/docx
tables:
  - t_template
  - t_paper_batch
  - t_paper_variant
  - t_project
tests:
  - client:npx tsc --noEmit
  - server:gradlew :shared:test
last_verified: 2026-11-14
verified_against: 0b81cd2872cc402d7b3c84d3a09dc68b03d17b19
---

# 组卷中心

## 30 秒摘要

老师从题库按「题库 / 章节 / 难度 / 题型 / 关键词」筛范围，按「随机 / 比例 / 顺序区间」定规则，一次生成 N 份互相独立的卷子（试卷集），可发布为 N 个考试、可打印。入口只有一个：教学 → 新建 → 从题库组卷（**单页完成：范围 + 规则 + 预览**，不再三步翻页）；题库里没有的题型不会出现；支持「整套总分 + 题型分值比例」一键分配每题分值。编辑器内可「从题库添加」单题加入当前试卷。

## 什么时候看这篇

- 改组卷规则（题数/比例/区间、难度配比、跨套去重、题不够策略）
- 改试卷集页面或打印页
- 排查「组出来题不对/少了/重复」

## 代码地图

| 层 | 文件 |
|---|---|
| 组卷页 | client/src/pages/compose/ComposePage.tsx |
| 试卷集 | client/src/pages/compose/BatchList.tsx、BatchDetail.tsx |
| 卷内选题 | client/src/pages/survey/BankPickModal.tsx |
| 打印 | client/src/pages/survey/Print.tsx |
| 前端 API | client/src/api/compose.ts |
| 后端接口 | server/api/.../ComposeApi.java |
| 规则实现 | server/rdbms/.../ComposeServiceImpl.java |
| 批次表 | t_paper_batch / t_paper_variant（迁移 38） |
| 难度章节 | t_template.chapter / difficulty（迁移 37） |

## 关键流程

1. 组卷页（单页）选范围 → GET /api/compose/stats 实时显示各题型/章节/难度题量，题型按可用题量过滤。
2. 「预览」→ POST /api/compose/plan：只算不写，返回 N 套题目、统计、警告、重复题数。
3. 「生成并发布」→ POST /api/compose/create：写 t_paper_batch + t_paper_variant；publish=true 时逐套调用 ProjectService.addProject。
4. 试卷集详情按套展示，可进打印页或编辑器。
5. 编辑器「从题库添加」→ POST /api/compose/pick，排除卷内已有题，插入新题组（一次撤销步）。
6. 打印页：浏览器打印即 PDF；「下载 Word」走 GET /api/paper/{id}/docx（POI 生成，A4、题号连续、可选答案页/答题卡）。

## 修改指南

- 改选择规则：只动 ComposeServiceImpl（resolveNeeds / take / weightedOrder / buildVariant）。
- 改统计口径：ComposeServiceImpl#stats；前端 ComposePage 的 chapterOptions 依赖 byChapter。
- 改打印版式：Print.tsx 的 PRINT_CSS 与题目渲染；A4/A3 用 size 状态注入 @page。
- 新增难度等级：同时改 t_template.difficulty 长度、题库编辑下拉、组卷页权重输入。

## 权限与数据范围

- /api/compose/plan、/create、/batches：project:create 或 admin。
- /api/compose/pick：project:create / project:update 或 admin。
- /api/compose/stats：repo:list / project:create / project:update 或 admin。
- 每个 repoId 都会走 RepoService.getRpo 做可读校验。

## 坑与已知限制

- 章节/难度是新增列，存量题目为空；组卷页会显示「未设置」，导入模板要带「章节」「难度」列。
- 跨套去重按题型各自切池，题型之间不共享。
- 题不够策略：less（默认少出+提示）/ reuse（复用补足）/ error（直接报错）。
- Word 导出为纯文本版式：题干里的图片不会进 Word（富题干仅在网页端显示）。
- 打印页 A3 只改 @page 尺寸，未做双页拼版。
- 打印页依赖项目 survey；未发布的套次没有 projectId，不能打印。

## 验证

- cd client && npx tsc --noEmit
- cd server && ./gradlew :shared:test
- 手工：新建 → 从题库组卷 → 选 1 个题库 → 规则填 2 套 → 预览 → 生成并发布 → 试卷集出现 2 套 → 打印页题号连续 → 编辑器从题库添加 3 题。

## 相关文档

- [试卷导入](import.md)：题库/试卷的文件导入
- [从文件导入一份试卷](../flows/paper-import.md)
- [从题库组卷流程](../flows/compose-paper.md)
