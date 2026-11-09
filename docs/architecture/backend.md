---
title: "后端结构"
description: "API/Service/Mapper 分层、权限注解、数据范围、缓存与异常契约"
---

# 后端结构

## 模块

| Gradle 模块 | 作用 |
|---|---|
| `server/api` | Spring Boot 启动、REST Controller、配置 |
| `server/rdbms` | 业务实现、MyBatis-Plus Mapper、缓存 |
| `server/shared` | DTO、权限枚举、公共工具、数据权限切面 |
| `server/ai` | AI 相关能力（当前不影响主流程） |

## 分层

~~~text
Controller (server/api/**/api)
  → Service 接口 (server/shared/**/service)
  → ServiceImpl (server/rdbms/**/impl)
  → Mapper (server/rdbms/**/mapper)
  → MySQL
~~~

- Controller 只做参数接收、注解鉴权、调用 Service；复杂业务在 ServiceImpl。
- DTO 在 `server/shared/**/domain/dto`；实体在 `domain/model`；MapStruct 在 `domain/mapper`。
- 返回统一 `{code,message,data}`；业务异常用 `ErrorCodeException` / `AccessDeniedException`。

## 权限注解

| 注解 | 作用 |
|---|---|
| `@PreAuthorize("hasAuthority('x')")` | 功能权限；`or hasRole('admin')` 表示管理员兜底 |
| `@EnableDataPerm(key = "#id")` | 数据范围切面；按项目/题库成员或组授权过滤 |
| `@PreAuthorize("isAuthenticated()")` | 仅登录（本人资料、当前用户） |

约定：

- 权限码必须来自 `PermissionEnum`；新增权限点先加枚举，再加注解/迁移。
- 学员专属（`studentOnly`）不自动注入管理员。
- 数据权限和功能权限分开：有 `project:list` 不代表能看所有项目。

## 缓存

| 缓存 | 内容 | 失效 |
|---|---|---|
| `userCache` | 用户资料与有效权限 | 改角色/改组角色/改用户后清 |
| `projectCache` | 项目设置等 | TTL 1 天；直接改库可能不生效 |

直接改数据库后页面不更新，先检查缓存；必要时重启后端。

## 异常与错误码

- 业务错误：`ErrorCodeException(ErrorCode.X, "中文原因")`。
- 无权限：`AccessDeniedException` → 前端 403。
- 校验：`ValidationException` / `@Valid`。

## 数据库

- 初始化结构：`server/rdbms/src/main/resources/scripts/init-mysql.sql`。
- 现网增量：`scripts/nas/migrate/*.sql`，按编号顺序、幂等。
- 改结构必须同时更新 init 脚本和新增迁移；不要让开发库手工列成为唯一事实。

## 构建

~~~bash
cd server
./gradlew :api:compileJava
./gradlew :api:bootJar -x test
~~~

没有本地 JDK 时通过 NAS 的 Gradle 容器编译；发布脚本会自动构建并重启。

## 相关文档

- [数据模型](data-model.md)
- [权限与角色](../modules/permissions.md)
- [接口表（生成）](../reference/api.md)

