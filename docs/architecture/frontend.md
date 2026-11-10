---
title: "前端结构"
description: "页面、路由、请求封装、权限判定、编辑器与主题"
---

# 前端结构

## 入口

| 文件 | 作用 |
|---|---|
| `client/src/main.tsx` | React 挂载 |
| `client/src/router.tsx` | 路由与页面级权限守卫 |
| `client/src/layout/BasicLayout.tsx` | 桌面侧栏、页头、视角菜单 |
| `client/src/layout/MobileTabBar.tsx` | 移动端底栏 |
| `client/src/api/request.ts` | fetch 封装、业务码、401 跳转 |
| `client/src/auth/permissions.ts` | `can()` 与学员专属权限 |

## 页面域

| 目录 | 业务 |
|---|---|
| `pages/user` | 登录、注册 |
| `pages/account` | 账号设置 |
| `pages/home` | 首页三种视角 |
| `pages/project` | 考试/问卷管理、回收站 |
| `pages/survey` | 编辑器、概览、数据、报表 |
| `pages/answer` | 公开答题、成绩单、公开查询 |
| `pages/repo` | 题库列表、题目、练习册 |
| `pages/exercise` | 练习页 |
| `pages/tasks` | 我的任务（考试/练习/成绩） |
| `pages/teaching` | 教学工作台、班级管理 |
| `pages/system` | 用户、用户组、权限、系统设置、审计 |

## 路由与守卫

- 路由集中在 `router.tsx`；页面级守卫用 `guard(perm, <Page />)`，`perm` 可以是单个权限或数组（任一命中）。
- 菜单和按钮用 `can(authorities, code)`，规则与路由守卫一致：精确命中、显式域通配符；`ROLE_admin` 只对非学员专属权限放行。
- 前端隐藏按钮只是体验优化；后端 `@PreAuthorize` 才是最终裁决。

## 请求层

- `get` / `post` / `getWithPagination` 统一处理 `{code,message,data}`。
- 401 由 `setUnauthorizedHandler` 统一跳登录；403 转成可读中文。
- 登录密码用 `jsencrypt`（RSA PKCS#1 v1.5），不能换 Web Crypto。

## 编辑器与题型

- `schema/`：题型 schema、扁平化、规则表达式。
- `renderer/`：题型注册表、SchemaRenderer、各题型组件。
- `designer/`：大纲树、属性面板、选项编辑、规则编辑器、撤销/重做。
- 题型总数与注册表以 `renderer/questions` 为准；不要在文档里写死过期数量。

## 主题与布局

- 0 圆角蓝图风格，CSS 变量 `--bp-*`；亮/暗主题由 `ThemeProvider` 控制。
- 桌面侧栏 + 移动底栏；页面内尽量用 `bp-card` / `bp-title` / `TableScrollRegion` 保持一致。

## 构建

~~~bash
cd client
npm run check
npm run build
~~~

生产构建由构建任务监听；改 `client/package*.json` 会触发 `npm ci`，耗时更长。

## 相关文档

- [考试编辑器与题型](../modules/survey.md)
- [权限与角色](../modules/permissions.md)
- [路由表（生成）](../reference/routes.md)

