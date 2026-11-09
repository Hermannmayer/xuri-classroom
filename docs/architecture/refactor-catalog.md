---
title: "架构改造目录（2026-11）"
description: "从单校可用到可扩容、可多租户的分阶段改造清单：现状、目标、改动点、验收"
---

# 架构改造目录

> 这份文档是**改造任务单**，不是设计说明。每条有编号、证据、验收标准，可以直接拆成提交。
> 设计理念在 [架构总览](overview.md)、[后端结构](backend.md)、[数据模型](data-model.md) 里；本文档只回答「改什么、先改哪个、怎么验」。

## 0. 使用说明

- 编号规则：`S{阶段}-{序号}`，例如 `S0-2`。提交信息里写编号，方便回溯。
- 每条包含：现状（带证据）、目标、改动点、验收、风险。
- 阶段之间**没有强依赖**，但 `S1` 的四条（缓存/限流/幂等/租户上下文）必须在 `S4` 多实例之前完成。
- 改完代码按仓库约定跑 `npm run docs:impact`，更新对应 `docs/modules/*.md`。

---

## 1. 目标与边界

### 1.1 三个目标（按时间排）

| # | 目标 | 时间 | 衡量方式 |
|---|---|---|---|
| G1 | 边用边改不断服 | 现在 | 发布 < 60 秒，失败自动回退 |
| G2 | 扩到 5000 人只需加机器，不改代码 | 1–2 年 | 单实例 300 QPS 读；加实例线性 |
| G3 | 一套服务多校（可选） | 3 年后 | 加 `tenant_id` 不改业务代码 |

### 1.2 不变量（不在改造范围）

1. 单卷 schema 以 JSON 文档为真源（`t_project.survey` / `t_answer.survey`）；
2. Spring Boot 单体 + MyBatis-Plus + MySQL 8，不拆进程；
3. 权限双轴：功能权限（`@PreAuthorize`）+ 数据范围（`@EnableDataPerm` / `*_partner`）；
4. 起步环境 4C8G 单机，Docker compose。

### 1.3 明确不做

| 项 | 原因 |
|---|---|
| 微服务、K8s、服务网格 | 单校到十校的规模，运维成本远大于收益 |
| 消息队列 | 交卷是单事务写入，没有异步解耦的必要 |
| 分库分表 | 5000 人 × 100 题 ≈ 50 万行/学期，MySQL 单实例足够 |
| 现在就加 `tenant_id` | 未确定多租户形态前，加列等于给所有查询加噪音（见 §5） |
| 重写前端框架 / 引入 Redux | 现有分层是干净的，问题在契约与打包，不在状态库 |

---

## 2. 现状基线

| 项 | 数字 | 出处 |
|---|---|---|
| 后端 | 约 2.9 万行 Java；`api` 17 类 / 154 端点；`rdbms` 122 文件 | `server/**` |
| 前端 | 108 文件 / 约 2.35 万行；单 chunk 2.06MB（gzip 0.64MB） | `client/src`、构建产物 |
| 数据库 | 25 张表；`t_answer` 仅 `(project_id)` 一个二级索引 | `init-mysql.sql` |
| 最大单文件 | `SurveyServiceImpl` 1672 行、`UserServiceImpl` 1436、`AnswerServiceImpl` 1252、`PublicAnswer.tsx` 1596 | 代码 |
| 测试 | 后端 0 个测试类；前端 3 个零框架脚本；CI 只有文档流水线 | `server/**`、`client/package.json`、`.github/workflows` |
| 发布 | `reset --hard` + 原地重编译；`release.sh`/`rollback.sh` 存在但未接入 | `scripts/nas/` |
| 缓存 | Caffeine `maximumSize(100)` 对所有缓存生效 | `CacheConfig.java:64` |

---

## 3. 目标架构

### 3.1 部署形态（三阶段）

~~~text
现在（单机）              扩到 5000 人            多租户（可选）
Lucky → web → app → db    LB → app×2 → db          LB → app×N → db
        web-watch(移除)          Redis(缓存/限流)         对象存储
~~~

要点：
- 生产**不再常驻构建器**（现在占 2G，是运行时预算的一半）；
- 前端产物与 jar 都走"原子替换"，见 `S1`；
- 多实例的前提是**进程外无隐藏状态**，见 `S4`。

### 3.2 代码结构：模块化单体

