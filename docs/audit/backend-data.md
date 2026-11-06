# 后端数据一致性与工程可靠性审计

> 审计时间：2026-11-06 20:3x
> 范围：`server/rdbms/**`（service impl / mapper / model / core.mybatis），必要时上溯到 `server/shared` 的缓存与 AOP 配置、`init-mysql.sql` 的索引定义
> 方式：**只读**。全部结论来自 `grep` + 逐文件阅读 + schema 定义；未改任何源码、未重启服务、未做 git 操作。
> 基线：当前工作区（含未提交改动）`AnswerServiceImpl.java` 977 行、`SurveyServiceImpl.java` 1655 行、`init-mysql.sql` 34KB。
> 每条都带 `文件:行`，文末附可复跑的 grep 命令；标「需手工验证」的条目是基于代码路径的推演，不是实测。

## 0. 结论摘要

1. **最严重的一类问题是「软删除 + 手写 SQL 漏 `is_deleted`」**：`t_project_partner` 和 `t_repo_partner` 被撤销后，行只是 `is_deleted=1`，但**权限判定用的手写 SQL 根本不过滤它** → 被移除的协作者仍然能看到、能改、能永久删除该项目。这不是缓存脏读，是权限源头就是错的。
2. **权限有三套口径**：`listProject` 认「直接成员 ∪ 组授权 ∪ type(1,2,3)」，授权闸门 `DataPermAspect` 走的 `getProjectPerms` 只认「直接成员 + type(1,2)」，而组授权写入的是 type=3（答卷人）。现状靠「组=答卷人」的约定没炸，但任何一处调整都会变成「列表可见、点开 403」（P1-11）。
3. **`@Async` + `MODE_INHERITABLETHREADLOCAL` + 朴素线程池**：错题本写入跑在池化线程上，线程里继承的是**创建该线程那个请求**的 SecurityContext，`create_by` 由 `MyMetaObjectHandler` 从该上下文取 → 错题可能记到别人名下；且它在主事务内被触发，主事务回滚了错题照样落库。
4. **最长/最短交卷依然没有真正生效**：服务端新加的 `assertWithinTimeLimit` 以「答卷 create_at」为起点，但答卷行是在**首次提交时**才创建的 → 首次提交永远 `previousAnswer == null` 直接放行，计时起点 = 提交时刻。
5. **重复提交依旧能产生两条答卷**：新建分支每次 `UUID.randomUUID()`，没有幂等键也没有 `(project_id, create_by)` 唯一约束；网络重试/双击就是两份。
6. **分数可被「客户端自带的 survey」间接影响**：`Answer.survey` 直接由请求体映射并落库，`computeExamScore` 在「更新已有答卷」时优先用 `existAnswer.getSurvey()` → 先交一份伪造 schema 的答卷，再改答案，判分就按伪造 schema 算。
7. 性能侧最疼的是**列表接口的 N+1**（`listProject` / `listRepo` / `listProjectPartner` / `queryTask` / `listAnswer`）和**提交路径上全量拉统计**（配额校验每次都 `statProject` 拉全部答卷）。
8. 工程底线不差：所有 service impl 都有类级 `@Transactional`；缓存失效在部门/角色/成员/文件这几处都做了 afterCommit 清理（详见 §3.2「已经做对的」）。真正的缺口是「缺 `rollbackFor` + `@SneakyThrows` 抛受检异常」这条组合。

## 1. P0（高危：越权 / 数据错乱）

### P0-1 撤销项目/题库成员后，权限仍然有效（软删除 + 手写 SQL 漏 `is_deleted`）

**证据链（项目）**

1. 删除成员是**软删除**：`ProjectPartnerServiceImpl.java:170-173`
   ```java
   if (!partners.isEmpty()) {
       removeByIds(partners.stream().map(ProjectPartner::getId).collect(Collectors.toList()));  // 逻辑删除 is_deleted=1
   }
   ```
2. 但权限判定用的 SQL **没有 `is_deleted` 条件**：`ProjectPartnerMapper.java:14`
   ```java
   @Select("select distinct project_id from t_project_partner where user_id = #{userId} and type in (1, 2)")
   List<String> getProjectPerms(String userId);
   ```
3. 这个 SQL 是所有项目/答卷接口的授权闸门：`DataPermAspect.java:57-60`
   ```java
   List<String> projectPerms = projectPartnerService.getProjectPerms();
   if (!projectPerms.contains(value)) { throw new InternalServerError("没有权限访问本问卷"); }
   ```
   `@EnableDataPerm` 覆盖了 `ProjectApi`（62/74/96/107/119/130/142/154/165）与 `AnswerApi`（39/51/75/127）、`ReportApi`（26）。
