---
id: module-audit
title: 操作审计
status: current
keywords:
  - 审计
  - 操作日志
  - 变更前后
  - before/after
  - 时间线
  - t_audit_log
  - request_id
  - source web mcp
  - 批改历史
source_globs:
  - server/rdbms/src/main/java/cn/surveyking/server/core/audit/**
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/AuditLog.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/AuditLogMapper.java
  - server/rdbms/src/main/resources/mapper/AuditLogMapper.xml
  - server/rdbms/src/main/java/cn/surveyking/server/service/AuditLogService.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/AnswerTimelineService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerTimelineServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/ExportGuardService.java
  - server/api/src/main/java/cn/surveyking/server/api/AuditTimelineApi.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/AuditLogView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/AuditAnswerTimelineView.java
  - server/shared/src/main/java/cn/surveyking/server/core/security/RequestIdFilter.java
entrypoints:
  - server/rdbms/src/main/java/cn/surveyking/server/core/audit/AuditAspect.java
  - server/rdbms/src/main/java/cn/surveyking/server/core/audit/AuditRecorder.java
  - server/rdbms/src/main/java/cn/surveyking/server/core/audit/AuditDiffSupport.java
  - server/api/src/main/java/cn/surveyking/server/api/AuditTimelineApi.java
apis:
  - GET /api/audit/answer-timeline
tables:
  - t_audit_log
tests:
  - server/rdbms/src/test/java/cn/surveyking/server/core/audit/AuditRecorderTest.java
  - server/rdbms/src/test/java/cn/surveyking/server/core/audit/AuditDiffSupportTest.java
  - server/rdbms/src/test/java/cn/surveyking/server/impl/AnswerTimelineServiceImplTest.java
last_verified: 2026-11-17
verified_against: 120dbd4056587d04d31f5e05ce9c5018c96722f6
---

# 操作审计

## 30 秒摘要

所有写接口由 `AuditAspect` 自动记一条 `t_audit_log`。2.2.3 起高危动作额外记录**改前/改后快照**
（`before_json` / `after_json`）、入口来源（`source`：web / mcp / api）与请求关联 id（`request_id`），
并能按答卷查「批改时间线」。快照**只存分数、状态、权限串、导出范围**，不存答案正文与个人身份信息。
本模块不负责业务日志（logback 那套）与访问日志。

## 什么时候看这篇

- 用户问「谁把这道题的分改了」「权限什么时候被改的」
- 要对账「这次导出到底导了哪些数据」
- 要在 MCP / 第三方接口接入时区分操作来源

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 切面 | `core/audit/AuditAspect.java` | 拦 `cn.surveyking.server.api..*` 下的 POST/PUT/DELETE/PATCH；高危动作在 proceed **之前**采「改前」 |
| 写入 | `core/audit/AuditRecorder.java` | `record(...)` / `recordWithDiff(...)`；快照 >2KB 截断后仍是合法 JSON |
| 快照口径 | `core/audit/AuditDiffSupport.java` | 高危动作白名单与逐动作的字段选择 |
| 接口 | `api/AuditTimelineApi.java` | `GET /api/audit/answer-timeline?answerId=` |
| 实现 | `impl/AnswerTimelineServiceImpl.java` | 行级权限（`AnswerAccessGuard`）→ 查 `idx_audit_target` → 补操作人姓名与中文动作名 |
| 关联 id | `core/security/RequestIdFilter.java` | 入站 `X-Request-Id` → MDC → 新生成；同时回写响应头 |
| 数据表 | `t_audit_log` | 见 `V2.2.3__audit_detail.sql` |

## 关键流程

1. 请求进入 → `RequestIdFilter` 把 request id 写进 MDC 与响应头。
2. `AuditAspect` 命中写接口 → 若是高危动作，先由 `AuditDiffSupport` 采「改前」。
3. `proceed()` → 成功后再采「改后」，一次写入 before/after/source/request_id。
4. `AuditRecorder` 序列化时超 2KB 截断成 `{"_truncated":true,"_bytes":N,"_preview":"…"}`。
5. 前端查时间线 → `AnswerTimelineServiceImpl` 先做答卷行级权限，再按 `target_id + create_at` 查。

## 修改指南

### 新增一个要记快照的动作

1. 在 `AuditDiffSupport` 的 `ACTIONS` 白名单里加动作码，并补一个对应的快照分支。
2. **只放分数/状态/权限串/范围**，不要放答案正文、姓名、手机号。
3. 补 `AuditDiffSupportTest` 的用例（现有 6 例是最好的模板）。

### 排查「审计里没有这条」

1. 先看接口是不是 GET——AOP 只兜 POST/PUT/DELETE/PATCH，导出这类 GET 由 `ExportGuardService` 显式记。
2. 再看 URI 是否落在排除名单（`/api/public/**`、`/captcha/**`）。
3. 审计写失败是**吞异常只打日志**的，不会影响业务；去后端日志搜「写审计日志失败」。

## 权限与数据范围

| 动作 | 权限 | 数据范围 |
|---|---|---|
| 查答卷时间线 | `answer:detail` | `answerAccessGuard.assertAnswerAccess` 行级 |
| 管理员操作日志页 | `system:log:list`（沿用原接口） | 全站 |

## 坑与已知限制

- 一次批量请求只写**一条**审计，`target_id` 取第一条 id；批量删 5 份时，第 2~5 份的答卷时间线看不到那条记录（完整名单在 `before_json` 里）。
- 多题批改时行上的 `questionId` 为空，逐题明细在快照的 `items` 里。
- 表名是 **`t_audit_log`**，不是 `t_audit`（计划文档笔误）。
- `source` 目前只有 `web`；`mcp` 要等 P5 的 `/api/mcp/**` 落地后才会出现。
- 审计表**没有清理策略**，长期需要归档（与 `t_audit_log` 现状一致）。

## 验证

```bash
cd server && ./gradlew :rdbms:test :api:test
python scripts/release/check_schema.py
```

## 相关文档

- [答卷与判分](./answer.md)
- [权限模型](./permissions.md)
- [模块索引](../README.md)