~~~text
platform/   web、security、audit、error、cache、mvc advice
identity/   user、dept、role、permission、session
exam/       project、setting、publish、answer、scoring、exam-control
question/   repo、template、schema
insight/    stat、report、export
storage/    file、local（预留对象存储实现）
ai/         依赖接口 + 条件装配
~~~

四条可由 ArchUnit 机检的规则：

1. `platform` 不依赖任何业务域；
2. Controller 不依赖 Mapper（现违例：`TeachingApi.java:37`）；
3. `@Transactional` 只出现在 `app` 层；
4. 跨域只能调对方 `app` 接口，不得直接读写对方表（现违例：`SurveyServiceImpl.java:478` 直接 `updateById` 改 `t_answer`）。

### 3.3 数据模型

保留 JSON 真源，增加两层：

| 层 | 表 | 作用 |
|---|---|---|
| 真源 | `t_project.survey`、`t_answer.survey`、`t_answer.answer` | 编辑与作答的完整快照，不参与聚合查询 |
| 投影 | `t_answer_item` | 交卷时展开，统计/导出只读它 |
| 大字段隔离 | `t_answer_snapshot` | `survey` 快照移出主表，列表页永不读取 |

### 3.4 请求路径目标

| 场景 | 现在 | 目标 |
|---|---|---|
| 登录态请求 | 5–6 次 DB（`CacheConfig.java:64` + `UserServiceImpl:227`） | 0–1 次（缓存命中） |
| 答卷列表 | `SELECT *` 含整卷 JSON | 只选所需列 |
| 统计 | `pageSize(-1)` + 内存三层循环 | 一次 `GROUP BY` |
| 导出 | `MAX_VALUE` 全量进堆 + 裸线程 | SXSSF 流式 + 受控线程池 |

### 3.5 身份与权限

- 权限码单一真源：`PermissionEnum` → 生成前端常量、`t_role_permission` 种子、`docs/reference/permissions.md`；
- 角色-权限落关联表，废弃 `t_role.authority` 逗号串（对 admin 而言它本来就不参与鉴权，`UserServiceImpl:1338` 运行时注入全集）；
- 权限矩阵标注「仅前端」：`portal:*`、`project:answer`、`repo:practice` 这 5 个后端无注解，属 UI 入口控制；
- `answer:attach` 已由迁移 11 移除，代码里只剩注释示例（`AnswerApi` 的 javadoc），无需再清理；权限矩阵不需要动。

### 3.6 发布链路

目标：一次发布是**原子操作**。

1. `flock` 防并发发布；
2. jar：写 `app.jar.new` → `mv`，保留 `app.jar.prev`；
3. 前端：构建到 `dist-next`（`emptyOutDir:false`）→ 原子 `mv`；
4. 迁移：发布前执行，失败即停；
5. 冒烟失败：自动回退 jar 与 dist，不靠人 revert。

### 3.7 可观测性

- Actuator 只读 + `/api/system/health`（DB、磁盘、产物版本、构建时间）；
- 日志落卷（现在 `./logs` 未挂载，声明 90 天、实际重建即丢）；
- 错误状态码归位：现在 `GlobalExceptionHandler` 一律 `ResponseEntity.ok()`，监控与冒烟都看不见失败。

---

## 4. 改造目录

### S0 · 止血（1 天，与规模无关）

| 编号 | 现状 | 目标 | 改动点 | 验收 |
|---|---|---|---|---|
> 状态：**2026-11-09 已全部完成**（见每条的状态列）。

