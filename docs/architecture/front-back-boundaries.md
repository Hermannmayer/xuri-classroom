---
title: "前台与后台的边界"
description: "哪些地方前台（学员/公开侧）与后台（教职工/管理侧）没有界限：现象、代码位置、后果与收敛方向"
---

# 前台与后台的边界

> 术语：**前台** = 学员与匿名公开访问（答题、练习、公开查询、成绩单）；**后台** = 教职工与管理侧（出卷、题库、答卷管理、系统设置）。
>
> 这份文档只回答一个问题：**哪些地方这两端混在一起了**。结论来自代码，每条都带位置。

## 0. 为什么需要这份文档

系统里存在三种"看起来像边界、实际不是"的东西：

| 看起来是边界 | 实际含义 | 容易误判的地方 |
|---|---|---|
| URL 前缀 `/api/public` | 只是"**不要求登录**"，不是"前台功能" | 以为 public 下都是学员接口，把管理能力也挂进去 |
| 前端路由 `/s/*` | 只是"不套后台布局" | 组件、请求层、权限判定与后台共用 |
| 权限点 | 功能权限与"学员入口"混在同一张矩阵 | `project:answer` 既像权限又像入口开关 |

## 1. 边界地图

| 层 | 前台 | 后台 | 现状 |
|---|---|---|---|
| Controller | `SurveyApi`（`/api/public/*`，17 个端点） | 其余 14 个 Api 类 | 前缀分开了，**能力没有分开** |
| 权限注解 | `SurveyApi` 只有 1 处 `@PreAuthorize`（statistics） | 124 处 | 前台几乎不做方法级鉴权 |
| 数据范围切面 | **0 处** | 15 处（ProjectApi 10 / AnswerApi 4 / ReportApi 1） | 前台完全不走 `@EnableDataPerm` |
| Service | 直接调 `SurveyService` / `AnswerService` | 同一批 Service | **同一个实现服务两端** |
| 前端 | `/s/:id`、`/s/:id/exam-result/:id` | 其余路由 | 路由分开了，组件与请求层共用 |
| 附件 | `/api/public/upload`、`/api/public/preview/*` | `/api/file/*` | 同一张 `t_file`，靠 `shared` 字段区分 |

## 2. 七处没有界限的地方

### 2.1 `/api/public` 前缀下混着管理能力

**现象**：`SurveyApi` 的 17 个端点里，至少一个不是前台能力——`POST /api/public/statistics`（答卷分布统计）。它原本匿名可调，能拿任意 `projectId` 的逐题人数分布。

**现状**：已加 `@PreAuthorize("hasAuthority('project:report') or hasRole('admin')")`，但**路径仍留在 `/api/public` 下**——也就是说，一个需要报表权限的管理接口，URL 看起来像公开答题接口。

**同类隐患**：
- `GET /api/public/preview/{attachmentId}`：不校验登录，只校验 `t_file.shared == 1`（`FileServiceImpl:521`）。"能不能公开访问"由**数据字段**决定，而不是权限点。
- `POST /api/public/loadExamResult`：凭 `answerId`（UUID）取成绩单与解析，**没有二次身份校验**（`SurveyServiceImpl:668`）。链接一泄漏等于成绩单公开。

**后果**：读代码的人无法靠前缀判断"这是谁能调"；新增端点时很容易把一个管理能力放进 public。

### 2.2 同一个 Service 同时服务两端

**现象**：
- `AnswerService` 被 `AnswerApi`（后台答卷管理）和 `ExerciseApi`（前台练习记录）同时注入（`AnswerApi.java:28`、`ExerciseApi.java:23`）。
- `SurveyService` 一个类里既有 `saveAnswer`（前台交卷）又有 `statProject`（管理统计），还有 `loadQuery`/`getQueryResult`（公开查询）。
- `AnswerService` 内部还有 `listAnswer`（后台列表）与 `listAnswersForStat`（统计回退）两套语义。

**后果**：
- 方法级权限只能写在 Controller（`@PreAuthorize` 写实现类会被 JDK 代理绕过），Service 层不知道"现在是谁在调"。
- 单元测试要同时准备前台与后台两种上下文。
- 拆类时（S3-1~4）无法按"前台/后台"切开，只能按"职责"切。

### 2.3 数据范围只覆盖后台的三个 Controller

**现象**：`@EnableDataPerm` 共 15 处，全部在 `ProjectApi`、`AnswerApi`、`ReportApi`。前台 `SurveyApi` 一处没有。

前台的数据可见性靠**方法内部**判断：
- `SurveyServiceImpl.listAnswer` 里 `canManageProject()` + `createBy` 过滤；
- `getAnswerForProject` 里按 cookie / 登录态判断。

**刚刚踩过的坑**：统计改造时，回退路径复用了列表查询，结果匿名调用统计返回 `count=0`（因为 `createBy=null` 查不到）。修法是给统计单独开了 `listAnswersForStat`（不套行级过滤），权限交给注解。

**后果**：前台的"能看到什么"分散在十几个方法里，没有统一切面；新增前台读接口时最容易漏。

### 2.4 微信这类"接入层约束"写在业务 Service 里

