---
id: module-ai
title: AI 助手
status: current
keywords:
  - AI
  - 出卷
  - 改题
  - 批改建议
  - 学情总结
  - AiGateway
  - PromptRegistry
  - AiJobService
  - AiContentGuard
  - t_ai_usage
  - ai:use
  - 限额
  - token
source_globs:
  - server/ai/**
  - server/api/src/main/java/cn/surveyking/server/api/AiApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/AiUsage.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/AiUsageMapper.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/AiUsageService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AiUsageServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/AiAssistService.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AiAssistServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/Ai*.java
  - client/src/pages/survey/ai/**
entrypoints:
  - server/ai/src/main/java/cn/surveyking/server/ai/core/AiGateway.java
  - server/ai/src/main/java/cn/surveyking/server/ai/core/AiJobService.java
  - server/api/src/main/java/cn/surveyking/server/api/AiApi.java
  - client/src/pages/survey/Editor.tsx
apis:
  - POST /api/ai/paper/generate
  - GET /api/ai/paper/job/{jobId}
  - POST /api/ai/paper/apply
  - POST /api/ai/question/rewrite
  - POST /api/ai/grade/suggest
  - POST /api/ai/report/summary
  - GET /api/ai/usage/today
tables:
  - t_ai_usage
tests:
  - server/rdbms/src/test/java/cn/surveyking/server/ai/AiContentGuardTest.java
  - server/rdbms/src/test/java/cn/surveyking/server/impl/AiUsageServiceImplTest.java
  - server/rdbms/src/test/java/cn/surveyking/server/impl/AiAssistServiceImplTest.java
last_verified: 2026-11-17
verified_against: 815f8418
---

# AI 助手

## 30 秒摘要

把大模型能力做成老师开箱可用的四个功能：**AI 出卷**（异步，出完先预览再采纳）、**AI 改题**、
**AI 批改建议**（只给建议不落分）、**AI 学情总结**（只吃统计数字）。内核是 `AiGateway` +
`PromptRegistry` + `AiJobService` + `AiContentGuard`，外面套一层记账 `t_ai_usage`。
模型 key 走**每校自配**（沿用 `AiSetting`），平台不承担 token 成本。

## 什么时候看这篇

- 老师问「AI 出的题不对/不出现」「AI 建议按钮点了没反应」
- 要调「每天能用多少 token」「哪个场景最费钱」
- 要加第五个 AI 场景

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 内核 | `server/ai/.../core/AiGateway.java` | 非流式统一入口，120s 超时、2 次指数退避重试、按用户限流 |
| 内核 | `server/ai/.../core/PromptRegistry.java` | `prompts/*.md` 模板，首行 `version: x.y`，`render(id, vars)` |
| 内核 | `server/ai/.../core/AiJobService.java` | 长任务 jobId + 内存表 + 线程池 + 24h TTL（与 PDF 导出同一套模型） |
| 内核 | `server/ai/.../core/AiContentGuard.java` | 出卷结果强校验，**不通过直接拒绝，不修补** |
| 接口 | `server/api/.../api/AiApi.java` | 四个场景的 HTTP 入口 |
| 场景 | `server/rdbms/.../impl/AiAssistServiceImpl.java` | 四个场景的编排（拼提示词 → 调模型 → 校验 → 记账），要读项目/答卷/报表，所以放 rdbms |
| 记账 | `server/rdbms/.../impl/AiUsageServiceImpl.java` + `t_ai_usage` | 按场景看成本；超限额时返回中文提示且不调模型；`GET /api/ai/usage/today` 给前端显示剩余额度 |
| 前端 | `client/src/pages/survey/Editor.tsx` / `ai/` | 出卷弹窗 + 结果预览 + 逐题采纳；AI 优化侧栏 |

## 关键流程（AI 出卷）

1. 老师填参数（题量/总分/题型配比/难度/补充要求）→ `POST /api/ai/paper/generate` 拿 `jobId`。
2. `AiJobService` 在后台线程池里跑：渲染 prompt → `AiGateway.completeJson` → `AiContentGuard` 校验。
3. 前端 2 秒轮询 `GET /api/ai/paper/job/{jobId}`，拿到 `status/progress/result`。
4. **先预览**（题干/题型/分值/正确答案），老师勾选后才写进画布：编辑器走 `setSurvey` + 已有的
   `/api/project/update` 全量保存（一次撤销步，包成「AI 生成（N 题）」题组）。
   `POST /api/ai/paper/apply` 是给**外部调用方**（MCP / 脚本）直接追加到服务端 schema 用的，
   编辑器不调它——两条写入链路形状不同，混用会互相覆盖。
5. 每次调用都落一条 `t_ai_usage`（场景、模型、token、耗时、状态）。

## 修改指南

### 加一个 AI 场景

1. 在 `prompts/` 加一个模板（首行写 `version:`）。
2. 在 `AiApi` 加接口，`@PreAuthorize("hasAuthority('ai:use')")`。
3. 记账时把 `scene` 写成新值（`t_ai_usage.scene` 是自由字符串，但请在文档与代码里保持一致）。
4. 同步更新本页的 `apis` 与 `source_globs`。

### 调限额

`AiSetting` 里的 `dailyTokenLimit`（全站每日，默认 200 万）与 `perUserDailyLimit`（单用户每日，默认 20 万）。
改完不用重启即可生效（读的是系统设置）。

## 权限与数据范围

| 动作 | 权限 | 说明 |
|---|---|---|
| 所有 AI 场景 | `ai:use` | 默认给 admin 与 teacher，**学员不给**（学员侧的 AI 只有答题解析） |
| 出卷结果落库 | `project:update` | 采纳时校验 |
| 批改建议 | `answer:grade` | 另加答卷行级权限；AI 只给建议，落分仍走原有批改接口 |

## 坑与已知限制

- **AI 出卷必须预览后采纳**，不要做成生成完自动覆盖老师的卷子。
- **AI 批改只给建议不落分**：判错分的责任要留在人身上。
- **学情总结只喂统计数字**，不把学员原始答卷发给模型（隐私 + 成本）。
- `AiContentGuard` 校验不过时**拒绝**而不是修补，避免老师拿到半成品。
- 各校自己配 key："不会配就废了"是这条路线已知的取舍（计划 §8.1 方案 A）。
- **提示词版本只在日志里**：`t_ai_usage` 没有 prompt 版本列（P4 不动表结构），对账时按日志里的
  `模板 id@version`（如 `paper-generate@1.0`）反查；要精确入库得先加列 + 迁移。
- **出卷总分的校验是硬性的**：模型给的分值合计不等于要求的总分时整卷作废（不按比例摊、不偷偷改分），
  老师重试一次通常就好；每型题数允许 ±1 题的凑整误差。
- 出卷支持的题型只有 Radio / Checkbox / Judge / FillBlank / MultipleBlank / Textarea（能自动判分的那些），
  `typeRatio` 传其它题型直接 400。
- **批改建议不落分**：`POST /api/ai/grade/suggest` 只返回 `{score, confidence, points, reason}`，
  采纳后仍走 `POST /api/answer/grade`，`t_audit` 里记的还是人工批改那条。

## 验证

```bash
cd server && ./gradlew :shared:test :rdbms:test :api:test
cd client && npm run check
python scripts/release/check_schema.py
```

## 相关文档

- [考试与问卷](./project.md)
- [答卷与判分](./answer.md)
- [权限模型](./permissions.md)
