# 代码质量与技术债审计

> 审计时间：2026-11-06
> 范围：`client/`、`server/`、`scripts/`、`docs/`
> 方式：**只读**。用 grep / 结构统计 / 依赖对照 / 现有测试脚本复跑，未修改任何源码，未重启服务。
> 规模基线：后端 404 个 `.java`（不含 build 产物）、34 个 `@Service`；前端 94 个 `.ts/.tsx`。
> 所有数字都可以用文末「复现命令」重新验证。

## 0. 结论摘要

1. **没有大面积烂代码**，但有几类明确的「历史包袱」：两个没人依赖的 Gradle 模块（`flow`/`exam`）、40 个一次性改造脚本、6 份重复的 `useIsMobile`。
2. **最该警惕的是「同一套逻辑两份实现」**：评分判定在前端有 `ExamResult` 和 `BookPractice` 两套（`textMatches` 各写一份），后端评分又有一套 `AnswerScoreEvaluator`；三处只要有一处口径不同，学员看到的分、错题本判的分、导出成绩就会互相矛盾。
3. **测试几乎为零**：后端 0 个测试类；前端只有 2 个纯逻辑脚本（树操作、规则引擎）+ 1 个登录冒烟。评分、权限解析、加密迁移这些「错了就出事故」的逻辑全部裸奔。
4. **文档已经开始漂移**：`docs/permissions.md` 写「56 个权限点 / 老师 30 / 学员 5」，实际权限目录已有 81 项、老师 36 项、管理员 83 项。
5. 交付速度的历史代价集中在 `scripts/dev/`：64 个文件里 40 个是 `patch-*.cjs`，都是一次性改代码的脚本，现在既跑不了也没意义。
6. 工程底线是好的：`tsconfig` 开了 `strict` + `noUnusedLocals` + `noUnusedParameters`，`tsc --noEmit` 目前 0 报错。没开 lint 是缺口，但不是紧迫问题。

---

## 1. 死代码

### 1.1 真死：全仓零引用（7 个）

| 符号 | 位置 | 说明 |
|---|---|---|
| `getProject` | `client/src/api/index.ts` | 无人调用，页面都走 `getProject` 以外的路径 |
| `clearAuthorities` | `client/src/auth/permissions.ts` | 只在设计上该在退出登录时调用，实际没接 |
| `nextOptionValue` | `client/src/designer/defaults.ts` | 选项编号生成的旧方案 |
| `setLocale` | `client/src/i18n/index.ts` | 目前没有语言切换入口 |
| `registeredTypes` | `client/src/renderer/registry.ts` | 调试用导出，无人使用 |
| `indexQuestions` | `client/src/schema/flatten.ts` | 被 `flattenSchema` 取代 |
| `blueprintTheme` | `client/src/theme.ts` | 旧入口，注释里也写了「保留给还没接 buildTheme 的地方」，实际已全部接入 |

### 1.2 过度导出：只在定义文件内部使用（10 个）

导出但外部零引用，纯属把内部实现暴露成 API：
`ZoomControl.tsx` 的 `ZOOM_PRESETS / ZOOM_MIN / ZOOM_MAX / snapZoom`、`PublicAnswer.tsx::pickQuestionNode`、`Book.tsx::bookQueryString`、`flatten.ts::findPath`、`answers.ts::matrixCell`、`data/format.ts::flattenText`（同文件内 8 处用到）、`api/request.ts::PaginationResponse`。

> 处理建议：降级为不导出即可，不急着删（删了反而可能踩到未来用法）。

### 1.3 类型层面的死定义

`schema/types.ts` 里 `VOID_TYPES`、`EXAM_TYPES` 全仓零引用；`DataType / SchemaMode / ExamScoreMode / LinkType / ExpressionMessage / LinkField / LinkSurvey` 等类型也没有被消费。属于「照着后端 DTO 抄了一遍但从没用到」，留着会误导后来者以为这些常量在生效。

### 1.4 后端：两个死模块（重要）

`settings.gradle` include 了 6 个模块，但：

