---
title: "没有接线的东西"
description: "写了但没接上的功能、配了但没读的开关、建了但没用的表：清单、证据与处理建议"
---

# 没有接线的东西

> 这份文档盘点"存在但没生效"的东西。它和 [前台与后台的边界](front-back-boundaries.md) 是两个问题：
> 边界文档说"两端混在一起"，本文说"代码在，但没有任何东西连到它"。

## 0. 什么叫"没接线"

四种形态：

| 形态 | 例子 |
|---|---|
| 写了接口/方法，没有调用方 | 死方法、死导出 |
| 配了开关，没有读取方 | 必填的环境变量却没人用 |
| 建了表/字段，没有读写 | 表存在、实体存在、没人引用 |
| 产品说做了，代码没接 | 文档写了"支持附件上传"，前端没调 |

判定方法：静态扫描 + **人工确认**。纯自动扫描误报率很高，典型误报：方法引用（`userService::deleteUser`）、接口 default 方法、字段注入、Lombok 生成的 getter。

## 1. 产品层：功能或限制没覆盖到

### 1.1 微信限制只覆盖 3 个入口（最值得修的一条）

"仅微信打开"的校验（`wechatAccessGuard`）只出现在：

| 入口 | 位置 | 作用 |
|---|---|---|
| 答题页加载 | `SurveyServiceImpl:117` | 决定是否提前清空题目、返回授权标记 |
| 开始答题 | `SurveyServiceImpl:337` | 非微信打开直接抛"只能在微信中打开" |
| 交卷 | `SurveyServiceImpl:399` | 再校验一次并注入 openid |

**没有覆盖**：

| 入口 | 位置 | 后果 |
|---|---|---|
| 公开查询验证 | `SurveyServiceImpl:608` `loadQuery` | 设了微信限制的问卷，凭查询密码即可进入，不要求微信 |
| 公开查询结果 | `SurveyServiceImpl:617` `getQueryResult` | 同上，能直接看到结果 |
| 关联结果 | `SurveyServiceImpl:751` `loadLinkResult` | 同上 |

也就是说：**"只在微信里能打开"这个限制，可以从公开查询这条路绕过去**。修法是在这三个方法开头也调 `wechatAccessGuard.requireWechatAccess(project)`。

### 1.2 27 个后端端点前端没有任何调用方

按用途分组：

| 分组 | 端点 | 判断 |
|---|---|---|
| 模板 | `/api/template/get`、`create`、`listCategory`、`listTag` | `scope.md` 已说明「模板广场不做」，属于**有意不接** |
| 文件 | `/api/file/list`、`/api/file/delete` | 没有文件管理页，属于**功能缺口** |
| OAuth 绑定 | `/api/oauth/bind/{provider}/start`、`/api/oauth/bindings`、`/api/oauth/bindings/{id}` | 绑定功能没有入口，属于**功能缺口** |
| OAuth 跳转 | `/api/public/oauth/*` | 浏览器跳转不走 fetch，属**扫描误报** |
| 题库 | `/api/repo/batchCreate`、`/api/repo/unbind`、`/api/repo/book/create` | 待确认：要么有别的入口，要么没接上 |
| 看板 | `/api/dashboard/list` | 首页看板走的是别的接口，待确认 |
| 任务 | `/api/listUserTask`、`/api/listHistoryTask` | 学员任务页可能已改用 `/api/exercise/list` |
| 统计 | `/api/public/statistics` | 前端零调用，但接口本身有用（第三方/调试），已加权限 |
| 公开 | `/api/public/loadDict`、`loadLinkResult`、`validateProject` | 待确认是否前端已改用别的路径 |

**建议**：把「有意不接」的写进 `docs/architecture/scope.md`，把「忘了接」的补前端或删端点——不要让它悬着。

### 1.3 答题页附件上传只有注释

`/api/public/upload` 在前端**只出现在注释里**（`Data.tsx:117` 说明"答题页走公开接口"），没有实际调用。答题页的附件题（`Upload` 题型）是否真能上传，需要实测确认；如果是靠别的路径，注释应更正。

## 2. 配置层：开关没有人读

### 2.1 `SK_CRYPTO_KEY`

- `docker-compose.yml:73` 把它列为**必填**（缺失直接拒绝启动）；
- `server/**/*.java` 里**零引用**（`grep SK_CRYPTO_KEY` 为 0）；
- README 自己写着"当前未启用"。

**后果**：运维会以为题库/附件已加密，实际没有任何加解密逻辑。要么实现，要么删掉这个必填项——保留一个"看起来在保护数据"的假开关，比没有更糟。

## 3. 数据层：建了没人用

### 3.1 `t_role_permission` 与 `RolePermission`

- 表在 `init-mysql.sql` 里；实体 `RolePermission` 存在；
- 全仓**没有任何 Java 代码引用这个实体**（`grep RolePermission` 只命中实体定义本身）；
- 真实权限存的是 `t_role.authority` 逗号串。

**后果**：新读者看到表名会以为权限在关联表里，从而改错地方。建议在表上加注释或直接删表（迁移）。

## 4. 代码层：写了没调用

| 位置 | 现状 | 影响 |
|---|---|---|
| `client/src/api/request.ts:24` `setUnauthorizedHandler` | 定义 + 从 `index.ts` 重导出，**0 处调用** | 401 只能整页跳转；答题页只能裸 fetch 绕开 |
| `client/src/auth/permissions.ts:33` `clearAuthorities` | **0 处调用** | 退出登录时权限缓存靠别的路径清理 |
| `server/.../AnswerService#listAnswerForStat` | 本轮引入后因回退路径改用复数版而变成死方法，**已删除** | — |

## 5. 确认有接线（避免误判）

| 项 | 结论 |
|---|---|
| 25 个注解 SQL（`@Select` 等） | 全部有调用方 |
| `UserService#createUser` / `deleteUser` | 被 `SystemApi` 通过方法引用 `userService::deleteUser` 调用 |
| `ConversationCacheService` | 被 `ChatController` 字段注入使用 |
| `ZoomControl`、`ExamResult` 等前端组件 | 有实际引用 |

## 6. 怎么自查

新增功能时问三个问题：

1. **谁会调它**：前端哪个页面？定时任务？第三方？
2. **配置谁来读**：加了环境变量/开关，代码里有 `@Value` 或 `@ConfigurationProperties` 消费吗？
3. **数据谁读写**：新表/新字段，Mapper 与实体都接上了吗？

扫描命令（PowerShell）：

```powershell
# 某个符号是否只在定义处出现
Select-String -Path server/**/*.java -Pattern "符号名" | Measure-Object

# 前端某端点是否被调用
Select-String -Path client/src/**/*.tsx -Pattern "/api/具体路径"
```

## 7. 收敛建议（按性价比）

1. **补微信校验到公开查询三个方法**（半天，安全收益最高）
2. **把"有意不接"的端点写进 scope.md，把"忘了接"的补上或删掉**（一天）
3. **处理 `SK_CRYPTO_KEY`**：实现或删除（半天）
4. **删 `t_role_permission` 表与实体**（迁移 27，半天）
5. **注册 401 handler**（半天，改善前台体验）

## 8. 相关文档

- [前台与后台的边界](front-back-boundaries.md)
- [功能范围](scope.md)
- [改造目录](refactor-catalog.md)
