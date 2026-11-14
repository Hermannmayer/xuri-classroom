---
id: flow-repo-compose
title: 从题库组卷到考试
status: current
keywords:
  - 组卷
  - 抽题
  - 题库
  - 新建考试
  - 发布
  - compose
source_globs:
  - client/src/pages/compose/**
  - client/src/pages/project/List.tsx
  - client/src/pages/survey/BankPickModal.tsx
  - client/src/api/compose.ts
  - server/api/src/main/java/cn/surveyking/server/api/ComposeApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ComposeServiceImpl.java
entrypoints:
  - client/src/pages/compose/ComposePage.tsx
  - server/api/src/main/java/cn/surveyking/server/api/ComposeApi.java
apis:
  - GET /api/compose/stats
  - POST /api/compose/plan
  - POST /api/compose/create
  - POST /api/compose/pick
  - POST /api/project/create
tables:
  - t_repo
  - t_template
  - t_project
  - t_project_partner
  - t_answer
tests:
  - 'client:npx tsc --noEmit'
  - 'docs:npm run docs:check'
last_verified: '2026-11-14'
verified_against: 'e5e39e'
---

# 从题库组卷到考试

## 目标

把题库里的题变成一份或 N 份可发布/可打印的考试：选题库与范围 → 定规则（随机/比例/区间、难度、跨套去重）→ 预览 → 直接创建 N 个考试项目。入口是「教学 → 新建 → 从题库组卷」，跳到整页 /compose，不再有组卷弹窗。

## 前置条件

- project:create（组卷与建考试）、project:update（卷内添加）、题库可读。
- 题库里已有题；章节/难度字段有值时筛选才生效。

## 端到端步骤

1. 新建弹窗里填名称/类型/分类，新建方式选「从题库组卷」，跳到 /compose（分类与文件夹随 URL 带过去）。
2. 组卷页单页完成：选题库 → 题型按可用题量过滤 → 章节/难度/关键词 → 题数、分值、套数、去重、题不够策略、难度配比。
3. 「预览」调 POST /api/compose/plan，只算不写；返回每套题数/总分/重复题数/警告。
4. 「生成并发布」调 POST /api/compose/create：按套创建考试项目（名称自动加 -A/-B），分类与 parentId 一起写入。
5. 回列表后按文件夹/分类管理这些考试；每份可编辑、打印、删除。
6. 编辑器里「从题库添加」调 POST /api/compose/pick，排除卷内已有题，插入新题组。

## 权限与数据范围

- 组卷/创建接口要 project:create 或管理员；卷内选题要 project:create / project:update。
- 每个 repoId 都走 RepoService.getRpo 校验可读。

## 坑与已知限制

- 题库里没有的题型不会出现；不要绕过前端直接传空题型。
- 题不够默认少出并提示，不会静默补题。
- 打印页依赖项目的 survey；先创建项目再打印。

## 验证

- 组 2 套 → 列表出现 -A/-B 两份；打印页题号连续；编辑器从题库添加不重复。
- 同 seed 重放得到相同题目。