| 模块 | 是否被依赖 | 结论 |
|---|---|---|
| `shared` | 被 api/rdbms/ai/flow 依赖 | 正常 |
| `rdbms` | 被 api/flow 依赖 | 正常 |
| `ai` | 被 api 依赖 | 正常 |
| **`flow`** | **无任何模块依赖**（api 0 处、rdbms 0 处引用 `cn.surveyking.server.flow`） | 死模块，且带 Flowable 全家桶依赖 |
| **`exam`** | **无任何模块依赖、0 处引用** | 死模块 |

`flow` 会拉入 `flowable-spring-boot-starter:6.7.0` 并剔除一堆 cmmn/dmn/form/idm 依赖，构建时间与依赖体积都是白付的。同时它是本仓 TODO 最多的模块（6/29 条），因为根本没人用。

### 1.5 任务点名的两项已不存在

`PublicQuestionView`、`progressiveDelivery` —— 全仓 grep **0 命中**，属于已清理完的历史遗留，不计入本次技术债。

---

## 2. 重复实现

### 2.1 最危险：评分判定有两套（前端）+ 一套（后端）

| 位置 | 作用 | 风险 |
|---|---|---|
| `pages/answer/ExamResult.tsx::textMatches` | 成绩单页判对错（全等/包含、去空白、忽略大小写） | 学员看到的分数 |
| `pages/repo/BookPractice.tsx::textMatches` | 错题本练完判对错 | 练习统计 |
| 后端 `AnswerScoreEvaluator` | 正式打分 | 落库分数 / 导出 |

三套口径只要有一处不同（比如换行分隔的多答案、`examMatchRule` 的 `contain` 语义），就会出现「卷面 60 分、成绩单显示 58 分」这类投诉。**建议抽成一个共享判定模块，前端两处共用，并与后端 `AnswerScoreEvaluator` 的用例对齐。**

### 2.2 `useIsMobile` 复制了 6 份

`layout/BasicLayout.tsx`、`pages/exercise/List.tsx`、`pages/project/List.tsx`、`pages/repo/List.tsx`、`pages/survey/Data.tsx`、`pages/system/User.tsx` 各定义一份，断点常量都是 `(max-width: 767.98px)`。以后想改断点要改 6 个地方，漏一个就是响应式 bug。

### 2.3 其它同名重复

- `downloadWithPassword`：`repo/Questions.tsx` 与 `survey/Data.tsx` 各一份
- `pickedOptionIds`：`PublicAnswer.tsx` 与 `BookPractice.tsx`
- `matrixText`：`survey/data/format.ts` 与 `renderer/questions/answers.ts`（同名不同实现，更危险）
- `normalizeMode`：`Watermark.tsx` 与 `system/Setting.tsx`（水印模式归一化）

### 2.4 部门递归：新老两套并存

| 实现 | 方式 | 状态 |
|---|---|---|
| `UserDeptScopeService.DEPT_SCOPE_SQL` | 一条 `WITH RECURSIVE dept_anc` | 新方案，题库/项目可见性已收敛到它 |
| `UserServiceImpl.getTreeDeptId` | 逐层 `selectList(... parentId ...)` 递归 | 老方案仍在用（`selectUsers` 按部门筛选） |

**历史问题「CTE 曾有 5 份拷贝」已基本收敛为 1 份**（全仓 `WITH RECURSIVE` 现在只有 1 处），但老的内存递归没删，同一个语义两种实现，遇到深部门树会出现 `selectUsers` 慢而可见性判断快的不一致。

---

## 3. 超长文件与函数

### 3.1 文件 >500 行（top 10）