| 编号 | 现状 | 目标 | 改动点 | 验收 | 状态 |
|---|---|---|---|---|---|
| S0-1 | 列表/统计 `SELECT *`，把整卷 schema 读进来再丢掉 | 统计路径只取所需列 | 新增 `AnswerService#listAnswerForStat`；`AnswerServiceImpl` 收窄 SELECT（不含 `survey`/`tempAnswer`）；`SurveyServiceImpl.statProject` 改调它 | 统计内存峰值 < 50MB；统计 < 200ms | ✅ |
| S0-2 | 所有缓存共用 `maximumSize(100)`，500 人时命中率≈0 | 按 cacheName 分治 | `CacheConfig`：`DEFAULT_SIZES`（userCache/projectPermissionCache 10000、projectCache 2000、fileCache 1000、dept/common 200），支持 `custom-cache.sizes` 覆盖 | 登录态请求 DB ≤ 1 次 | ✅ |
| S0-3 | 导出每个请求 `new Thread`，无并发上限；且先把全部行组装成 List | 受控线程池 + 队列满拒绝 | `AnswerServiceImpl`：`EXPORT_POOL`（2 并发、队列 4、AbortPolicy，队满返回中文错误）。注：Excel 已用流式库 `fastexcel`，不需要换 SXSSF——真正的风险在行数据预构建与并发数 | 两人并发导出不 OOM；第三份返回明确错误 | ✅ |
| S0-4 | 两处 `dangerouslySetInnerHTML` 无消毒 | DOMPurify 消毒 | `SchemaRenderer.tsx`（Remark 题）、`PublicAnswer.tsx`（交卷提示）；新增依赖 `dompurify`。**未加 CSP**：`WebSecurityConfig` 有意关闭 `frameOptions` 以支持嵌入，加 `frame-ancestors` 会破坏该场景，需先确认嵌入需求 | 注入 `<img onerror>` 不执行 | ✅ |
| S0-5 | 生产 `vite build --watch` 不跑 `tsc` | 发布前类型检查 | `Deploy-Nas.ps1` 新增 0.5 步：`client/**` 有改动且装了 `node_modules` 时跑 `npm run check`，失败即中止 | 故意写错类型 → 发布被拒 | ✅ |
| S0-7 | 构建失败会清空 `dist`，线上瞬时 403 | `vite.build.emptyOutDir=false` + 发布脚本改为探测首页 200 而不是 grep 日志 | `client/vite.config.ts`、`Deploy-Nas.ps1` 第 6 步 | 构建失败时线上仍是上一版；依赖变更后自动等到产物可访问 | ✅ |
| S0-6 | `t_answer` 只有 `(project_id)` 索引 | 覆盖列表排序 | `init-mysql.sql` 加 `key_answer_pid_user_time(project_id, create_by, create_at)`；新增幂等迁移 `scripts/nas/migrate/24-answer-indexes.sql` | 列表查询无 filesort | ✅ |

### S0 验证记录（2026-11-09）

- **发布**：两个提交分两次上 NAS。后端编译 23s、重启 12s；冒烟 5 项全绿（首页 / 产物 / 系统信息 / 登录 / 试卷数据）。
- **迁移**：`24-answer-indexes.sql` 已执行；`t_answer` 现有 `key_answer_pid(project_id)` 与 `key_answer_pid_user_time(project_id, create_by, create_at)`。
- **接口实测**：`POST /api/public/statistics` 68–229ms（3 次）、`GET /api/answer/list` 61ms、`GET /api/answer/download` 250ms（11922 字节）。
- **数据量**：`t_answer` 共 5 份，`answer` 合计 6.3KB，`survey` 列为 NULL。所以「统计收窄列」的收益要等数据量上来才体现——当前验证的是**功能正确**，不是性能提升幅度。
- **一次真实故障**：首次发布后前端 403。原因：`web-watch` 在依赖未安装时构建失败（`Rollup failed to resolve import "dompurify"`），而 `emptyOutDir` 默认 true 会先清空 `dist`；同时发布脚本靠 grep 日志里的 `built in` 判断就绪，匹配到了上一次成功的记录。已按 S0-7 修复并在第二次发布验证：`emptyOutDir=false` + 发布脚本改为探测首页 200 与引用 JS 200。

### S0.5 · 回归测试网（已完成，2026-11-09）

拆类（S3-1~4）的前置条件。`server/shared/src/test` 下 9 个用例，约 10 秒：

| 测试 | 保护什么 |
|---|---|
| `ProjectStatHelperTest`（2） | 投影聚合与内存算法结果一致；未启用统计的题不进入 |
| `PermissionEnumTest`（4） | 权限码不重复、格式合规、学员专属恰好 6 个 |
| `SchemaHelperTest`（3） | 扁平化只收有数据的题；`withOption` 才展开选项 |

另有 3 个 **Service 层集成测试**（`server/api/src/test/.../AnswerFlowTest`）：匿名统计被拒、统计数与答卷数一致、投影重建幂等。
它们用 `@SpringBootTest` + MockMvc + 本地测试库，靠 `@EnabledIfEnvironmentVariable(S2_TEST_DB_URL)` 控制——没配测试库的机器上自动禁用，不会拖红构建。