**现象**：微信内打开的访问控制（UA 判断、OAuth 配置、cookie 身份）原本是 `SurveyServiceImpl` 的 7 个 private 方法，和答卷校验、统计纠缠在一个 1600 行的类里。

**已做**：抽出 `WechatAccessGuard`（`server/rdbms/.../impl/WechatAccessGuard.java`），纯搬运，行为不变。

**仍存在的问题**：
- 它依赖 `SystemService` 取 OAuth 配置，也就是**前台接入层反向依赖后台配置服务**；
- 判断"是不是微信浏览器"用的是 `User-Agent` 包含 `micromessenger`（`WechatAccessGuard#isWechatRequest`），可伪造；
- 没有测试覆盖（它需要 `ContextHelper` 的静态请求上下文，单元测试难写）。

### 2.5 前端两个入口共用组件与请求层

**现象**：
- `PublicAnswer.tsx`（1522 行）从 `pages/answer/ExamResult.tsx` 导入 `buildView` / `QuestionCard`——答题页复用了成绩单页的内部函数。
- `api/request.ts` 的 401 处理对所有页面统一：后台页跳登录，答题页没有登录概念，只能裸 `fetch` 绕开（`PublicAnswer.tsx` 里有 3 处裸 fetch）。
- `auth/permissions.ts` 的 `can()` 在前后台共用，但前台匿名用户没有 `authorityList`，所有 `can()` 都返回 false——只是前台页面本来就不用它，才没出事。

**后果**：前台页面一旦被后台的公共逻辑改动波及（例如 401 统一跳转），会在无登录场景下表现异常。

### 2.6 权限点混着"能力"与"入口"

**现象**：`PermissionEnum` 里同时有：
- 管理能力：`project:update`、`system:user:list`；
- 学员入口：`project:answer`、`repo:practice`、`portal:student`（`studentOnly=true`）。

其中 `project:answer`、`repo:practice` 等 **5 个在后端没有任何 `@PreAuthorize` 消费方**（只有前端路由与菜单用），它们的真实语义是"入口开关"，但长得和权限点一样，也参与角色矩阵勾选。

**后果**：管理员以为收紧了一个权限，实际只改了前端菜单（ADR-0002 已说明这个取舍，但矩阵里没有标注）。

### 2.7 附件：前台公开上传与后台导入共用一张表

**现象**：
- 前台答题附件走 `POST /api/public/upload`（`SurveyApi`，无权限、有配额与频率限制）；
- 后台导入走 `/api/file/*`（`file:upload` / `file:import`）；
- 两者写同一张 `t_file`，配额是全局的（`max-total-public-storage-mb`）。

**后果**：前台可以耗尽全站附件配额，影响后台导入；`file:delete` 的"只能删自己上传的"是在实现层判断（`FileServiceImpl`），不是权限模型的一部分。

## 3. 已经清晰、不要动的地方

| 项 | 为什么清晰 |
|---|---|
| 后台统一 `@PreAuthorize` + `@EnableDataPerm` | 权限点来自 `PermissionEnum`，数据范围在切面里 |
| 前台逐题下发（`/api/public/question`） | 一次请求拿不到整卷，天然限制爬题 |
| 公开查询的密码 + token（`loadQuery` / `getQueryResult`） | 独立的一次性凭证，不依赖登录态 |
| 登录/注册/微信 OAuth 在 `UserApi`/`OAuthApi` 的 `/public/*` | 语义就是"匿名可调"，前缀与功能一致 |
| 前端 `/s/*` 不套后台布局、已独立分包 | 路由与打包是分开的 |

## 4. 建议的收敛方向（按性价比排序）

1. **把"管理能力"移出 `/api/public`**：`statistics` 改成 `/api/report/statistics`（一行注解 + 前端无调用，风险极低）。
2. **给前台读接口补数据范围**：把 `@EnableDataPerm` 或等价的显式校验覆盖到 `SurveyApi` 的读端点，避免再出现"某个方法忘了过滤"。
3. **拆 `AnswerService` 的前台/后台接口**：`AnswerPracticeService`（练习记录、错题）与 `AnswerAdminService`（列表、导出、回收站），共享实现类。这是拆类里收益最大的一刀。
4. **微信约束独立成接入层组件**（已抽出 `WechatAccessGuard`），下一步补一个不依赖 HTTP 的纯函数测试。
5. **前端 401 分流**：`request.ts` 按 `/s/*` 与后台路由分别处理，前台不跳登录页。
6. **权限矩阵标注"仅前端"**：5 个无后端消费方的权限点在矩阵里加标记。

## 5. 新增端点时的三个自查问题

1. **谁调用**：匿名、学员、还是教职工？
2. **要不要登录**：`/api/public` 只是"不需要登录"，不是"前台专属"。
3. **按什么数据范围过滤**：项目/题库授权？组链？还是 `createBy`？

三个问题里任何一个答不上来，就说明这个端点的边界还没想清楚。

## 6. 相关文档

- [架构总览](overview.md)：前后端边界与权限双轴
- [后端结构](backend.md)：分层、注解与数据范围
- [权限与角色](../modules/permissions.md)：权限点、学员专属与矩阵
- [改造目录](refactor-catalog.md)：S3 拆类与权限收敛的排期