| 行数 | 文件 | 是否该拆 |
|---|---|---|
| 1549 | `server/rdbms/.../SurveyServiceImpl.java` | 该拆：公开答题、答卷保存、成绩、统计混在一起 |
| 1424 | `client/src/pages/answer/PublicAnswer.tsx` | 该拆：答题状态机 + 提交 + 结果页 + 解析卡片 |
| 1023 | `server/rdbms/.../UserServiceImpl.java` | 该拆：用户 CRUD + 注册 + 导入 + 部门范围 |
| 915 | `server/rdbms/.../AnswerServiceImpl.java` | 可拆：保存/打分/导入/回收站 |
| 909 | `server/rdbms/.../RepoServiceImpl.java` | 可拆：题库 + 题目 + 错题本混在一起 |
| 835 | `client/src/pages/repo/Questions.tsx` | 可拆：列表 + 编辑弹窗 + 批量导入 |
| 826 | `client/src/pages/survey/Editor.tsx` | 可拆：大纲 + 画布 + 属性面板 |
| 788 | `server/shared/.../SchemaHelper.java` | 工具类，尚可接受 |
| 780 | `server/rdbms/.../OAuthServiceImpl.java` | 死功能（第三方登录未启用），可整块下架 |
| 765 | `client/src/pages/repo/BookPractice.tsx` | 可拆：拉题 + 作答 + 判分 + 结果页 |

### 3.2 Java 方法 ≥80 行（5 个）

| 行数 | 方法 |
|---|---|
| 121 | `FileServiceImpl.upload` |
| 118 | `SurveyServiceImpl.loadProject` |
| 108 | `SystemServiceImpl.mergeSysInfo`（纯字段合并，可用反射/Builders 收敛） |
| 90 | `RepoServiceImpl.updateUserBook` |
| 87 | `UserServiceImpl.importUser` |

### 3.3 前端组件体 ≥200 行（6 个）

`system/Setting.tsx` 454、`system/Permissions.tsx` 453（**本次审计方自己写的，一并计入**）、`project/BatchSettingModal.tsx` 367、`components/LoginCaptcha.tsx` 317、`answer/PublicQuery.tsx` 313、`project/ComposeModal.tsx` 293、`repo/GrantModal.tsx` 269、`layout/BasicLayout.tsx` 267。

共同问题：**状态、请求、渲染全塞在一个组件里**，没有把「数据加载」抽成 hook。拆的时候优先抽 hooks（`useXxxQuery`），比拆 UI 组件收益大。

---

## 4. 注释与文档

### 4.1 真 TODO / FIXME（4 条，排除无人使用的 flow 模块）

| 位置 | 内容 |
|---|---|
| `client/src/pages/repo/Questions.tsx:574` | 标签筛选暂时隐藏（`/api/template/list` 的 tag 过滤走 `t_tag` 表，语义不匹配） |
| `server/rdbms/.../SurveyServiceImpl.java:635` | `// 显示排名 TODO:显示排行榜` —— 排名只取 `answerView.getRank()`，排行榜页面不存在 |
| `server/rdbms/.../FileServiceImpl.java:582` | `// FIXME: 在线预览 mp4 文件会报错，但不影响使用` |
| `client/src/pages/Home.tsx`（4 处） | i18n key 命名遗留 `pages.home.todo.tab.*`，`todo` 是「待办」的早期命名，现在语义是「我的任务」，容易误导 |

### 4.2 注释/文案与实现不符（3 处硬证据）

1. **`docs/permissions.md` 数字全错**：文档写「56 个权限串 / 老师 30 / 学员 5」，实际是 `PermissionEnum` **81 项**、`t_role` 里 admin **83**、teacher **36**、student **5**。文档还写「56 个已有 + 17 个建议新增」。
2. **`client/src/pages/project/List.tsx:585` 的用户可见文案**：「删除后可在回收站找回（本页暂未接入回收站）」——但 `/project/trash` 路由和 `pages/project/Trash.tsx` 都在，接口 `/api/project/trash` 也有。这句话现在等于骗用户。
3. **`theme.ts` 的 `blueprintTheme` 注释**：「保留给还没接 buildTheme 的地方」——实际已全量接入 `buildTheme`，属于「注释描述了一个不存在的原因」。

### 4.3 数据库里还有一条脏数据（非代码，但属技术债）

`t_role` 有一条 `code=a123 / name=1 / authority=NULL` 的测试角色。会导致「角色列表」出现无意义项、权限矩阵多一列。

---

## 5. 构建与工程