已接进 `Deploy-Nas.ps1` 的 0.6 步：每次发布先跑 `:shared:test :api:test`，失败即中止（紧急可用 `-SkipTests`）。

### S1 · 可扩容地基（2–3 天，为 S4 铺垫）

> 状态：**2026-11-09 完成 5 项，S1-3 随 S2 一起做**（改交卷路径，需要与投影表同一批验证）。

| 编号 | 现状 | 目标 | 改动点 | 验收 | 状态 |
|---|---|---|---|---|---|
| S1-1 | 缓存实现写死 Caffeine，容量统一 100 | Spring `CacheManager` 抽象 + 按 cacheName 可配容量 | S0-2 已完成容量分治；抽象本来就在 Spring Cache 上，换 Redis 只需替换 `CacheManager` Bean | 换实现只改一个 Bean | ✅ |
| S1-2 | 限流是 `RateLimitFilter` 内部的静态 `Map` | `RateLimiter` 接口 + `InMemoryRateLimiter` | 新增两个类；Filter 只负责取 key 与返回 429 | 接口可替换；行为不变 | ✅ |
| S1-3 | 交卷幂等用进程内 `recentSubmits`（15 秒窗口） | DB 唯一键 `(project_id, create_by, attempt_no)` | `AnswerServiceImpl:310` 附近 | 多实例下重复提交只落一条 | ⏳ 随 S2 |
| S1-4 | 统计无上限，全量进内存聚合 | `count()` 超过 20000 直接拒绝并提示分批 | `SurveyServiceImpl.statProject` + `ErrorCode.StatisticsTooLarge(4060)` | 1 万答卷不 OOM | ✅ |
| S1-5 | 无租户概念 | `TenantContext` 固定返回 `default`（**不参与任何查询**） | 新增 `core/tenant/TenantContext` | 为 §5 预留；现在过滤会查不到数据 | ✅ |
| S1-6 | 4 套 IP 取法（`IPUtils`/`X-Real-IP`/`XFF`/`getRemoteAddr`） | 唯一 `IPUtils` 解析 + nginx `real_ip` | `IPUtils` 重写；替换 `RateLimitFilter`/`ExportGuardService`/`UserApi`/`FileServiceImpl`；`deploy/nginx.conf` 加 `set_real_ip_from` + `real_ip_header` | 审计/限流/登录锁定按真实 IP | ✅ |

**S1 验证记录（2026-11-09）**

- 编译 22s、重启 12s，冒烟 5 项全绿；`nginx -t` 通过。
- 公网请求后 nginx 日志的 `$remote_addr` 从 `172.19.0.1` 变成真实来源地址（`192.168.0.1`，NAT 后的出口），证明 `real_ip` 生效。
- **踩到的坑**：`deploy/nginx.conf` 是单文件 bind mount，`git reset --hard` 替换文件后容器仍指向旧 inode，`nginx -s reload` 读不到新配置（容器内是旧内容、宿主机是新内容）。必须 `docker compose restart web`。已写进 `Deploy-Nas.ps1` 的 4b 步。

### S2 · 数据形状（1–2 周，推广分水岭）

> 状态：**2026-11-09 完成 S2-1/2/3，S2-4/5 未做**（导出仍读 JSON；注解 SQL 收口留到多租户阶段）。

| 编号 | 现状 | 目标 | 改动点 | 验收 | 状态 |
|---|---|---|---|---|---|
| S2-1 | 答案只在 JSON 里 | `t_answer_item(answer_id, project_id, question_id, option_id)` | 新表（迁移 25 + init）；`AnswerItemProjector` 交卷时批量写（每批 500 条多值 INSERT） | 单份 100 题 = 100 行 | ✅ |
| S2-2 | 统计内存三层循环 | `GROUP BY question_id, option_id` | `AnswerItemMapper.statQuestions/statOptions`；`ProjectStatHelper.statFromProjection()` | 只回传「题 × 选项」计数，不加载答卷 JSON | ✅ |
| S2-3 | 无历史投影 | 回填 + 一致性校验 | `AnswerItemBackfill`（`surveyking.answer-items.backfill=true` 触发，幂等） | 200 份 / 21559 行回填 2.6 秒；与旧算法逐题逐选项 0 差异 | ✅ |
| S2-4 | 导出读 JSON | 导出读投影 | — | — | ⏳ 未做（导出是行式明细，投影表缺 value，需先扩列） |
| S2-5 | 24 处注解 SQL 绕过 Wrapper | 收口到统一入口 | — | — | ⏳ 随 S5（多租户插件）一起做 |

