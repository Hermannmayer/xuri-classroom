---
id: module-auth
title: "登录与账号"
status: current
keywords:
  - 登录
  - 注册
  - 账号
  - RSA
  - sk-token
  - 会话
source_globs:
  - client/src/pages/user/**
  - client/src/pages/account/**
  - client/src/api/index.ts
  - server/api/src/main/java/cn/surveyking/server/api/UserApi.java
  - server/api/src/main/java/cn/surveyking/server/api/OAuthApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java
entrypoints:
  - client/src/pages/user/Login.tsx
  - client/src/pages/user/Register.tsx
  - client/src/pages/account/Settings.tsx
  - server/api/src/main/java/cn/surveyking/server/api/UserApi.java
apis:
  - POST /api/public/login
  - POST /api/public/logout
  - GET /api/currentUser
  - POST /api/system/user/update
tables:
  - t_user
  - t_account
tests:
  - client:npm run check
  - nas:python scripts/nas/smoke-test.py
last_verified: "2026-11-09"
verified_against: "765fc89"
---

# 登录与账号

## 30 秒摘要

登录走 RSA + HttpOnly Cookie：前端先从 `GET /api/system` 取公钥，加密密码后 `POST /api/public/login`，后端返回 `sk-token` Cookie。之后所有请求自动带 Cookie；`GET /api/currentUser` 返回用户资料与 `authorityList`。账号设置只改本人资料/密码/界面偏好，不涉及角色管理。

## 什么时候看这篇

- 登录失败、Cookie 不生效、401 循环。
- 要改登录页/注册页/账号设置。
- 要加 OAuth 或第三方登录。
- 要改密码校验、账号状态、JWT 过期时间。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 登录页 | `client/src/pages/user/Login.tsx` | 用户名/密码，RSA 加密 |
| 注册页 | `client/src/pages/user/Register.tsx` | 公开注册开关与角色 |
| 账号设置 | `client/src/pages/account/Settings.tsx` | 资料、密码、缩放、主题 |
| 前端 API | `client/src/api/index.ts` | `login` / `logout` / `getCurrentUser` |
| 请求层 | `client/src/api/request.ts` | 401 统一跳登录 |
| 登录接口 | `server/api/.../UserApi.java` | `/public/login`、`/currentUser` |
| 账号服务 | `server/rdbms/.../UserServiceImpl.java` | `loadUserById`、账号状态、密码 |
| 数据表 | `t_user`、`t_account` | 用户资料、登录方式/密码哈希 |

## 关键流程

1. `GET /api/system` 取 `publicKey`（RSA，后端重启可能变化）。
2. 前端用 `jsencrypt` 以 PKCS#1 v1.5 加密明文密码。
3. `POST /api/public/login { username, password }`。
4. 后端校验账号状态、组有效期、密码哈希；成功写 `Set-Cookie: sk-token=...; HttpOnly; SameSite=Lax`。
5. 前端跳转 `/home`；`RequirePerm` / 页面调用 `loadAuthorities()` 取 `/api/currentUser`。
6. 退出 `POST /api/public/logout` 清 Cookie。

## 修改指南

### 改登录字段/校验

1. 前端 `Login.tsx` 与 `api/index.ts` 的 `LoginRequest`。
2. 后端 `UserApi#login`、`AuthRequest`、`UserServiceImpl#loadUserByUsername`。
3. 同步 `t_account` 的 `auth_account` / `auth_secret` / `auth_type`。
4. 跑登录冒烟；确认 Cookie 的 `HttpOnly`/`SameSite` 没被改掉。

### 改账号设置

1. `Settings.tsx` 表单字段。
2. `UserApi#updateUser`（`user:update`）与 `UserServiceImpl#updateUserProfile`。
3. 改密码必须校验原密码；改状态/角色不在这个入口。

### 加 OAuth

- 后端 `OAuthApi` + `OAuthServiceImpl`；前端 `pages/user` 增加回调入口。
- 不要把第三方 secret 写进文档或前端。

## 权限与数据范围

| 动作 | 权限 | 说明 |
|---|---|---|
| 登录/登出 | 公开 | 不需要权限 |
| 读当前用户 | 登录 | `isAuthenticated()` |
| 改本人资料/密码 | `user:update` | 只能改自己 |
| 管理他人账号 | `system:user:*` | 在用户管理，不在本模块 |

## 坑与已知限制

- 密码必须 RSA 加密；发明文一定报账号或密码错误。
- 后端重启后 RSA 公钥可能变化，登录页要重新取 `/api/system`。
- `sk-token` 是 HttpOnly，JS 读不到；调试看 Network/Set-Cookie，不要 `document.cookie`。
- 组有效期过期会登录失败，错误信息可能被统一成账号/密码错误；排查看后端日志和组配置。
- `loadUserById` 有 `userCache`；改账号/角色后要确保缓存失效。

## 验证

~~~bash
cd client && npm run check
python scripts/nas/smoke-test.py
~~~

手工：错误密码、正确密码、退出、刷新、过期 Cookie、禁用账号各走一遍。

## 相关文档

- [登录与会话流程](../flows/login-auth.md)
- [权限与角色](./permissions.md)
- [本地开发环境](../start/dev-setup.md)

