---
layout: home
title: "旭日云课堂 · 开发文档"
description: "代码地图、模块索引、修改指南与决策记录"
hero:
  name: "旭日云课堂"
  text: "开发文档"
  tagline: "先定位模块，再读代码；文档与代码同仓库、同提交。"
  actions:
    - theme: brand
      text: "开始阅读"
      link: /start/dev-setup
    - theme: alt
      text: "架构总览"
      link: /architecture/overview
features:
  - title: "AI 可读的模块索引"
    details: "每篇模块页都有 source_globs、entrypoints、关键字和最后核对 commit；npm run docs:where 直接定位。"
  - title: "参考手册自动生成"
    details: "路由、接口、权限目录、数据库结构由代码生成，CI 检查漂移，不靠手抄。"
  - title: "改代码就更新文档"
    details: "docs:impact 找出受影响模块；docs:check 校验覆盖率、链接和 frontmatter。"
---

## 从这里开始

- 第一次接触项目：读 [架构总览](architecture/overview.md)，再读 [本地开发环境](start/dev-setup.md)。
- 要改一个功能：用仓库根目录的 `docs/README.md` 任务路由表，或 `npm run docs:where -- "关键词"`。
- 要改权限：先读 [权限与角色](modules/permissions.md)，再读 [新增/修改权限点](flows/permission-change.md)。
- 文档怎么维护：读 [文档维护流程](start/docs-workflow.md)。

## 文档状态

每篇模块页的 `last_verified` / `verified_against` 记录最后一次核对；[文档状态](status.md) 由脚本生成，显示每个模块的覆盖文件数与核对锚点。