**S2 验证记录（2026-11-09，本地隔离测试库，未上 NAS；库名与连接不写进仓库）**

- 种子：100 题（80 题 `statEnabled`）× 200 份答卷，answer JSON 合计 411KB。
- 基准：用 Python 按 `ProjectStatHelper` 的语义算出 80 题 / 331 个选项的计数，作为旧算法基准。
- 投影聚合：同一批数据展开成 21,559 行，`GROUP BY` 结果与基准 **0 差异**。
- 端到端：本地启动 jar（JDK8 + 隔离测试库），回填 200 份成功 0 失败，`POST /api/public/statistics` 返回 80 题 331 选项，**0 差异**，耗时 137–173ms。
- 回退兜底：清空投影后统计自动回退内存算法（不会变空），回填完成后自动切回 SQL。
- **覆盖判断用 `t_answer.items_synced` 而不是投影行数**：没有选项答案的答卷（纯文本/空卷）展开后是 0 行，按行数判断会永远「覆盖不全」、统计永远回退。实测生产 5 份里有 2 份就是这种，加列后 `200/200` 全部同步。
- 顺带修掉的越权：`/api/public/statistics` 原本匿名可调（能拿任意 projectId 的答卷分布）。已加 `@PreAuthorize("hasAuthority('project:report') or hasRole('admin')")`，匿名返回 `body.code=403`。**注解必须写在 Controller**：ServiceImpl 被 JDK 动态代理包装，写在实现类上不生效（实测）。
- 批量插入：逐条 insert 回填 200 份要 56 秒，改多值 INSERT 后 2.6 秒（5000 份预计 ~65 秒）。

### S3 · 结构与权限（1–2 周）

| 编号 | 现状 | 目标 | 验收 |
|---|---|---|---|
| S3-1 | `SurveyServiceImpl` 1672 行、6 类职责 | 拆 access / scoring / publicQuery / loader | 单类 < 400 行 |

**S3-1 拆类进度（2026-11-09）**

| 块 | 状态 | 说明 |
|---|---|---|
| 微信访问控制 | ✅ 已抽 `WechatAccessGuard` | 7 个方法，纯搬运，`SurveyServiceImpl` 少 82 行 |
| 公开查询 | ⏸ 已备测试，暂缓搬迁 | 新增 `PublicQueryTest`（2 用例）。搬迁障碍：① `findAnswerByQuery` 强转 `AnswerServiceImpl` 调 `ServiceImpl.list`，接口层没有该方法；② `buildQueryFormSchema`/`buildQueryResultSchema` 依赖 `MessageSource` 的 `i18n`；③ 整块 300+ 行、10 个方法。**前置条件**：先把 `AnswerService` 补一个语义化查询方法去掉强转，并给 `getQueryResult` 补 3 个用例（含 `buildLikeQueryConditionOfQuestion` 的模糊匹配）。 |
| 考试控制 | ✅ 已抽 `ExamControlService` | 切屏计数、闯关超时扣分、考试结束判断；SurveyApi 与 saveAnswer 改为委托 |
| 答案校验 | ◐ 部分抽出 | `validateSubmittable`（停用/截止/回收上限）已抽到 `AnswerValidationService`。剩余 `validateAnswer`（要调 `statProject`，构造器循环依赖）、`validateAndMergeAnswer`+`validateAnswerGate`（依赖 `getAnswerForProject` 与三个限次方法，那几处还被别的入口复用）**未搬**：需先补「缺必填题交卷被拒」「超时交卷宽限」的集成用例 |
| 统计 | ✅ 已抽 `statFromProjection` | 投影聚合与内存算法双路径 |

**端到端测试尝试（2026-11-09，未完成）**

目标是「开始答题 → 暂存 → 交卷 → 查分 → 统计」一条链路，作为 S3-1/S3-2/S3-3 的前置保护。实际推进到第 5 步，卡在三个地方，测试未提交：