4. 列表可见性同样漏：`ProjectServiceImpl.java:67-70`
   ```java
   .exists("SELECT 1 FROM t_project_partner t WHERE t.project_id = t_project.id"
        + " AND (t.user_id = {0} OR (t.group_id IS NOT NULL AND t.group_id IN (" + DEPT_SCOPE_SQL + ")))"
        + " AND t.type IN (1, 2, 3)", ...)
   ```
   MyBatis-Plus 只会给**主表**（`t_project`）自动拼 `is_deleted=0`，裸写在 `exists(...)` 里的 `t_project_partner` 不会被加。

**题库同样一份**：删除是软删（`RepoPartnerServiceImpl.java:106-111` 用 `remove(...)`），可见性查询不过滤（`RepoServiceImpl.java:74-77`）。

**影响**：被移出协作的人刷新页面后仍能看到该项目/题库、打开答卷、导出数据、甚至调用 `/api/project/destroy` 永久删库（`ProjectServiceImpl.java:215-228` 的 `assertProjectIdsPermitted` 也读这份带脏数据的 `getProjectPerms`）。**撤权等于没撤**。

**修复建议**
- 立刻：`ProjectPartnerMapper.java:14`、`ProjectServiceImpl.java:67-70`、`RepoServiceImpl.java:74-77` 全部补 `AND t.is_deleted = 0`（或 `t_project_partner.is_deleted = 0`）。
- 根治：不要让权限 SQL 散落在字符串里。把「某用户对某项目的权限」收敛成一个带 MyBatis-Plus `Wrapper` 的方法（逻辑删除自动生效），`DataPermAspect` 与列表查询共用它；`getProjectPerms` 这类 `@Select` 要么补条件，要么改成 `selectList(Wrappers...)`。
- 加一条防回归：给 `t_project_partner` 建 `KEY idx_partner_user (user_id, type, is_deleted)` 并在 CI 里跑一条「撤销后不可见」的集成测试。

**验证方法**：A 把 B 加为协作者 → B 能打开项目 → A 移除 B → B 刷新列表：按现有代码 B 仍能看到（因为 `getProjectPerms` 还会返回该项目）。

---

### P0-2 `@Async` 错题写入：可能记到别人名下；主事务回滚也照写

**证据**
1. 错题收集是异步方法：`UserBookServiceImpl.java:74-76`（`@Async public void saveWrongQuestion(...)`），内部 `saveBatch` / `updateBatchById`（`:136`、`:109`）。
2. 异步线程池是朴素实现，没有包装 SecurityContext：`AppConfig.java:48-56`（`ThreadPoolTaskExecutor`，仅设 core/max/prefix）。
3. SecurityContext 用的是**可继承**的 ThreadLocal：`WebSecurityConfig.java:57`
   ```java
   SecurityContextHolder.setStrategyName(SecurityContextHolder.MODE_INHERITABLETHREADLOCAL);
   ```
   `InheritableThreadLocal` 只在**线程创建时**复制一次；线程池线程会被复用 → 复用的线程带着「创建它的那个请求」的认证信息。
4. 异步方法里两次读当前用户：`UserBookServiceImpl.java:80-83`（`isAuthenticated()` / `getUserId()`），落库时 `create_by` 又由 `MyMetaObjectHandler.java:18-21` 从同一上下文取。
5. 触发点在主事务里：`SurveyServiceImpl.java:352`（`@Transactional(rollbackFor = Exception.class)` 的 `saveAnswer`）→ `:414-416` 调 `userBookService.saveWrongQuestion(...)`。

**影响**
- 错题本可能**写到别的用户名下**（池化线程继承了前一个请求的身份），或者因为继承到匿名上下文而**整批跳过**（`:80-82` 直接 return）。
- `@Async` 在独立线程/独立事务里跑：主事务回滚（例如后面 `updateProjectPartnerByAnswer` 抛异常）时错题**已经落库**；反之异步写失败也没有任何回传，用户无感知。
- 同一线程池的 `create_by` 填充（`MyMetaObjectHandler:20`）会让**任何**异步插入都带错身份，不只是错题。

**修复建议**
- 显式传递身份：调用处把 `userId` 作为参数传入（`saveWrongQuestion(..., String userId)`），异步方法内部不读 `SecurityContextHolder`；`create_by` 需要显式 `setCreateBy(userId)`（`strictInsertFill` 只在字段为 null 时生效，所以显式赋值优先）。
- 用 `TaskDecorator` 把 `SecurityContext` 显式复制并在 `finally` 清空（`DelegatingSecurityContextAsyncTaskExecutor`），杜绝池化复用串号。
- 业务上更稳的做法：用 `TransactionSynchronization.afterCommit` 注册「提交成功后再异步收错题」，避免「回滚了还记错题」。
- 附带：`@Async` 方法若被同类内部调用（`UserBookServiceImpl.java:58-60` 的旧重载调用新重载）会绕过代理，调用链语义容易误判，建议拆到独立组件。