| 项 | 现状 | 判定 |
|---|---|---|
| 死模块 | `flow`（Flowable 全家桶）、`exam` 无人依赖 | **该删或至少从 `settings.gradle` 摘掉** |
| 后端依赖 | api：shared/rdbms/ai；rdbms：shared；ai：shared | 无环、无重复，正常 |
| 前端依赖 | `crypto-js / jsencrypt / qrcode / dayjs / @dnd-kit/*` 均有实际引用 | 无未使用依赖 |
| 依赖归类错误 | `@types/crypto-js` 放在 `dependencies`（类型包应进 `devDependencies`） | 小问题 |
| 依赖版本 | `@types/node ^26.6.6`（Node 22 环境）偏高，但只影响类型 | 可忽略 |
| tsconfig | `strict` + `noUnusedLocals` + `noUnusedParameters` + `noFallthroughCasesInSwitch` | **好**，这是本仓最扎实的一环 |
| Lint | 无 `.eslintrc`、无 prettier 配置、`package.json` 无 `lint` 脚本 | 缺口：格式/未使用变量以外的问题没人管 |
| 脚本仓库 | `scripts/dev/` 64 个文件里 **40 个 `patch-*.cjs`** | 历史包袱，见 5.1 |

### 5.1 `scripts/dev` 的 40 个 `patch-*.cjs`

这些是一次性「改代码」脚本（例如 `patch-page-zoom.cjs`、`patch-home-permissions.cjs`、`patch-register-phone.cjs`），作用是当年用脚本批量改前端源码。**它们现在既不能重跑（目标代码早变了），也不构成文档**，反而让 `scripts/dev` 目录失去可读性——真正有用的只有 `start-*.ps1` 和少数 `import-*.cjs`、`test-*.cjs`。

---

## 6. 测试

### 6.1 现状

| 资产 | 覆盖内容 |
|---|---|
| `client/scripts/test-tree.ts`（9 断言） | 大纲树：插入、同级重排、扁平化顺序、depth、parentId、组内重排、删除级联、改属性 |
| `client/scripts/test-rules.ts`（27 断言） | 规则引擎：空条件、JSON 字符串、坏 JSON 容错等 |
| `client/scripts/smoke-login.cjs` | 登录冒烟（需要服务在跑） |
| 后端 | **0 个测试类**（`*Test.java` 计数为 0） |

### 6.2 高风险但零覆盖

1. **评分**：`AnswerScoreEvaluator`（onlyOne / selectAll 等模式）、`examMatchRule` 的 `contain` 语义、多空填空部分得分——一行测试都没有，而我方前端又复制了一份判定逻辑（见 2.1）。
2. **权限解析**：`can()` 的「精确 or `域:*`」规则、用户组祖先继承、`collaboratorAuthority` 过滤——这些改动最近才做，全靠手测。
3. **加密迁移**：`CryptoMigrationService` 要遍历 1.1 万行做 AES 加密，`encryptAll()` 没有幂等测试，密钥丢失即数据不可读。
4. **导入脚本**：`import-repos.cjs` / `import-batch.cjs` 直接写库，无 dry-run。
5. **数据库初始化**：`init-mysql.sql` 与 `scripts/dev/*.sql` 的增量补丁（`add-audit-log.sql` 等）没有版本顺序保证。

---

## 7. 日志

全仓 `log.*` 共 **41 处**：`info 5 / warn 11 / error 20 / debug 4 / trace 1`。

| 问题 | 证据 |
|---|---|
| **error 级滥用** | `GlobalExceptionHandler` 把参数校验、类型不匹配、**权限拒绝**都打成 `log.error`（第 45/53/61/69/76 行）。这些是客户端错误，打 error 会让真正的故障淹没在日志里 |
| info 打业务细节且无上下文 | `SurveyServiceImpl:1151` `log.info("user is empty")`、`:1186` `log.info("ip is empty")` —— 没有 projectId/userId，排查时等于噪音 |
| **不带堆栈** | `log.error` 共 20 处，其中只有 **2 处**把异常对象作为最后一个参数传入；其它多用 `e.getMessage()`，堆栈直接丢失（如 `RandomSurveyProcessor:207`） |
| **printStackTrace 12 处** | 集中在 `AnswerServiceImpl`（343/350/358/584）、`DatabaseInitHelper:221` 等，绕过日志框架，输出不可控、无级别、无上下文 |
| 中英混用 | error 文案有的中文（「未找到对应的文件」）有的英文（`Failed to parse response`），不利于日志检索 |

