---
id: module-example
title: 模块名称
status: current
keywords:
  - 关键词1
  - 关键词2
source_globs:
  - client/src/pages/example/**
  - server/api/src/main/java/cn/surveyking/server/api/ExampleApi.java
entrypoints:
  - client/src/pages/example/List.tsx
  - server/api/src/main/java/cn/surveyking/server/api/ExampleApi.java
apis:
  - GET /api/example/list
tables:
  - t_example
tests:
  - client:npm run check
last_verified: '2026-11-09'
verified_against: '765fc89'
---

# 模块名称

## 30 秒摘要

用 3~5 句话说明这个模块负责什么、不负责什么、最重要的入口在哪。

## 什么时候看这篇

- 用户/同事说「……」
- 要改「……」
- 接口返回「……」

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 页面 | `client/src/pages/example/List.tsx` | 列表与操作入口 |
| 前端 API | `client/src/api/index.ts` | 请求封装 |
| 后端接口 | `server/api/src/main/java/cn/surveyking/server/api/ExampleApi.java` | `@PreAuthorize` / `@EnableDataPerm` |
| 业务实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/ExampleServiceImpl.java` | 数据范围与业务规则 |
| 数据表 | `t_example` | 关键字段 |

## 关键流程

1. 页面触发……
2. 请求 `GET /api/example/list`……
3. 服务层按……过滤。
4. 返回 `{ code, message, data }`。

## 修改指南

### 改行为

1. 先改……
2. 同步……
3. 需要迁移时……

### 新增字段/接口

1. 后端 DTO / 实体 / Mapper
2. 接口注解与权限
3. 前端类型与请求
4. 更新本页 frontmatter 的 `source_globs`

## 权限与数据范围

| 动作 | 权限 | 数据范围 |
|---|---|---|
| 查看 | `example:list` | 本人/本组 |

## 坑与已知限制

- 只写会让人踩坑的内容；不要写泛泛而谈。

## 验证

```bash
cd client && npm run check
npm run docs:check
```

预期：类型检查通过，`docs:check` 无本模块错误。

## 相关文档

- [架构总览](../architecture/overview.md)
- [权限模型](./permissions.md)
- [模块索引](../README.md)
