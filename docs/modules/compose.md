---
id: module-compose
title: 组卷中心（题库 → 成套卷子 → 打印）
status: current
keywords:
  - 组卷
  - 从题库组卷
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
  - client/src/pages/survey/Print.tsx
apis:
  - GET /api/compose/stats
  - POST /api/compose/plan
  - POST /api/compose/create
  - POST /api/compose/pick
  - GET /api/paper/{id}/docx
tables:
  - t_template
  - t_project
tests:
  - client:npx tsc --noEmit
  - server:gradlew :shared:test
last_verified: 2026-11-17
verified_against: f706863fe7da50062717e799e16ad7931cfa49b6
---

# 组卷中心

## 30 秒摘要

老师从题库按「题库 / 章节 / 难度 / 题型 / 关键词」筛范围，按「随机 / 比例 / 顺序区间 / 整套拆分」定规则，一次生成 N 份互相独立的卷子，直接创建为 N 个考试项目（列表里按文件夹/分类管理），可打印。入口只有一个：教学 → 新建 → 从题库组卷，在**教学页的抽屉**里完成（不跳页、不叠弹窗）；题库里没有的题型不会出现；四种模式都能设每题分值，支持「整套总分 + 题型分值比例」一键分配。整套拆分会把范围内所有题按题型均匀拆成 N 套、套间不重复。编辑器「从题库抽题」复用同一套逻辑：按题型配题数和分值后抽题，再勾选插入当前试卷。

## 什么时候看这篇

- 改组卷规则（题数/比例/区间、难度配比、跨套去重、题不够策略）
- 改打印页
- 排查「组出来题不对/少了/重复」

## 代码地图

| 层 | 文件 |
|---|---|
| 组卷抽屉（列表页内嵌） | client/src/pages/compose/ComposePage.tsx |
| 卷内选题 | client/src/pages/survey/BankPickModal.tsx |
| 打印 | client/src/pages/survey/Print.tsx |
| 前端 API | client/src/api/compose.ts |
| 后端接口 | server/api/.../ComposeApi.java |
| 规则实现 | server/rdbms/.../ComposeServiceImpl.java |
| 难度章节 | t_template.chapter / difficulty（迁移 37） |

## 关键流程

1. 组卷页（单页）选范围 → GET /api/compose/stats 实时显示各题型/章节/难度题量，题型按可用题量过滤。
2. 「预览」→ POST /api/compose/plan：只算不写，返回 N 套题目、统计、警告、重复题数。
3. 「生成并发布」→ POST /api/compose/create：逐套调用 ProjectService.addProject，直接创建 N 个考试项目（名称 试卷名-A/B/C）。
4. 生成后回列表，按文件夹/分类管理这些试卷；每份可编辑、打印、删除。
5. 编辑器「从题库添加」→ POST /api/compose/pick，排除卷内已有题，插入新题组（一次撤销步）。
6. 打印页：浏览器打印即 PDF；「下载 Word」走 GET /api/paper/{id}/docx（POI 生成，A4、题号连续、可选答案页/答题卡）。卷头（标题/副标题/考生信息行）也在这页的「卷头设置」抽屉里改，保存直接 `updateProject({survey})` 写库，不用回编辑器再存一次。

## 修改指南

- 改选择规则：只动 ComposeServiceImpl（resolveNeeds / take / weightedOrder / buildVariant）；整套拆分在 planSplit（按题型轮转分配，保证套间不重复）。
- 改统计口径：ComposeServiceImpl#stats；前端 ComposePage 的 chapterOptions 依赖 byChapter。
- 改打印版式：Print.tsx 的 `printCss`（`@media print` + `@page`）与 `blocks` 的组装顺序；A4/A3 由 `size` 状态切 `@page`，页边距由 `margin` 状态换成 mm 注入页面。
- 新增难度等级：同时改 t_template.difficulty 长度、题库编辑下拉、组卷页权重输入。

## 权限与数据范围

