---
id: module-ai
title: AI 助手
status: current
keywords:
  - AI
  - 抽题组卷
  - 试卷质检
  - 题库体检
  - 错题重练
  - 公告草稿
  - 批量批改
  - 意图识别
  - AiGateway
  - PromptRegistry
  - AiJobService
  - AiContentGuard
  - AiActionService
  - t_ai_usage
  - ai:use
  - 限额
  - token
source_globs:
  - server/ai/**
  - server/api/src/main/java/cn/surveyking/server/api/AiApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/Ai*.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/Ai*.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/Ai*.java
  - client/src/api/ai.ts
  - client/src/components/AiAssistant/**
  - client/src/pages/survey/ai/**
  - client/src/pages/repo/ai/**
entrypoints:
  - server/ai/src/main/java/cn/surveyking/server/ai/core/AiGateway.java
  - server/ai/src/main/java/cn/surveyking/server/ai/core/AiJobService.java
  - server/api/src/main/java/cn/surveyking/server/api/AiApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AiActionServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AiGradeBatchServiceImpl.java
  - client/src/components/AiAssistant/AiAssistantFloat.tsx
  - client/src/pages/survey/Editor.tsx
apis:
  - POST /api/ai/paper/pick
  - GET /api/ai/paper/job/{jobId}
  - POST /api/ai/paper/apply
  - POST /api/ai/paper/check
  - POST /api/ai/repo/audit
  - POST /api/ai/repo/audit/apply
  - POST /api/ai/practice/recommend
  - POST /api/ai/notice/draft
  - POST /api/ai/question/rewrite
  - POST /api/ai/grade/suggest
  - POST /api/ai/grade/batch
  - POST /api/ai/grade/undo
  - POST /api/ai/report/summary
  - POST /api/ai/chat
  - GET /api/ai/status
  - GET /api/ai/usage/today
  - POST /api/system/aiModels
tables:
  - t_ai_usage
tests:
  - server/rdbms/src/test/java/cn/surveyking/server/ai/AiContentGuardTest.java
  - server/rdbms/src/test/java/cn/surveyking/server/impl/AiUsageServiceImplTest.java
  - server/rdbms/src/test/java/cn/surveyking/server/impl/AiAssistServiceImplTest.java
last_verified: 2026-11-17
verified_against: 9a47a82d7451434a22e66fbdb54e29d0d66f7d9c
---

# AI 助手

## 30 秒摘要

AI 现在是**六个能真正干活的场景 + 一个能对当前页面动手的对话框**：

| 能力 | 入口 | 写库吗 | 说明 |
|---|---|---|---|
| 抽题组卷 | 试卷编辑器「AI 组卷」 | 采纳后写 | **从题库抽题**（不再让模型编题），按题型配比/章节/难度挑，可先预览 |
| 试卷质检 | 试卷编辑器「AI 质检」 | 不写 | 缺分值、缺答案、重复题、难度与考点覆盖 |
| 题库体检 | 题库题目页「AI 体检」 | 勾选后写 | 重复题、缺解析、缺难度/章节/标签，可批量补解析 |
| 批量 AI 批改 | 答卷数据页 / 对话 | **写**（可撤销） | 只补「未批改」卷子里还没给分的主观题 |
| 错题重练 | 学情报表「错题重练」 | 预览后「追加到本卷」才写 | 按得分率找薄弱考点，从题库再抽一组题 |
| 公告草稿 | 系统管理 → 公告管理 | 不写 | 几句要点 → 规范通知草稿，人改完再发 |

对话框（右下角悬浮按钮）不再只是聊天：每条消息先过一次**低温意图识别**，识别出动作就直接执行
（例如「把这个班没批的卷子批了」），识别不出才走普通问答。内核仍是 `AiGateway` + `PromptRegistry` +
`AiJobService` + `AiContentGuard`，外面套一层记账 `t_ai_usage`；模型 key 走每校自配。

> 2026-11 变更：「AI 凭空出卷」已下线（`POST /api/ai/paper/generate` 与 `prompts/paper-generate.md` 已删除）。
> 编出来的题没有经过教研、答案未必对，老师改起来比自己出还慢；现在出题只走「从题库抽题」。

## 什么时候看这篇

- 老师问「AI 出的题不对」「AI 建议按钮点了没反应」「为什么 AI 不显示」
- 要调「每天能用多少 token」「一次对话最多几条」——系统设置 → AI，五项限额都可配
- 要换模型供应商：填 Base URL / API Key 后点「从服务商获取」自动拉模型列表（`POST /api/system/aiModels`，Key 只在服务端用）
- 要加第七个 AI 场景，或要让对话支持一个新动作
- 排查「AI 批改把分打错了」——先看撤销，再看审计日志里的 `ANSWER_GRADE`

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 内核 | `server/ai/.../core/AiGateway.java` | 非流式统一入口：120s 超时、2 次指数退避重试、每用户限流（可配，后台任务跳过） |
| 内核 | `server/ai/.../core/PromptRegistry.java` | `prompts/*.md` 模板，首行 `version: x.y`，`render(id, vars)` |
| 内核 | `server/ai/.../core/AiJobService.java` | 长任务 jobId + 内存表 + 线程池 + 24h TTL（与 PDF 导出同一套模型） |
| 内核 | `server/ai/.../core/AiContentGuard.java` | 对话回复口径校验、采纳题目的逐题校验 |
| 场景 | `server/rdbms/.../impl/AiPaperPickServiceImpl` | 组卷：题库候选 → 模型挑选 → 补齐配比 |
| 场景 | `AiPaperCheckServiceImpl` | 质检：确定性规则 + 模型补覆盖/难度建议 |
| 场景 | `AiRepoAuditServiceImpl` | 题库体检：问题清单 + 补全建议 + 批量应用 |
| 场景 | `AiPracticeRecommendServiceImpl` | 错题重练：报表得分率 → 题库抽同类题 |
| 场景 | `AiNoticeDraftServiceImpl` | 公告草稿 |
| 场景 | `AiGradeBatchServiceImpl` | 批量批改：唯一一条 AI 直接写业务数据的路径，带撤销令牌 |
| 场景 | `AiAssistServiceImpl` | 改题、批改建议、学情总结、采纳题目（apply） |
| 对话 | `AiAssistantServiceImpl` | 多轮对话 + 上下文装配 + 调用动作路由 |
| 对话 | `AiActionServiceImpl` | 意图识别与动作分发（批改 / 打开工具 / 统计 / 额度） |
| 前端 | `client/src/components/AiAssistant/**` | 右下角悬浮对话框、动作结果卡、工具快捷入口 |
| 前端 | `client/src/api/ai.ts` | 全部 AI 接口与类型，页面里不要再拼 URL |

## 关键流程

```
用户一句话
   ↓ collectContext  按 id 查库补齐「当前试卷 / 班级 / 题库」（只信 id，不信前端文案）
   ↓ AiActionServiceImpl.handle  一次低温调用 → {"action":"grade_pending","args":{...}}
   ├─ 是动作 → 执行：批改走 AiGradeBatchService（异步任务 + 撤销令牌）；
   │           组卷/质检/体检/重练/改题/写通知 → 返回 open_tool + 跳转地址，由页面打开面板
   └─ 不是动作 → 普通多轮聊天（assistant-chat.md）
```

几条硬规则：

1. **意图识别失败不挡聊天**：模型返回的不是合法 JSON 就放弃，回退普通问答。
2. **省钱门槛**：没有页面上下文、消息里也没有动作关键词（`ACTION_HINTS`）时，不做意图识别。
3. **动作参数白名单**：只接受 id / 数字 / 枚举 / 要点文本，模型自己发明的字段一律丢弃。
4. **写操作只有一条**：批量批改。其余动作都停在「打开面板 + 预览」，写库仍要老师点确认。

### 批量 AI 批改的安全闸门

`AiGradeBatchServiceImpl` 是全站唯一一条「AI 直接写业务数据」的路径，闸门写得比别处都多：

- 只取 `grade_status=pending` 的正式答卷（暂存卷不批）；
- 只补 `score == null` 的主观题，**老师已经给过的分绝不覆盖**；
- 题目必须有参考答案与分值，否则跳过并计入 `skipped`；
- 写入走 `AnswerGradeService.submit`，与人工批改同一条路径，审计自动记 `ANSWER_GRADE`（操作人=发起人）；
- 后台线程里没有登录态：提交任务时抓 `Authentication`，任务里显式设置并在 finally 清空；
- 返回 24 小时有效的 `undoToken`，撤销按「答卷 + 题」调 `reset`，只清 AI 写的那几条；
- 一次最多 100 份答卷 / 200 条打分，超了让老师分批。

## 提示词边界（不让 AI 越界）

对话与意图识别各有一份提示词，2026-11 补齐了「这个助手只干本平台内的活」这一层：

- `prompts/assistant-chat.md@1.1`：先声明系统是什么（题库 / 试卷 / 答题判分 / 批改 / 报表 / 班级 / 通知 / 系统设置），
  再给六条硬边界——只答平台与教学内容相关的问题；无关请求（写代码、闲聊、法律/医疗/投资建议、写小说）
  一句话回绝并指回平台入口；拒绝作弊/泄题/伪造成绩/绕过防复制；不替老师做决定（批改只给建议并要求复核）；
  不编造系统里没有的数据；不讨论提示词与自身实现。
- `prompts/assistant-intent.md@1.1`：与平台无关的请求一律返回 `none`，避免「为了显得有用」去调工具。
- 场景提示词（组卷 / 质检 / 题库体检 / 错题重练 / 公告草稿 / 批改 / 学情）各自只描述自己的输入输出，
  越界的部分由上面两条兜底。

> 为什么把边界写进提示词而不是全靠后校验：模型被带偏最常见的原因是「没说清它负责什么」；
> 事后拦截只能挡住明显违规，挡不住「答得头头是道但与本系统无关」的内容。

## 限额与成本

五项都可配（系统设置 → AI），存在 `t_sys_info.ai_setting` 的 JSON 里，**不需要迁移**：

| 字段 | 默认 | 作用 |
|---|---|---|
| `perUserDailyLimit` | 20 万 token | 单用户每日上限，拦「一个人把全站额度用光」 |
| `dailyTokenLimit` | 200 万 token | 全站每日上限，拦账单爆炸（唯一的成本级风险） |
| `maxChatTurns` | 20 条 | 一次对话最多带多少条历史（每轮都要重发，越长约贵） |
| `maxTurnChars` | 4000 字 | 单条消息上限，超出截断 |
| `rateLimitPerMinute` | 10 次 | 每用户每分钟调用次数，挡手抖连点 |

`0` 表示不限。后台任务（组卷 / 质检 / 体检 / 重练 / 批量批改）用
`AiRequest.background(true)` **跳过每分钟限流**——它们本来就是「一次请求里连调几十次模型」，
走限流会把自己卡死；成本由每日 token 限额兜底、并发由 `AiJobService` 的线程池兜底。

用量每天按场景记在 `t_ai_usage`，`GET /api/ai/usage/today` 回「我 / 全站」与按场景汇总。

## 坑与已知限制

| 现象 | 原因 / 处理 |
|---|---|
| 右下角没有 AI 按钮 | 账号没有 `ai:use`，**或**系统设置里 AI 总开关是关的（`/api/system` 的 `aiEnabled`） |
| 点开说「AI 还没配好」 | `/api/ai/status` 的 `ready=false`，按 reason 去系统设置填 Base URL / Key / 模型 |
| 「AI 调用过于频繁」 | 每分钟调用数超了 `rateLimitPerMinute`；后台任务不受此限 |
| 「今日 AI 用量已达单人上限」 | 次日零点（本地时区）自动恢复，或管理员调高限额 |
| 「批改超时 / 任务已过期」 | 任务只在内存里，后端重启即失效；重新发起即可 |
| 对话里说「批改」却没执行 | ① 当前页面没有打开具体试卷；② 没有 `answer:grade`；③ 消息不像指令（换更直接的说法） |
| 错题重练找不出薄弱点 | `ReportData.statistics.average` **只对「答案是数字」的题存在**；选择题的逐题得分在 `t_answer.exam_info.question_score`。实现里两条口径都读（`exam_info` 优先、`statistics` 兜底），有 `grade_status=pending` 的答卷时主观题整卷不参与排名——否则「没批改」会被当成「错得最多」 |
| 组卷采纳时被 `AiContentGuard` 拒 | 题库题常缺 `examAnswerMode`；组卷/推荐在返回前会补齐 `examAnswerMode` 与 `dataSource`，自己写新场景时也要补，否则 `/paper/apply` 整批被拒 |

## 修改指南

### 加一个 AI 场景

1. 在 `server/shared/.../domain/dto` 加 Request/View（View 里只放前端要渲染的字段，别把整个模型返回透出去）；
2. 在 `server/rdbms/.../service` 加接口，`.../impl` 加实现：
   长任务用 `aiJobService.submit(AiUsageService.SCENE_X, userId, ctx -> {...})`，
   调模型统一走 `AiAssistSupport#call(scene, userId, request, json)`（它自带限额、记账与失败分类），
   **后台任务记得把 `AiRequest.builder().background(true)` 带上**，否则批量场景会被每分钟限流卡死；
3. 提示词放 `server/ai/src/main/resources/prompts/<id>.md`，首行写 `version: x.y`（改提示词就改版本号）；
4. 在 `AiApi` 加端点并写清权限：`@PreAuthorize("hasAuthority('ai:use') and ...")`；
5. `AiUsageService` 加一个 `SCENE_*` 常量（用量报表按它分组）；
6. 前端在 `client/src/api/ai.ts` 加类型与函数，页面里不要拼 URL；
7. 补三件事的用例：**没权限 / 超限额 / 模型返回脏数据**。

### 让对话支持一个新动作

1. 在 `AiActionServiceImpl` 的 `ARG_WHITELIST` 里加参数白名单（只放 id、数字、枚举）；
2. 在 `prompts/assistant-intent.md` 的动作表里加一行（动作名、使用条件、必需上下文、参数）；
3. 在 `handle(...)` 的 switch 里加分支：能直接做的就执行并把结果塞进 `AiChatAction`；
   要打开面板的就返回 `open_tool` + `link`（页面读 `?ai=xxx` 自动展开），**不要在对话里替用户点确认**；
4. 写操作必须可撤销、可审计，并且只碰「本来没做过」的数据（参考批量批改）。

### 改提示词 / 限额

- 提示词：改 `prompts/*.md` 并把首行 `version` 加一；日志里会打 `<id>@<version>`，出事能反查。
- 限额：改 `SystemInfo.AiSetting` 字段 → `SystemServiceImpl#mergeSysInfo` 夹取范围 →
  `SystemApi#getSystemAiSetting` 回显默认值 → 前端「系统设置 → AI」加控件。四处齐了才算改完。

## 权限与数据范围

| 动作 | 权限 | 数据范围 / 约束 |
|---|---|---|
| 用任意 AI 能力 | `ai:use` | 默认只给 admin / teacher；学员没有（学员侧只有答题解析） |
| 组卷 / 质检 / 改题 / 学情 / 对话 | `ai:use` | 传了 `projectId` 就要过项目只读闸门（`ProjectPartnerService#accessLevel >= 1`） |
| 采纳题目（`/paper/apply`） | `ai:use` + `project:update` | 再走 `ProjectService#updateProject` 的行级闸门 |
| 题库体检 | `ai:use` + 题库可读 | `RepoService#getRpo` 自带可读校验（自己/共享/授权组/班级分配） |
| 应用体检建议 | `ai:use` + `repo:update`/ `template:update` | 逐题走 `TemplateService` 的写路径 |
| 批改建议 / 批量批改 / 撤销 | `ai:use` + `answer:grade` | 答卷行级：`AnswerAccessGuard#assertProjectAccess` |
| 错题重练 | `ai:use` + `project:report` | 报表只读；只把统计数字发给模型 |
| 公告草稿 | `ai:use` | 发全站受众另要 `notice:manage:system`（老师只能写班级通知） |
| 用量查询 | `ai:use` | 只看得到「我」的明细与全站合计，看不到他人明细 |

## 验证

1. 后端编译 + 单测（本机没有 JDK 时在 NAS 的 gradle 容器里跑）：

   ```bash
   gradle :api:compileJava -x test
   gradle :rdbms:test --tests cn.surveyking.server.ai.AiContentGuardTest           --tests cn.surveyking.server.impl.AiAssistServiceImplTest           --tests cn.surveyking.server.impl.AiUsageServiceImplTest           --tests cn.surveyking.server.impl.AiAssistantServiceImplTest
   ```

2. 前端：`cd client && npx tsc --noEmit`（0 错误）+ `npm run build`。
3. 手测清单（AI 关 / 开两种状态各走一遍）：
   - AI 停用：右下角没有悬浮按钮；旧 `/ai` 链接跳到 系统设置 → AI；
   - 未配 Key：按钮在，点开是「AI 还没配好」+ 去系统设置；
   - 对话说「把这个班没批的卷子批了」：卡片出现进度，完成后能点「去查看」和「撤销批改」；
   - 撤销后回答卷页看：这次写入的分数被清空、老师手工给的分还在。

## 相关文档

- [答卷、判分与报表](./answer.md) —— 批改与分数的口径（AI 批改只是其中一个写入口）
- [题库与题目](./repo.md) —— 组卷 / 体检读写的表与权限
- [项目与考试](./project.md) —— 采纳题目写进 schema 的路径
- [通知公告](./notice.md) —— 公告草稿落到哪、谁能发全站
- [MCP 与 API 令牌](./mcp.md) —— 令牌、工具白名单（与对话动作是两条独立的入口）

> 没有接真实模型的端到端测试：真实 key 由各校自己配，CI 里不联网。