---

### P0-3 客户端自带的 `survey` 会影响后续判分

**证据**
1. 请求体直接映射成实体字段：`AnswerViewMapper.java:14`（MapStruct 自动同名映射，未 `@Mapping(ignore)`），`AnswerRequest.survey` → `Answer.survey`，`Answer.java` 里 `survey` 是持久化字段（`@TableField(typeHandler = JacksonTypeHandler...)`）。
2. 保存时优先用请求里的 survey：`AnswerServiceImpl.java:769-771`
   ```java
   SurveySchema answerSurvey = answer.getSurvey() != null ? answer.getSurvey()
           : previousAnswer != null && previousAnswer.getSurvey() != null ? previousAnswer.getSurvey()
                   : project.getSurvey();
   ```
3. 判分时优先用**已入库**的那份 survey：`AnswerServiceImpl.java:843-850`
   ```java
   SurveySchema srcSchema = project.getSurvey();
   if (answer.getId() != null) {
       Answer existAnswer = getById(answer.getId());
       if (existAnswer != null && existAnswer.getSurvey() != null) { srcSchema = existAnswer.getSurvey(); }
   }
   AnswerScoreEvaluator evaluator = new AnswerScoreEvaluator(srcSchema, answer.getAnswer());
   ```

**影响**：第一次提交时自造一份 `survey`（把 `examCorrectAnswer` 改成自己的答案，或把题目分值调高）→ 落库成为该答卷的快照 → 第二次提交（开了「允许修改答案」或带 `tempSave:0`）判分就用这份伪造 schema，**可以刷满分**。随机卷场景必须用快照判分，所以不能简单删掉这个字段。

**修复建议**
- 服务端只信任服务端生成/存档的 schema：新建答卷时 `answer.setSurvey(...)` 用 `project.getSurvey()`（或随机卷时由 `RandomSurveyProcessor` 生成的那份），**忽略请求里的 survey**；前端上传的 survey 只用于兼容旧客户端时校验、不入库、不参与判分。
- 若必须保留「客户端上报快照」的能力（旧前端），加一个服务端签名/哈希：随答卷存 `surveyHash`，提交时校验快照未被篡改。
- 补一条集成测试：提交伪造 `examCorrectAnswer` 的 survey，断言得分不变。

---

### P0-4 重复提交无幂等；首次提交不受最长/最短交卷约束

**证据（重复提交）**
- 新答卷每次生成新 id，无去重：`AnswerServiceImpl.java:225-238`
  ```java
  if (StringUtils.hasText(request.getId())) { return updateAnswer(request); }
  Answer answer = answerViewMapper.fromRequest(request);
  answer.setId(UUID.randomUUID().toString());   // 每次都是新主键
  ```
- 表上没有 `(project_id, create_by)` 之类的唯一约束：`init-mysql.sql:39-58`（`t_answer` 只有 PK 和 `key_answer_pid(project_id)`）。
- 提交入口只做了「有 id 才校验归属」：`SurveyServiceImpl.java:365-398`。

**证据（时长限制失效）**
- 起点取答卷行：`AnswerServiceImpl.java:786-794`
  ```java
  Integer maxMinutes = ...; if (previousAnswer == null || previousAnswer.getCreateAt() == null) { return; }  // 没有上一份就直接放行
  long startAt = previousAnswer.getCreateAt().getTime();
  ```
- 但首次提交时 `previousAnswer` 必然是 null：`AnswerServiceImpl.java:231-236` 先 `setId(UUID)` 再进 `beforeSaveAnswer`，而 `beforeSaveAnswer:767` 用这个新 id `getById(...)` → 查不到。
- 普通问卷的答卷行**只在提交时创建**（`SurveyServiceImpl.tempSaveAnswer` 只在随机卷 cookie + 已登录时才更新已有草稿）。

**影响**
1. 双击/超时重试 → 两条答卷，`maxAnswers` 被白吃一个名额，统计、排名、导出全部重复。
2. `maxSubmitMinutes` 只对「第 2 次及以后的保存」生效（且起点是首次提交时间）→ 真实答题时长仍然只靠前端倒计时；`minSubmitMinutes` 同理（首次提交永远不拦）。随机卷因为 `RandomSurveyProcessor.saveRandomSchemaToAnswer` 在**打开时**就建了答卷行，限制才真正生效。