| 卡点 | 现象 | 结论 |
|---|---|---|
| 种子 survey 结构 | `JacksonTypeHandler` 报 `_deserializeFromArray` | `t_project.survey` 必须是 `SurveySchema` **对象**（含 `id/title/type/children`），不是数组。已确认正确写法 |
| 查分 `loadExamResult` | 匿名/普通用户一律 403 | 该接口要求「答卷归属本人」（答卷 cookie 或登录态），测试里缺少真实会话 |
| 统计 `/api/report/statistics` | **真实 JWT 下不是 403 而是 500**（`NullPointerException`） | 认证与 `@PreAuthorize` 都通过，异常在 `statProject` 内部。已排除 `DataPermAspect`；已给 `statFromProjection` 补了 survey 空守卫但仍 500，剩余嫌疑是 `answerItemMapper.statQuestions/statOptions` 返回的聚合行里有 null 字段。**这是生产 bug：只要某个项目「有答卷且投影已覆盖」，统计就 500** |

下次继续时：种子用 `s2exam`（已在本地 `s2_check` 建好，2 题、status=1），先解决统计的归属校验，再补查分的 cookie 模拟。
| S3-2 | `AnswerServiceImpl` 1252 行（装配/授权/计时/导出） | 拆 assemble / authorize / export / timer | 同上 |
| S3-3 | `UserServiceImpl` 1436 行（认证/权限/组织/导入/学员） | 拆 auth / org / admin / import | 同上 |
| S3-4 | 无边界约束 | ArchUnit 规则进构建 | 违规即失败 | ✅ 2026-11-09：三条规则（api 不依赖 mapper / impl 不依赖 api / service 接口不依赖 impl）；顺带给 `TeachingApi` 补了 `TeachingService`（它原本是全仓唯一直连 Mapper 的 Controller）。第四条「api 不得依赖 impl」等公开查询等组件搬进独立包后再加 |
| S3-5 | 权限三份真源（枚举 / 前端裸串 / SQL 种子） | `PermissionEnum` 唯一真源，生成前端常量与文档 | ✅ 2026-11-09：`gen.mjs` 新增 `client/src/auth/permission-codes.ts`（含 `PERMISSIONS` 与 `STUDENT_ONLY_PERMISSIONS`），`docs:check` 会在枚举变化而生成物未更新时报 STALE。**页面里 57 处裸串尚未替换**（改动面覆盖 46 个文件，单独排期，可逐步迁移到 `PERMISSION_CODES` 常量） |
| S3-6 | 权限矩阵不区分「仅前端」 | 矩阵加标注；清理 `answer:attach` | ✅ 2026-11-09：`answer:attach` 已由迁移 11 删除；矩阵标注见 S6-7（前端集合，过渡方案） |
| S3-7 | 错误一律 HTTP 200 | 状态码与 `code` 对齐 | 冒烟能发现 4xx/5xx |
| S3-8 | 登录不进审计（`AuditAspect:33` 排除 `/api/public/**`） | 登录成败单独记录 | ✅ 2026-11-09：`UserApi` 写 `AUTH_LOGIN` / `AUTH_LOGIN_FAILED`，本地实测两条落库 |
| S3-9 | 前端 32 个页面静态 import，入口 chunk 2.1MB | 路由级 `lazy` + `Suspense` | ✅ 2026-11-09：入口 chunk 2,143KB→998KB（gzip 682→320KB），页面各自分包 |

### S4 · 多实例（推广前 1 周）

| 编号 | 内容 | 前置 |
|---|---|---|
| S4-1 | 无状态审计：逐项确认无进程内状态（缓存/限流/幂等已外置） | S1-1/2/3 |
| S4-2 | nginx upstream 两实例 + 滚动重启 | S4-1 |
| S4-3 | Redis 接缓存与限流（`CacheManager` / `RateLimiter` 换实现） | S1-1/2 |
| S4-4 | 附件走对象存储（`StorageService` 已有抽象，加实现） | — |
| S4-5 | 连接池与读写分离评估（先只调参：Hikari 20→40，视压测） | S2 |

### S6 · 未接线清理（2026-11-09 新增）

盘点见两份文档：[前台与后台的边界](front-back-boundaries.md)、[没有接线的东西](unwired-inventory.md)。

> 状态：**2026-11-09 完成 6/7**，S6-7 主动跳过（原因见表格）。