- /api/compose/plan、/create：project:create 或 admin。
- /api/compose/pick：project:create / project:update 或 admin。
- /api/compose/stats：repo:list / project:create / project:update 或 admin。
- 每个 repoId 都会走 RepoService.getRpo 做可读校验。

## 坑与已知限制

- 章节/难度是新增列，存量题目为空；组卷页会显示「未设置」，导入模板要带「章节」「难度」列。
- 跨套去重按题型各自切池，题型之间不共享。
- 题不够策略：less（默认少出+提示）/ reuse（复用补足）/ error（直接报错）。
- 整套拆分要求总题量 ≥ 套数，否则直接报错；按题型轮转分配，各套题数最多差 1。
- 卷内抽题有两个页签：浏览选题（/api/template/list 分页 + 搜索 + 勾选）和按规则抽题（/api/compose/pick，按题型题数/分值随机或顺序抽）；题型选项只显示题库里有的。
- 打印页先按 A4 内容高度分页：A4 一页一张；A3 横向把两张 A4 并排拼一张，答案卡/答案页单独起页；支持试卷信息/代码、密封线、页码、答题区（横线/留白）、页边距（标准 18mm / 宽松 22mm）开关。可用高度还要再减 24px 缓冲——字体/行高取整会让最后一行差一点挤出页；量题目块高度时要连内层 margin 一起算，外层 wrapper 自己不带 `marginBottom`。切版式后旧的页索引可能指向已被合并的 block，渲染前统一过一遍 `safePages`，不要直接拿 `pages` 拼。
- 卷头文字存在 `survey.attribute.headerTitle` / `headerSubtitle` / `examHeaderInfo`：打印页「卷头设置」抽屉保存即写库（`updateProject({survey})`），留空回落到「试卷标题」和默认的「姓名/考号/得分」行。同一份 attribute 被 Word 导出复用，所以卷头只需设一次；它只影响打印与 Word，不改项目名/试卷标题。
- 主题的背景图/页眉图支持上传（/api/file/create publicRead=true）、预览、清除或填 URL；页眉显示在答题页与打印卷首。
- 答案页是「客观题 8 列速查格 + 简答（Textarea）逐题参考答案」：客观题按单选/多选/判断/填空/下拉/横向填空筛出来，每 80 条换一块；答题卡是 10 列题号格（每格题号 + 手写区）再加姓名/考号/班级行，替代了原来 6 列的「序号 + 横线」。
- Word 导出为纯文本版式：题干里的图片不会进 Word（富题干仅在网页端显示）。题号按 `dataType` 递归编号——题组只当大题标题、说明输出为段落、分割线/选项/随机题节点不占题号；选项平铺只对单选/多选/判断/下拉，填空/矩阵/签名/上传不会再被错当选项。
- 打印页 A3 是把两张 A4 页并排画进一张 420mm 宽的 sheet（`@page` 同步设 A3 横向），拼版固定按页序两两成对，不按内容高度重新流排；出纸前记得在打印对话框里选 A3 纸张，否则浏览器会把 420mm 缩印到 A4 上。

## 验证

- cd client && npx tsc --noEmit
- cd server && ./gradlew :shared:test
- 手工：新建 → 从题库组卷 → 选 1 个题库 → 规则填 2 套 → 预览 → 生成并发布 → 列表出现 2 份试卷 → 打印页题号连续 → 编辑器从题库添加 3 题。
- 手工（打印/导出）：打印页「卷头设置」改标题 + 副标题 + 考生信息行 → 保存 → 刷新页面卷头仍在、回到编辑器标题没被改；勾「附答案页 / 附答题卡」后答案页是 8 列客观题格 + 简答题、答题卡是 10 列题号格；下载 Word 的卷头同步、题号连续且选项只出现在单选/多选/判断/下拉题下面。

## 相关文档

- [试卷导入](import.md)：题库/试卷的文件导入
- [从文件导入一份试卷](../flows/paper-import.md)
- [从题库组卷流程](../flows/compose-paper.md)