**修复建议**
- 幂等：前端生成 `requestId`/`clientToken` 随提交带上，服务端建 `t_answer_client_token` 唯一键，重复提交直接返回首次结果；最低成本方案是加 `(project_id, create_by, survey_hash)` 唯一索引 + 捕获 `DuplicateKeyException`。
- 时长：不要依赖答卷行。`loadProject`（或首次取题）时签发 `answerStartAt`/deadline（服务端写进答卷草稿或签名 cookie），提交时用**服务端时钟**裁决；`previousAnswer == null` 分支必须也有起点，否则限制等于没有。
- 顺带：`tempSave:0` 可以绕过「提交后不可修改」（`SurveyServiceImpl.java:377-382`），这条建议在同一个 PR 里一起收紧。

---

### P0-5 上限/唯一值/配额都是「先查后写」，并发下可穿透

| 校验 | 位置 | 竞态 |
|---|---|---|
| 回收上限 `maxAnswers` | `SurveyServiceImpl.java:872-881`（`count() >= maxAnswers` 再 insert） | 两个请求同时读到 `n-1`，都通过 → 超收 |
| 选项唯一 `unique` | `SurveyServiceImpl.java:942-967`（`count(valueQuery) > 0` 再 insert） | 两个相同答案同时提交 → 两条都进 |
| 选项配额 `quota` | `SurveyServiceImpl.java:970-996`（拉全量统计后比较） | 同上，且见 P1-2 的性能问题 |

`t_answer` 没有任何唯一约束兜底（`init-mysql.sql:39-58`）。

**影响**：限流/限额类设置在高并发（或脚本并发）下失效；唯一值语义被破坏（同一手机号可提交两次）。

**修复建议**：把约束下沉到数据库（唯一索引/计数表 + `SELECT ... FOR UPDATE` 或原子 `UPDATE ... WHERE count < limit`）；至少给唯一值类校验加「插入后复核 + 冲突回滚」；配额建议单独建 `t_answer_option_count` 汇总表用原子自增。

---

## 2. P1（中危：一致性 / 性能 / 可维护性）

### P1-1 列表接口的 N+1（5 处，全部在分页回调里逐行查库）

| 位置 | 循环里做了什么 | 20 行/页的额外查询 |
|---|---|---|
| `ProjectServiceImpl.java:76-84` | 每个项目 `count(t_project by parent_id)` 或 `count(t_answer)` | +20 |
| `RepoServiceImpl.java:86-93` | 每个题库 `templateService.count` + `selectRepoTemplateTags` + `selectRepoQuestionTypes` | +60 |
| `ProjectPartnerServiceImpl.java:85-89` | 每个成员 `userService.loadUserById`（有缓存，未命中即查库） | 最多 +20 |
| `RepoPartnerServiceImpl.java:57-68` | 每行 `loadUserById` + `deptMapper.selectById` | 最多 +40 |
| `UserServiceImpl.java:997-1008` | 每个「我的任务」`projectMapper.selectById` | +20 |
| `AnswerServiceImpl.java:112-151` | 每条答卷按题型补附件/用户/部门：`fileService.listFiles(query)`（`:141`）、`deptService.listDept(null)`（`:145`，**在两层循环里反复调用**） | +N×2 |

**影响**：列表页 RT 随数据量线性增长；`listAnswer` 在导出时（`downloadSurvey` 会把 `pageSize` 设成 `Integer.MAX_VALUE`，`AnswerServiceImpl.java:326`）会放大成「全表 × 每题一次文件查询」。
**修复建议**：批量查（`in(ids)`）+ 内存分组；`deptService.listDept(null)` 提到循环外只调一次；项目/题库的计数改成 `group by` 一次查回。

### P1-2 每次提交都做一次「全量答卷统计」

**证据**：`SurveyServiceImpl.java:970-996` 的配额校验 → `:974` 调 `statProject`；`statProject`（`:342-348`）用 `pageSize = -1` 把**该问卷所有答卷**拉进内存再算（`:344-346`），并且 `listAnswer` 还带 P1-1 的 N+1。
**影响**：答卷上千后，每次提交都会触发一次全量扫描 + JSON 反序列化 + 附件查询，提交接口 RT 与内存双爆。
**修复建议**：配额用计数表/`group by` 聚合；`statProject` 改成 SQL 聚合或离线统计，不要 `-1` 全量。

### P1-3 分页没有上限，客户端可 `pageSize=-1` 拉全表

**证据**：`PageQuery.java:16-21`（`pageSize == -1` → `Integer.MAX_VALUE`）是所有 `*Query` 的父类，`pageSize` 由请求参数直接绑定；`MybatisPlugConfig.java:32` 的 `new PaginationInnerInterceptor()` **没有设 `maxLimit`**。
**影响**：任何列表接口（如 `/api/answer/list?pageSize=-1`）都能一次拉全表；配合 P1-1 的 N+1 形成内存/CPU 放大。匿名答题接口（`/api/public/*`）里用 `PageQuery` 的也要逐个确认。
**修复建议**：`PaginationInnerInterceptor` 设 `setMaxLimit(500)`；`PageQuery.getPageSize()` 对 `-1` 改成「仅服务端内部调用可用的显式开关」。

