---
title: "文档维护流程"
description: "改代码时如何更新模块页、生成参考和刷新核对锚点"
---

# 文档维护流程

## 文档不是发布后再补

文档和代码在同一个提交里。最低要求：

1. 找到模块页（npm run docs:where）。
2. 改代码。
3. 改模块页的代码地图/修改指南/坑。
4. 刷新 frontmatter：`npm run docs:mark -- <module-id>`。
5. 如果改了路由/接口/权限枚举/建表 SQL，运行 npm run docs:gen。
6. 提交前跑：

   ~~~bash
   npm run docs:gen -- --check
   npm run docs:check
   npm run docs:build
   ~~~

## 哪些改动必须更新文档

| 改动 | 至少要动 |
|---|---|
| 页面行为/交互 | 对应 modules/*.md 的“关键流程/修改指南/坑” |
| 新增路由 | 对应模块页 + reference/routes.md（生成） |
| 新增/修改接口 | 对应模块页 + reference/api.md（生成） |
| 新增权限点 | PermissionEnum + 模块页 + reference/permissions.md（生成） |
| 表/字段/迁移 | init-mysql.sql + 迁移 + architecture/data-model.md + reference/db-schema.md（生成） |
| 部署/脚本 | docs/ops/NAS-开发工作流.md（内部）或对应 start 页 |

## Docs-Impact none

如果确认只是注释/格式/无行为变化，提交信息加：

~~~text
Docs-Impact: none
~~~

docs:impact --strict 会放行，但日志里保留记录。不要用它逃避真正的行为变化。

## 每周审计

npm run docs:audit 会对比每个模块 verified_against..HEAD 的代码变更；GitHub Actions 每周运行，过期模块会生成/更新 issue。

## 归档

旧审计、旧基线移到 docs/archive/，顶部标注“历史快照”。不要把历史数字当当前事实。

