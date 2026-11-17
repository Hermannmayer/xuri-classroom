---
id: module-mcp
title: MCP / API 接入
status: current
keywords:
  - MCP
  - Model Context Protocol
  - JSON-RPC
  - 工具
  - tools_list
  - 令牌
  - Bearer
  - api token
  - 幂等
  - idempotencyKey
  - sk_capabilities
  - t_api_token
source_globs:
  - server/api/src/main/java/cn/surveyking/server/mcp/**
  - server/api/src/main/java/cn/surveyking/server/api/ApiTokenApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/ApiToken.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/ApiIdempotency.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/ApiTokenMapper.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/ApiIdempotencyMapper.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ApiTokenService.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ApiIdempotencyService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ApiTokenServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ApiIdempotencyServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ApiTokenView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ApiTokenRequest.java
  - client/src/api/apiToken.ts
  - client/src/pages/system/ApiTokenPanel.tsx
  - client/src/pages/ai-guide/**
entrypoints:
  - server/api/src/main/java/cn/surveyking/server/mcp/McpApi.java
  - server/api/src/main/java/cn/surveyking/server/mcp/McpServer.java
  - server/api/src/main/java/cn/surveyking/server/mcp/McpTools.java
  - server/api/src/main/java/cn/surveyking/server/api/ApiTokenApi.java
  - client/src/pages/ai-guide/McpGuide.tsx
apis:
  - POST /mcp
  - POST /api/system/api-token
  - GET /api/system/api-token
  - POST /api/system/api-token/revoke
tables:
  - t_api_token
  - t_api_idempotency
tests:
  - server/api/src/test/java/cn/surveyking/server/mcp/McpServerTest.java
  - server/api/src/test/java/cn/surveyking/server/mcp/McpEndToEndTest.java
  - server/api/src/test/java/cn/surveyking/server/mcp/McpApiTest.java
  - server/rdbms/src/test/java/cn/surveyking/server/impl/ApiTokenServiceImplTest.java
  - server/rdbms/src/test/java/cn/surveyking/server/impl/ApiIdempotencyServiceImplTest.java
  - client:npm run check
last_verified: 2026-11-17
verified_against: 1735ce8059194bc15de297e95244ccf20e23102c
---

# MCP / API 接入

## 30 秒摘要

对外提供一条 **MCP（Model Context Protocol）** 入口：Claude Desktop / WorkBuddy / 自写脚本拿着
`Authorization: Bearer sk_…` 就能列项目、读 schema、校验、建/改/发布、拉报表、异步导出。
协议是**手写的 JSON-RPC 2.0**（端点 `POST /mcp`），没有引入 spring-ai：官方 starter 依赖不冲突，
但它不管「按令牌白名单过滤工具、写操作幂等、Bearer→SecurityContext 复用现有权限」这三件事，
自己补的工作量和手写协议差不多，还要多背 20 个 jar。
令牌按**用户**签发，权限就是那个用户的权限；写工具必须带 `idempotencyKey`。

## 什么时候看这篇

- 要在 Claude Desktop / WorkBuddy / Codex / Cursor / VS Code 里配 `mcp.json`
- 用户问「MCP 怎么接」：让他打开菜单「AI 助手」→ `#mcp`，页面会按当前站点地址生成片段
- 客户端报 401 / 工具列表是空的 / 某个工具被拒
- 要加第 11 个工具，或改工具白名单

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 端点 | `mcp/McpApi.java` | `POST /mcp`；直接读写 servlet 流，**绕开全局响应信封**（MCP 客户端不认 `{code,message,data}`） |
| 协议 | `mcp/McpServer.java` | `initialize` / `tools/list` / `tools/call`；错误用 JSON-RPC error code |
| 工具 | `mcp/McpTools.java` + `McpToolCatalog.java` | 10 个工具的定义与实现；白名单过滤 |
| 鉴权 | `mcp/McpTokenResolver.java` | Bearer → SHA-256 比对 `t_api_token` → 载入用户塞进 SecurityContext（复用 `@PreAuthorize`） |
| 幂等 | `t_api_idempotency` | 写工具命中已有 `(user_id, key_value)` 直接返回上次结果 |
| 令牌管理 | `api/ApiTokenApi.java` + `ApiTokenPanel.tsx` | 系统设置「MCP / API 令牌」页：签发（明文只显示一次）、列表、撤销 |
| 接入引导 | `client/src/pages/ai-guide/McpGuide.tsx` | `/ai` 页的「MCP 接入」：选客户端 → 建令牌 → 复制配置片段（通用 / Cursor / VS Code / Codex），附工具清单、curl 验证与安全说明 |

## 工具清单

| 工具 | 作用 | 权限 |
|---|---|---|
| `sk_capabilities` | 当前令牌能用哪些工具、题型清单、限制 | 无 |
| `sk_project_list` | 列项目 | `project:list` |
| `sk_project_get` | 读项目详情（含 schema） | `project:detail` |
| `sk_project_validate` | **只校验不落库** | `project:detail` |
| `sk_project_create` | 创建（默认草稿） | `project:create` |
| `sk_project_update` | 更新 schema / 设置 | `project:update` |
| `sk_project_publish` | 发布 / 停收 | `project:publish` |
| `sk_report_get` | `view=summary\|questions\|exam` | `project:report` |
| `sk_export_create` / `sk_export_get` | 异步导出（复用 jobId 模型） | `answer:export` |

## 关键流程

1. 管理员在「系统设置 → MCP / API 令牌」新建令牌 → 服务端生成 `sk_` 明文与 SHA-256 哈希，
   **明文只在响应里出现一次**，库里只留哈希。
2. 客户端每次请求带 `Authorization: Bearer sk_…` → `McpTokenResolver` 算哈希比对
   `t_api_token`（校验未撤销、未过期）→ 载入该用户并塞进 SecurityContext。
3. `initialize` 返回协议版本与 capabilities；`tools/list` 按「令牌 scopes ∩ 用户权限」过滤后返回工具清单。
4. `tools/call` 走 `McpServer` 分发到 `McpTools`；写工具先查 `t_api_idempotency`，
   命中就直接回上次结果，不重复执行。
5. 工具内部复用既有 Service 与 `@PreAuthorize`，因此权限口径与网页端完全一致。
6. 每次调用更新 `last_used_at`；审计里 `source=mcp`。

## 客户端怎么连

```json
{
  "mcpServers": {
    "xuri-classroom": {
      "type": "http",
      "url": "https://<你的域名>/mcp",
      "headers": { "Authorization": "Bearer sk_xxxxxxxx" }
    }
  }
}
```

网页端「AI 助手 → MCP 接入」会按当前站点地址拼出四份片段，字段差异已经写在页面上：
**VS Code** 顶层键是 `servers`、远程条目 `type` 写 `http`；**Cursor** 的远程条目不要 `type`；
**Codex** 用 TOML（`~/.codex/config.toml` 的 `[mcp_servers.xuri]`）。照抄错顶层键，客户端会直接看不到这个服务。

自测（服务端换成本机地址即可）：

```bash
curl -s -X POST https://<域名>/mcp \
  -H 'Authorization: Bearer sk_xxx' -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 修改指南

### 加一个工具

1. 在 `McpToolCatalog` 里登记 name / 描述 / `inputSchema` / 所需权限。
2. 在 `McpTools` 里实现；**写工具必须接 `idempotencyKey`**。
3. 补 `McpServerTest` 的用例。
4. 更新本页的工具清单与 `source_globs`。

## 权限与数据范围

| 动作 | 权限 | 说明 |
|---|---|---|
| 签发/撤销令牌 | `system:setting:update` | 只有管理员 |
| 调用工具 | 令牌所属用户的权限 | 令牌 `scopes` 非空时再叠一层工具白名单 |
| 导出 | `answer:export` | 另加班级可见性校验 |

## 坑与已知限制

- **令牌只存 SHA-256**：列表里显示的是**哈希指纹**（哈希首尾 4 位），不是令牌的前 4 位——库里不留任何明文线索，辨认靠 `name`。
- **客户端字段各不相同**：VS Code 用 `servers` + `type: http`，Cursor 不要 `type`，Codex 是 TOML；引导页按客户端切换片段，别把通用 `mcpServers` 片段硬塞进 VS Code。
- **`/mcp` 不带 `/api` 前缀**：走 servlet 原始流，否则会被全站响应信封包成 `{code,message,data}`。
- 工具白名单外**返回 200 + JSON-RPC -32001**（不是 401），避免客户端误判为「令牌失效」而去重配。
- `sk_project_create/update` **不做阻断式 schema 校验**（草稿要能边建边改），只回 `schemaOk/schemaErrors`；硬校验放在 `sk_project_validate`。
- 导出工具不再叠「导出密码」：MCP 的凭据是按用户签发的令牌，再叠人手密码会让自动化不可用。
- 撤销令牌后立即 401（不走缓存）。

## 验证

```bash
cd server && ./gradlew :shared:test :rdbms:test :api:test
cd client && npm run check
python scripts/release/check_schema.py
```

## 相关文档

- [权限模型](./permissions.md)
- [考试与问卷](./project.md)
- [操作审计](./audit.md)