### P1-4 权限缓存：1 天 TTL + 100 条上限 + 组授权不失效

**证据**
- 缓存配置：`server/api/src/main/resources/application-dev.yml:16-23`（`projectPermissionCache: 1d`，pro 环境同 `application-pro.yml:12-19`）。
- 存储上限：`CacheConfig.java:57` `maximumSize(100)` —— 整个缓存最多 100 个用户键，教室里几十个用户就会频繁抖动。
- 组授权的增删**不清缓存**：`ProjectPartnerServiceImpl.java:100-114`（group 分支 `save(partner); return;` 提前返回，没走 `evictProjectPermissions`）；`evictProjectPermissions`（`:199-221`）只处理 `userId != null` 的直接成员。
**影响**：组授权/撤权后，成员最长 1 天内看不到或仍能看到项目（叠加 P0-1 的脏 SQL，撤权是永久无效）；100 条上限又把「TTL 内不再查库」的收益基本抵消。
**修复建议**：组授权变更时按 `resolveDeptScope` 反查成员 id 批量 evict（或直接 `cache.clear()`，数据量小）；`maximumSize` 提到 5000+；更稳的是把「项目权限」改成先查 `t_project_partner` 的短 TTL 缓存（30s）。

### P1-5 `synchronized(request.getId().intern())` 挡不住并发丢更新

**证据**：`ProjectServiceImpl.java:133-151`
```java
public void updateProject(ProjectRequest request) {
    synchronized (request.getId().intern()) {          // ① 锁的是 JVM 内字符串常量
        ProjectSetting setting = getById(request.getId()).getSetting();   // ② 读
        spelParser.parseExpression(request.getSettingKey()).setValue(setting, ...);  // ③ 改
        updateById(project);                            // ④ 写整份 setting
    }
}
```
**问题**：① 锁在方法返回时释放，而事务提交发生在**代理层返回之后** → 另一个线程可以在提交前读到旧值（读-改-写经典丢更新）；② `intern()` 把任意请求字符串塞进常量池，多实例部署时也完全无效；③ 整份 `setting` JSON 覆盖写，两个管理员同时改**不同**设置项会互相覆盖。
**修复建议**：单字段更新改成「读-改-写」在数据库里原子完成（JSON_SET 或拆列）；无法拆列时用 `@Version` 乐观锁重试；去掉 `intern()`，用 `ConcurrentHashMap` 弱引用锁或分布式锁。

### P1-6 `applyPassModePenalty` 读改写整行，分数/metaInfo 会被覆盖

**证据**：`SurveyServiceImpl.java:503-548`，尤其 `:535-547`
```java
Answer saved = answerService.getById(answerView.getId());
AnswerMetaInfo savedMeta = saved.getMetaInfo() == null ? new AnswerMetaInfo() : saved.getMetaInfo();
savedMeta.setPassModeTimes(...); savedMeta.setPassModeTimeouts(...);
saved.setMetaInfo(savedMeta);
if (exam) { saved.setExamScore(answerView.getExamScore()); saved.setExamInfo(answerView.getExamInfo()); }
answerService.updateById(saved);          // 整行覆盖，无版本号
```
**影响**：「限时自动交卷」与「手动交卷」并发时（前端确实会同时触发，`PublicAnswer.doSubmit('auto')` + 用户点提交），后写者会覆盖前者的 `examScore`/`examInfo`/`metaInfo`，出现「分数和答题卡对不上」。
**修复建议**：只更新必要列（`LambdaUpdateWrapper` 指定 `exam_score/exam_info/meta_info` + `@Version`），并对同一 answerId 的提交加串行化（数据库行锁 `SELECT ... FOR UPDATE` 或 Redis 锁）。

### P1-7 硬删项目不清理关联数据，参与者只做软删

**证据**：`ProjectServiceImpl.java:202-213`
```java
List<String> ids = assertProjectIdsPermitted(request.getIds());
getBaseMapper().batchDestroy(ids);            // ProjectMapper:22 物理 DELETE t_project
projectPartnerService.deleteAllProjectPartners(ids);  // 内部 removeByIds → 逻辑删除
```
**影响**：`t_answer` / `t_file` / `t_template` / `t_project_partner` 里的行全部成为孤儿（答卷还在、附件还在磁盘、统计仍能数到），永久占用空间且无法从 UI 访问；参与者行只是 `is_deleted=1`，配合 P0-1 的脏 SQL 还会**继续授予权限**（项目已不存在，但 `getProjectPerms` 仍返回该 id，`assertProjectIdsPermitted` 会通过 → 对不存在项目的操作一路走到空结果）。
**修复建议**：销毁时级联清理（或至少标记 `t_answer` 归属项目已销毁）；`deleteAllProjectPartners` 改成物理删除；把「项目已删除」纳入 `getProjectPerms` 的过滤。