**建议规范**：接口层错误统一 `warn`；`error` 只在「需要人介入」时打且必须带异常对象；`printStackTrace` 全量替换；日志至少带 `userId + 业务主键`。

---

## 8. 建议优先处理的 10 项（按 收益/成本 排序）

| # | 事项 | 收益 | 成本 | 说明 |
|---|---|---|---|---|
| 1 | **合并评分判定逻辑**（前端两处 `textMatches` → 一个模块，并与后端 `AnswerScoreEvaluator` 对齐用例） | 高（直接关系分数正确性/投诉） | 低（半天） | 这是唯一「已存在分歧风险且用户能感知」的问题 |
| 2 | **加强后端测试最小闭环**：评分、`can()` 权限、部门祖先继承各 10 个用例 | 高 | 中（1～2 天） | 后端 0 测试是最大盲区 |
| 3 | **从 `settings.gradle` 摘掉 `flow` / `exam`** | 中（构建时间、依赖体积、误读） | 极低（10 分钟） | 先摘 include，确认 `gradlew build` 通过即可 |
| 4 | **归档 `scripts/dev` 的 40 个 `patch-*.cjs`**（移到 `scripts/archive/` 或直接删） | 中（可读性） | 极低 | 已不可重跑，纯噪音 |
| 5 | **修 `docs/permissions.md` 的过期数字**，并把「权限点清单」指向 `PermissionEnum` 作为唯一事实来源 | 中 | 极低 | 文档错会直接误导后面的权限改造 |
| 6 | **抽 `useIsMobile` 共享 hook**（6 → 1） | 中（响应式一致性） | 低（1 小时） | 顺带把断点常量集中 |
| 7 | **日志规范化**：`GlobalExceptionHandler` 降级为 warn、`printStackTrace` 全部替换、error 带异常对象 | 中（可运维性） | 低（半天） | 出故障时能省大量时间 |
| 8 | **删掉 `UserServiceImpl.getTreeDeptId`，统一走 `DEPT_SCOPE_SQL`** | 中 | 中（要回归按部门筛选用户） | 消除同语义双实现 |
| 9 | **拆 `PublicAnswer.tsx`（1424 行）**：抽 `useAnswerSession`（加载/暂存/提交/标记）+ 渲染层分离 | 中高（后续改动频繁） | 高（1～2 天，易回归） | 建议等答题流程稳定后再动 |
| 10 | **补 lint**（eslint + prettier + `npm run lint` 进 CI） | 低中 | 中（首跑会报一批） | 现在靠 `tsc` 兜底，够用但不覆盖格式/坏味道 |

### 不建议现在做的

- **大规模拆 `SurveyServiceImpl` / `UserServiceImpl`**：收益真实但成本高、回归面大，等有集成测试兜底再动（对应第 2 项）。
- **清 `OAuthServiceImpl`（780 行）**：第三方登录未启用，但它不影响运行，删之前要先确认产品上确实不做。

---

## 附：复现命令

```powershell
# 超长文件
Get-ChildItem client\src,server -Recurse -Include *.ts,*.tsx,*.java -File |
  Where-Object { $_.FullName -notmatch '\\build\\|node_modules|\\dist\\' } |
  ForEach-Object { [PSCustomObject]@{ Lines=(Get-Content $_|Measure-Object -Line).Lines; Path=$_ } } |
  Sort-Object Lines -Descending | Select-Object -First 15

# 死模块
Select-String -Path server\*\build.gradle -Pattern "project\(':"
Get-ChildItem server\api\src,server\rdbms\src -Recurse -Include *.java | Select-String "surveyking.server.flow"

# CTE / 部门递归
Get-ChildItem server -Recurse -Include *.java | Select-String "WITH RECURSIVE|getTreeDeptId"

# 日志
Get-ChildItem server -Recurse -Include *.java | Select-String "log\.(info|warn|error|debug|trace)\(|printStackTrace"

# 权限数字漂移
mysql -uroot -p surveyking -e "select code,length(authority)-length(replace(authority,',',''))+1 from t_role;"
```