| 编号 | 内容 | 优先级 | 验收 | 状态 |
|---|---|---|---|---|
| S6-1 | 微信校验补到公开查询三个方法（`loadQuery` / `getQueryResult` / `loadLinkResult`） | **P0**（限制可绕过） | 设了 wechatOnly 的问卷，公开查询也要求微信授权 | ✅ |
| S6-2 | 27 个前端未调用端点：按「有意不接 / 忘了接」分类 | P1 | scope.md 与实际一致 | ✅ 三组写进 scope，其余待逐个确认 |
| S6-3 | `SK_CRYPTO_KEY`：实现加密或删掉必填项 | P1 | compose 里不再有假开关 | ✅ 改为诚实化（未实现加密），不删变量以免破坏部署脚本 |
| S6-4 | 删除 `RolePermission` 实体 | P2 | 实体不存在 | ✅ 顺带发现表本身不存在，无需迁移 |
| S6-5 | 注册 `setUnauthorizedHandler`，401 按路由前缀分流 | P2 | 答题页 401 不再整页刷新 | ✅ |
| S6-6 | 统计接口移出 `/api/public`（改为 `/api/report/statistics`） | P1 | URL 与所需权限一致 | ✅ |
| S6-7 | 权限矩阵给 5 个「仅前端」权限加标注 | P3 | 矩阵里能看出哪些只控制入口 | ✅ 前端 `FRONTEND_ONLY_CODES` 集合 + 矩阵标签；理想做法是后端在权限目录返回 `enforced`（注解扫描），当前是前端硬编码这一份，属于过渡方案 |

### S5 · 多租户（见 §5）

---

## 5. 多租户演进：先 A（每校一套），不堵死 B（一套多校）

### 5.1 现在就要划的三条边界（零成本）

| 边界 | 现在 | 未来 | 为什么现在做 |
|---|---|---|---|
| 组织根 | `getRootDeptId()`（`UserServiceImpl:1043`） | 根 dept = 租户 | 已有概念，只需在文档和常量里给它"租户"语义 |
| 用户名唯一性 | `loadUserByUsername` 单参数全局查（`UserServiceImpl:123`） | `(tenant, auth_account)` 唯一，登录带租户 | 这是多租户**最硬的改造点**，现在预留登录参数，未来只改查询 |
| 全局配置 | `t_sys_info` 单行 `id='1'`（`SystemServiceImpl:72`） | 每租户一行，主键=租户 id | 现在把 id 抽成常量，未来主键语义直接复用 |

### 5.2 零成本预留清单（随 S1–S3 顺手做，不单独排期）

1. `TenantContext`（固定 `default`），业务入口统一经它取租户（S1-5）；
2. 登录接口接受可选 `tenant` 参数，当前忽略；`loadUserByUsername(username, tenant)` 内部仍走全局；
3. `t_sys_info` 主键常量化为 `TenantConsts.DEFAULT`，查询从 `selectById("1")` 改为 `selectById(tenantContext.id())`；
4. 存储路径生成统一走 `StorePath`，路径首段预留给租户（现在固定 `default`）；
5. 24 处注解 SQL 收口（S2-5），保证未来 MyBatis-Plus 租户插件能拦住所有查询；
6. 审计表补 `tenant` 列（现在填默认值），避免未来回填；
7. 唯一约束审查：现有 5 个唯一索引都是交表，`auth_account` 的唯一性由代码保证——未来改成 `(tenant_id, auth_account)` 时不需要数据清洗；
8. 缓存 key 加租户前缀（`default:userId`），现在无冲突，未来零改造。

> 这 8 条合计 **1–2 天**，全部随 S1–S3 顺带完成。不做的话，未来多租户改造会从"加列 + 插件"变成"全表回填 + 登录重写 + 缓存重设"。

### 5.3 启用 B 时的改动面（估算）

| 层 | 改动 | 工作量 |
|---|---|---|
| 表结构 | 业务表加 `tenant_id`，唯一索引改复合 | 1 天（迁移脚本） |
| 查询 | 挂 MyBatis-Plus `TenantLineInnerInterceptor` | 0.5 天 |
| 登录/会话 | 登录带租户；JWT claim 加 `tenant` | 2 天 |
| 权限 | `t_role` / `t_role_permission` 加租户 | 1 天 |
| 配置/字典 | `t_sys_info`、`t_comm_dict` 按租户 | 1 天 |
| 文件 | 路径首段切真实租户，存量迁移 | 1 天 |
| 审计/统计 | 按租户过滤，报表加维度 | 2 天 |
| **合计** | | **约 1–2 周**（因为 §5.2 已预留） |