### P1-8 成绩单用「当前 schema」渲染，和落库的 `exam_score` 可能不一致

**证据**：`SurveyServiceImpl.java:616-628`（`loadExamResult` 里 `result.setSchema(project.getSurvey())`），而分数是提交时按当时的 schema 算好存进 `t_answer.exam_score` 的（`AnswerServiceImpl.computeExamScore:840-857`）。`:645` 只在随机卷/带答案快照时改用快照。
**影响**：题目被编辑（改选项、改正确答案、删题）后，历史答卷的解析页用新 schema 重新判对错，与成绩单上的分数不一致；导出（`downloadSurvey`）用的是存储分数，两处对不上。
**修复建议**：非随机卷也保存作答时的 schema 快照（或至少保存 `examInfo.questionScore` 并只按它渲染对错），解析页与导出统一读快照。

### P1-9 `@Transactional` 全部缺 `rollbackFor` + `@SneakyThrows` 抛受检异常 → 半截写入不回滚

**证据**
- 类级注解都是默认回滚规则（只回滚 `RuntimeException`/`Error`）：`AnswerServiceImpl.java:54`、`SurveyServiceImpl.java:60`、`ProjectServiceImpl.java:43`、`TemplateServiceImpl.java:42`、`UserServiceImpl.java:71`、`FileServiceImpl.java:61`。
- 有写操作的方法用 `@SneakyThrows` 把受检异常原样抛出：`UserServiceImpl.java:787-788`（`importUser`）→ 文件流/Excel 解析（`:807-878`）会抛 `IOException`，而循环内已经在 `createUser(...)`（`:857`）。
**影响**：导入一万个用户，第 500 行 Excel 解析失败抛 `IOException` → Spring 认为「受检异常不回滚」→ **前 499 个用户留在库里**，再导一次全撞唯一键。`FileServiceImpl.upload`（`:213-238`）同理：物理文件已写、`save()` 之后如果抛受检异常，事务不回滚、靠 catch 里的补偿删除（补偿再失败就是孤儿文件）。
**修复建议**：全部改成 `@Transactional(rollbackFor = Exception.class)`（项目里 `DeptServiceImpl` 等已经这么写，口径应统一）；导入类操作建议「先全量校验再写」或分批独立事务。

### P1-10 提交后的白名单状态更新会 NPE 或 `selectOne` 多行异常

**证据**：`SurveyServiceImpl.java:1614-1648`
```java
ProjectPartner projectPartner = projectPartnerMapper.selectOne(queryWrapper);   // 没判 null
projectPartner.setStatus(AppConsts.ProjectPartnerStatus.ANSWERED);              // NPE
```
- 导入用户分支（`:1631`）用 `eq(ProjectPartner::getUserName, request.getWhitelistName())`，`whitelistName` 为 null 时该条件被忽略 → 查询退化成「该项目所有同类名单」→ `selectOne` 命中多行抛 `TooManyResultsException`（或错误更新某个人的状态）。
- 名单行被删过/用户名改过 → `selectOne` 返回 null → NPE。
**影响**：白名单项目提交直接 500（事务回滚，答案丢失），用户侧表现为「提交失败但已作答」；极端情况下把「已答」状态写到错误的名单行上。
**修复建议**：`whitelistName` 为空白时直接跳过或抛业务异常；`selectOne` 改成 `selectList` + 判空 + 只更新匹配到的那一行；找不到名单时记 warn 而不是 NPE。

### P1-11 权限口径三套并存：列表 SQL / 授权闸门 / 写入的成员类型

**证据**
- 列表可见性认组并包含 `type IN (1,2,3)`：`ProjectServiceImpl.java:67-70`。
- 授权闸门（`@EnableDataPerm` → `DataPermAspect.java:57-60`）只认 `ProjectPartnerMapper.java:14` 的 `user_id = ? AND type IN (1,2)`，**不含组授权**。
- 而组授权写库时用的是 `type = RESPONDENT_SYS_USER(3)`：`ProjectPartnerServiceImpl.java:107-111`，枚举定义 `ProjectPartnerTypeEnum.java:22`。
- 题库侧同样：可见性认组（`RepoServiceImpl.java:74-77`），练习权限只认直接成员（`RepoPartnerServiceImpl.java:127-131`）。

