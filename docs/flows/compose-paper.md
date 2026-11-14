---
id: flow-compose-paper
title: 从题库组卷并打印
status: current
keywords:
  - 组卷
  - 试卷集
  - 多套
  - 打印
source_globs:
  - client/src/pages/compose/**
  - client/src/pages/survey/Print.tsx
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ComposeServiceImpl.java
entrypoints:
  - client/src/pages/compose/ComposePage.tsx
  - client/src/pages/survey/Print.tsx
apis:
  - POST /api/compose/plan
  - POST /api/compose/create
  - POST /api/compose/pick
tables:
  - t_template
  - t_paper_batch
  - t_paper_variant
tests:
  - client:npx tsc --noEmit
last_verified: 2026-11-14
verified_against: 1d2a81c1
---

# 从题库组卷并打印

## 目标

老师从题库按范围抽题，一次生成 N 份独立卷子，发布为考试或打印。

## 前置条件

- project:create（组卷/发布）、project:update（卷内添加）、题库可读。
- 题库题目带章节/难度时，筛选与配比才有效。

## 端到端步骤

1. 教学 → 新建 → 填名称/类型 → 新建方式「从题库组卷」→ 跳到 /compose。
2. 选题库/题型/章节/难度/关键词，实时看到可用题量。
3. 规则：随机/比例/顺序区间；题数与分值；套数；跨套去重；题不够策略；难度配比。
4. 预览：每套题数/总分/重复题数；有警告先处理。
5. 生成并发布：写批次与套次，逐套创建考试项目。
6. 试卷集详情：打印/编辑每套；打印页可附答案页、答题卡，浏览器另存 PDF。

## 权限与数据范围

- 所有 repoId 在服务端做可读校验（RepoService.getRpo）。
- 发布出的项目按当前用户为创建者，沿用项目数据权限。

## 坑与已知限制

- 存量题目章节/难度为空，显示「未设置」。
- 题量不足默认少出并提示，不会静默补题。
- 未发布的套次没有项目，不能打印。

## 验证

- 组 2 套：预览 40 题/90 分；生成后试卷集 2 套、打印页题号连续。
- 编辑器「从题库添加」3 题，卷内不重复。