若跳过 §5.2 直接启用，同样工作量为 **1–2 个月**（要改所有调用点、回填历史、重设缓存与登录）。

### 5.4 迁移步骤（未来执行）

1. 加列 `tenant_id NOT NULL DEFAULT 'default'`，不改任何查询；
2. 建租户表，把根 dept 映射为租户；
3. 开双读：先按租户过滤，比对结果与全局一致；
4. 挂拦截器，灰度一个租户；
5. 全量切换，保留 `default` 兼容单租户部署。

---

## 6. 验收与压测

### 6.1 性能基准（目标值，需压测确认）

| 场景 | 500 人 | 2000 人 | 5000 人 |
|---|---|---|---|
| 答题页首屏（P95） | < 300ms | < 400ms | < 500ms |
| 交卷（P95） | < 500ms | < 800ms | < 1s |
| 统计 1 场 | < 100ms | < 200ms | < 300ms |
| 导出 1 场 | < 3s | < 8s | < 15s |
| 单实例读 QPS | — | 300 | 300（×N 实例） |

### 6.2 压测方法

- 用 k6 或 JMeter 模拟：`loadProject → 逐题 loadQuestion → 暂存 → 交卷`；
- 数据准备：造 3 个项目 × 100 题 × N 份答卷；
- 每轮记录：P50/P95/P99、错误率、DB QPS、GC 次数、堆峰值；
- 基线版本：S0 完成后打一次，S2 完成后复测。

### 6.3 发布验收

- 发布过程中并发打 20 QPS，错误率应为 0（原子替换）；
- 中途 `kill` 发布进程，线上应仍为旧版本且可用；
- 冒烟失败时自动回退，回退后版本号与产物 hash 一致。

---

## 7. 风险登记

| 风险 | 触发 | 最坏结果 | 缓解 | 阶段 |
|---|---|---|---|---|
| 发布覆盖半截 jar | 发布中断/并发 | 全班交不了卷 | `mv` 原子替换 + `flock` + `.prev` | S0 |
| 数据与备份同盘 | 磁盘/卷损坏 | 历史成绩不可恢复 | 异地副本 + 校验脚本 | S1 |
| 老师→学员 XSS | 编辑富文本题 | 学员身份被接管 | DOMPurify + CSP | S0 |
| 统计 OOM | 单场答卷变多 | 数据页 500 | S0-1 + S2-2 | S0/S2 |
| 迁移链与 init 分叉 | 新环境按迁移建库 | 学员看不到「我的任务」 | 以 `PermissionEnum` 生成种子 | S3 |
| 多租户预留缺失 | 决定做 SaaS | 改造从 2 周变 2 个月 | §5.2 八条 | S1–S3 |

---

## 8. 附录：关键文件索引

| 关注点 | 文件 |
|---|---|
| 权限目录 | `server/shared/.../constant/PermissionEnum.java` |
| 数据权限切面 | `server/shared/.../aop/DataPermAspect.java` |
| 缓存配置 | `server/shared/.../config/CacheConfig.java` |
| 安全配置 | `server/shared/.../config/WebSecurityConfig.java` |
| 答卷实现 | `server/rdbms/.../impl/AnswerServiceImpl.java` |
| 项目/答题实现 | `server/rdbms/.../impl/SurveyServiceImpl.java` |
| 初始化脚本 | `server/rdbms/src/main/resources/scripts/init-mysql.sql` |
| 增量迁移 | `scripts/nas/migrate/` |
| 生产编排 | `deploy/nas/live/docker-compose.yml` |
| 发布脚本 | `scripts/nas/Deploy-Nas.ps1`、`scripts/nas/live-reload.sh` |
| 前端路由 | `client/src/router.tsx` |
| 前端请求层 | `client/src/api/request.ts` |
| 权限判定 | `client/src/auth/permissions.ts` |

---

## 9. 维护约定

- 每完成一条，在表格里把编号标记为完成，并在 `docs/modules/*.md` 对应模块页更新「验证」小节；
- 阶段目标变化（例如决定做多租户）时，先改 §5，再改 §4；
- 新增条目沿用编号规则，不复用已删除的编号。