**影响**
- 现状靠「组 = 答卷人」的约定兜住了：学生从列表点「去答题」走公开页（没有 `@EnableDataPerm`），不触发闸门检查。但只要有人把组当协作者用、或把组分支的 `type` 改成 2，就会立刻表现为**列表里有、点详情/答卷接口 403**（`DataPermAspect` 抛 `InternalServerError`）。
- 三套口径（列表 SQL / 闸门 SQL / 写入的 type）任何一处调整都会造成静默不一致，且没有任何测试覆盖。

**修复建议**：收敛成「一个方法回答谁能看/改某个项目」，列表、闸门、`hasPracticePermission` 全部复用它；组授权要显式定义 type 语义（答卷人还是协作者）并写进注释与测试。

---

## 3. P2（低危 / 代码卫生）与「已正确处理，避免误伤」

### 3.1 小问题

| 位置 | 问题 | 建议 |
|---|---|---|
| `RandomSurveyProcessor.java:206-208` | 随机卷落库失败只 `log.error` 并继续，客户端仍拿到随机题面但没有服务端快照（后续判分/解析会退回项目全量 schema） | 失败时向客户端返回明确错误，别静默降级 |
| `SurveyServiceImpl.java:412-413` | 考试模式下若请求没带 `answer`，`answerView.getExamInfo()` 为 null → NPE；`:978` 配额校验同样直接 `request.getAnswer().get(...)` | 入口统一校验 `answer != null`，返回 400 而不是 500 |
| `AnswerServiceImpl.java:276-283` | `count()` 不看 `tempSave`，而 `listAnswer`（`:73-79`）要求 `answer` 非空 → 回收上限把草稿也算进名额（且草稿被删后计数不回落） | 计数与列表口径统一，或明确「草稿也占名额」并写进文档 |
| `AnswerServiceImpl.java:268-271` | `catch (Exception ignored)` 吞掉 metaInfo 补齐异常 | 已加注释、范围只有 header/cookie 读取，可接受；建议 `log.debug` 留痕 |
| `Answer.java:76` / `:79` | `createBy` / `updateAt` 在子类里重复声明，**隐藏**了 `BaseModel` 的同名字段（两处都有填充注解） | 删掉子类重复字段，避免哪天注解不一致时静默失效 |
| `RepoMapper.java:21-23` | `selectRepoTemplateTags` 连 `t_tag`/`t_template`/`t_repo` 都没有 `is_deleted` 条件，而同文件的 `selectRepoQuestionTypes`（`:30-32`）有 → 标签统计把已删题算进去 | 统一补 `is_deleted = 0` |
| `UserServiceImpl.java:774,782` vs `:994,1017` | 首页统计的 `exists(... t_project ...)` 没写 `t.is_deleted = 0`，而「我的任务」两处写了 → 已删项目仍计入首页「问卷数/考试数」 | 四处统一 |
| `UserDeptScopeService.java:50-55` | `DEPT_SCOPE_SQL` 里 `t_user`/`t_user_dept`/`t_dept` 都没过滤 `is_deleted` → 已删组织仍参与数据可见范围（且 `deleteDept` 不清理 `t_user.dept_id`，`DeptServiceImpl.java:226-231`） | 补 `is_deleted = 0`；删组时把成员主组置空或迁移 |
| `DeptServiceImpl.java:226-231` | 删组只软删组本身 + 清岗位/角色绑定，**不处理子组与成员归属** → 子组 parent_id 指向已删组 | 删组前校验无子组/成员，或级联 |
| `init-mysql.sql:428-446` 等 | 缺索引：`t_template` 只有 PK，但按 `repo_id` + `priority` 分页（`TemplateServiceImpl.java:68-82`）；`t_project` 只有 PK，但按 `parent_id/mode/create_by` 过滤 + `create_at` 排序（`ProjectServiceImpl.java:59-73`）；`t_answer` 只有 `project_id` 索引，但按 `create_by/exam_exercise_type/create_at` 查（`AnswerServiceImpl.java:472-482`）；`t_project_partner` 无 `(user_id,type)` 索引（`ProjectPartnerMapper.java:14`） | 补复合索引，见下表 |
| `AnswerMapper.java:23-26` | `selectProjectIdsByIds` 没有 `is_deleted` 过滤（回收站里的答卷仍可用于归属认证）——目前用途是权限校验，影响低，但和 P0-1 同类 | 明确语义：权限校验可不过滤，但请写注释 |

**建议索引（按现有查询）**

