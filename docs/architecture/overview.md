---
title: "架构总览"
description: "运行时拓扑、前后端边界、请求契约、认证、权限与部署"
---

# 架构总览

## 一句话

React SPA + Spring Boot API + MySQL 8；前端只做展示与交互，权限和数据范围最终都由后端裁决。

## 运行时拓扑

~~~text
浏览器
  │  HTTP / HTTPS（可选反向代理）
  ▼
Spring Boot（8080，内嵌前端 SPA）
  ├─ /            → index.html / 静态资源
  └─ /api, /files → 后端接口
          │
          ▼
       MySQL 8
~~~

开发期 Vite 把 `/api` 代理到后端，保证 `sk-token` Cookie 同源。发布包由后端直接托管前端，只暴露一个端口。

## 前后端边界

| 关注点 | 前端 | 后端 |
|---|---|---|
| 路由/页面 | `client/src/router.tsx`、`pages/**` | — |
| 接口契约 | `client/src/api/**` | `server/api/**`（Controller） |
| 业务规则 | 只做体验性校验 | `server/rdbms/**`（Service/Mapper） |
| 权限 | `auth/permissions.ts` 隐藏入口 | `@PreAuthorize` + 数据权限切面 |
| 数据范围 | 不计算，只展示 | `t_project_partner` / `t_repo_partner` / 组链 |
| 认证 | 保存 Cookie，处理 401 | JWT + `sk-token` + RSA 登录 |

## 请求契约

- HTTP 状态通常恒为 200，业务码在 `body.code`：`200` 成功、`401` 未登录、`403` 无权限，其余为业务错误。
- 写接口多数返回 `void`，改完要重新 GET。
- JSON 序列化 `non_null`；日期 `yyyy-MM-dd HH:mm:ss`，时区 GMT+8。
- 未登录/无权限由前端请求层统一处理；页面守卫只是第一层。

## 认证

1. 前端 `GET /api/system` 取 RSA `publicKey`。
2. 登录时用 RSA/PKCS#1 v1.5 加密密码，`POST /api/public/login`。
3. 后端返回 HttpOnly `sk-token` Cookie；后续请求自动携带。
4. 后端重启可能更换 RSA 密钥；登录前重新取公钥。

详见 [登录与会话](../flows/login-auth.md) 和 [登录与账号](../modules/auth.md)。

## 权限与数据范围

两套东西必须分开：

- **功能权限**：`PermissionEnum` → `t_role` → `t_user_role` / `t_dept_role`，由 `@PreAuthorize` 校验。
- **数据范围**：`t_project_partner`、`t_repo_partner`、用户组链，由 `@EnableDataPerm` / Service 过滤。

管理员拥有管理权限全集（学员专属除外）；老师保留考试/问卷编辑与删除自己创建的考试，题库只读。详见 [权限与角色](../modules/permissions.md)。

## 部署

- 三种安装方式：Windows 便携包、Linux systemd、Docker compose。
- 数据只有两样：MySQL 数据库 + 附件目录；升级前先备份。
- 升级与回滚步骤见 [部署文档](../deploy/index.md)。

## 文档地图

- 前端：[frontend.md](frontend.md)
- 后端：[backend.md](backend.md)
- 数据：[data-model.md](data-model.md)
- 功能边界：[scope.md](scope.md)