```sql
ALTER TABLE t_template        ADD KEY idx_template_repo_priority (repo_id, priority, is_deleted);
ALTER TABLE t_project         ADD KEY idx_project_owner        (create_by, is_deleted, create_at);
ALTER TABLE t_project         ADD KEY idx_project_parent       (parent_id, is_deleted);
ALTER TABLE t_answer          ADD KEY idx_answer_user_time     (create_by, is_deleted, create_at);
ALTER TABLE t_answer          ADD KEY idx_answer_project_time  (project_id, is_deleted, create_at);
ALTER TABLE t_project_partner ADD KEY idx_partner_user_type    (user_id, type, is_deleted);
```

### 3.2 已经做对的（不要一并「修」坏）

- **软删除 + 唯一键**：全库只有三处唯一键。`uk_user_dept`、`uk_dept_role` 与 `is_deleted` 并存（`init-mysql.sql:520-532`、`:614-625`），但业务侧用的是**物理删除**规避冲突：`UserDeptMapper.java:23`、`DeptRoleMapper.java:24`，调用点 `UserServiceImpl.java:209`、`DeptServiceImpl.java:151/230`。`uk_account_oauth_identity` 更彻底：用生成列在软删后变 NULL（`init-mysql.sql:18-24`）。**结论：目前没有别的表同时具备「is_deleted + 唯一键」，不存在新增隐患。**
- **缓存失效（正确姿势）**：`DeptServiceImpl.java:110-136`（组/角色写入同时清 deptCache+userCache）、`:203-221`（afterCommit 清 userCache）、`SystemServiceImpl.java:184-210`（改角色后按用户 evict，afterCommit）、`ProjectPartnerServiceImpl.java:199-221`（成员变更 afterCommit evict）、`FileServiceImpl.java:95/445`（文件缓存 allEntries）。这些都用 `TransactionSynchronization.afterCommit`，避免「清完又被并发读回旧值」。
- **文件上传补偿**：`FileServiceImpl.java:213-238` 失败时删物理文件再抛，基本不会留孤儿（仅当补偿删除本身失败会残留）。
- **导入的失败语义**：`UserServiceImpl.java:864-871` 的 catch 是「分类后重抛」，不是吞异常（P1-9 的问题是事务回滚规则，不是这里）。

---

## 4. 复现命令（只读，可自查）

```powershell
cd C:\Users\Nightwatchman\Desktop\SurveyKing

# 1) 手写 SQL 清单（逐条看有没有 is_deleted）
rg -n "@Select|@Update|@Delete|\.exists\(|\.apply\(" server/rdbms/src/main/java --glob "*.java"

# 2) 事务 / 异步 / 缓存 / 乐观锁 全量清单
rg -n "@Transactional|@Async|@Cacheable|@CacheEvict|@Version|@TableLogic" server/rdbms/src/main/java --glob "*.java"

# 3) 软删除 + 唯一键：先看唯一键，再看 is_deleted 是否同表
rg -n "UNIQUE KEY|is_deleted" server/rdbms/src/main/resources/scripts/init-mysql.sql

# 4) 缓存 TTL / 上限
rg -n "custom-cache|projectPermissionCache|maximumSize" server/api/src/main/resources/*.yml server/shared/src/main/java/cn/surveyking/server/core/config/CacheConfig.java

# 5) 异步 + SecurityContext 继承（P0-3 的三个前提）
rg -n "MODE_INHERITABLETHREADLOCAL" server/shared/src/main/java/cn/surveyking/server/core/config/WebSecurityConfig.java
rg -n "ThreadPoolTaskExecutor|getAsyncExecutor" server/shared/src/main/java/cn/surveyking/server/core/config/AppConfig.java
rg -n "setAsyncExecutor|TaskDecorator|DelegatingSecurityContext" server --glob "*.java"   # 预期 0 命中

# 6) 事务回滚规则（P1-9）
rg -n "@Transactional" server/rdbms/src/main/java --glob "*.java" -A0   # 看有没有 rollbackFor
rg -n "@SneakyThrows" server/rdbms/src/main/java --glob "*.java"
```

## 5. 未覆盖 / 需要人工确认

1. **未跑并发实测**：P0-4/P0-5 的竞态是「代码路径 + 无唯一约束」的静态结论，未做压测复现；建议用两个并发 `curl` 打 `/api/public/saveAnswer` 验证是否产出两条 `t_answer`。
2. **P1-11（权限口径）建议手工验证一次**：给班级授权一场考试，用组内老师账号点开详情页看是否 403；代码路径是闭合的，但可能有个别入口没加 `@EnableDataPerm`，实测最快。
3. **消息/通知、外部存储、OAuth 回调**等模块只扫了事务与异常，未做数据一致性深挖（`OAuthServiceImpl` 里的 `catch (Exception ex)` 属于「记日志 + 返回失败」的正常用法，未列入问题）。
4. **前端语义**未在本报告范围（另有 `frontend-a.md` / `frontend-b.md`）。
