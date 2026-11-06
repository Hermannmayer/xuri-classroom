# 并发类问题实测报告

> 目标：把 `docs/audit/backend-data.md` 里 **P0-4（重复提交无幂等）/ P0-5（上限·唯一值·配额先查后写）** 的静态推导，用真实并发请求验证。
> 日期：2026-11-06　环境：`http://127.0.0.1:7007`（本地 jar，admin 账号）
> 脚本：`scripts/dev/verify-concurrency.js`（只调公开 API，不直连数据库；数据库核对用只读 SQL 单独做）
> 数据卫生：全程只操作名字带 `zz-concurrency-` 前缀的临时项目，跑完已删除；**没有触碰任何真实项目/答卷**（清理后复查：临时项目 0 条、挂在其下的答卷 0 条）。

## 0. 结论速览

| # | 用例 | 并发 | 成功 | 数据库最终条数 | 顺序对照组 | 结论 |
|---|---|---|---|---|---|---|
| T1 | 同一用户重复提交（不带 answerId） | 10 | 10 | **10** | — | 🔴 **存在**：无幂等，刷新/连点会产生多份答卷 |
| T2 | `maxAnswers = 1` 上限穿透 | 10 | 10 | **10** | 第 2 次顺序提交 → `4010 已达到回收上限` | 🔴 **存在**：上限本身有效，但并发被穿透 |
| T3 | `cookieLimit = 1` 频率限制 | 10 | 10 | **10** | 第 2 次顺序提交 → `200`（也放过） | ⚪ **不成立（配置未生效）**：不是并发竞态，是限制压根没拦 |
| T4 | 切屏计数并发上报 | 10 | 10 | `switchScreenTimes = **1**` | — | 🔴 **存在**：读-改-写丢更新，10 次只记 1 次 |
| T5 | 同一 `answerId` 并发交卷 | 5 | 5 | 1 条，分数恒为 `10` | 开启 `submittedSetting.enableUpdate` | 🟢 **未观察到异常**：仍是 1 条、无分数抖动 |

三条坐实（T1/T2/T4），一条不成立（T3，需改成「配置缺陷」而不是「并发缺陷」），一条未复现（T5）。

---

## 1. 方法与可信度

- 每个用例**独立临时项目**，避免互相污染；T2/T3 额外建一个「顺序对照项目」，用来区分「并发穿透」与「限制根本没生效」——**这一步很关键**，否则会把配置问题误判成并发问题（T3 就是例子）。
- 「成功」= 接口返回 `code=200`；「数据库最终条数」由只读 SQL 复核，不只看接口回显。
- 临时项目必须**一次性带全 `setting`**（`status/mode/answerSetting/examSetting/submittedSetting`）创建，原因见第 3 节。

复现：

```powershell
node scripts/dev/verify-concurrency.js            # 跑完自动清理
KEEP=1 node scripts/dev/verify-concurrency.js     # 保留临时项目，便于用 SQL 核对（需自行清理）
```

数据库核对（只读）：

```sql
select p.id, p.name, count(a.id) from t_project p
  left join t_answer a on a.project_id = p.id
 where p.name like 'zz-concurrency-%' group by p.id, p.name;

select json_extract(a.meta_info, '$.switchScreenTimes')
  from t_answer a join t_project p on p.id = a.project_id
 where p.id = '<T4 的 projectId>';
```

---

## 2. 逐项说明

### T1 · 重复提交无幂等（存在）

- 同一 admin cookie，10 个并发 `POST /api/public/saveAnswer`，body 不带 `id`。
- 结果：10 个全部 200，`t_answer` **10 条**，各自独立 `answerId`。
- 机制：`AnswerServiceImpl.saveAnswer` 只在「带了 id」时走更新，否则一律 `new Answer()` 插入，没有任何「同一用户 + 同一问卷」的去重或唯一约束。
- 用户侧表现：网络慢时连点两次「提交」、或提交成功后回退再提交，就会多出一份答卷，考勤/统计/成绩排名全部受影响。

### T2 · maxAnswers 上限被并发穿透（存在）

- 项目创建时即设 `answerSetting.maxAnswers = 1`。
- **对照组**：顺序提交两次 → 第 1 次 200、第 2 次 `4010 已达到回收上限，问卷停止收集`（说明上限逻辑本身是好的）。
- **并发组**：10 个并发匿名提交 → **10 个全部 200**，落库 10 条。
- 机制：典型的「先 count 后 insert」，`count` 与 `insert` 之间没有锁、没有唯一约束，10 个请求都在计数为 0 时通过校验。

### T3 · cookieLimit 限制（**不能算并发问题**）

- 项目设 `answerSetting.cookieLimit = { limitNum: 1, limitFreq: 'only' }`。
- **对照组**：同一 cookie 顺序提交两次 → **两次都是 200**，落库 2 条。
- 并发组 10 次同样全过、落库 10 条。
- 结论：**限制根本没生效**（顺序都不拦），所以「落 10 条」不能归因于并发。可能是 `cookieLimit` 只在特定条件（比如未登录、或需要先下发随机卷 cookie）下才校验，也可能是配置字段名/枚举值不对。**需要产品/后端确认该配置的预期语义后再判定**。
  - 附注：`answerSetting.cookieLimit.limitNum` 这种三级路径会被 `updateProject` 的白名单拒绝（`400 非法的更新参数`），只能整对象替换 `answerSetting.cookieLimit`——这本身也是个可用性问题。

### T4 · 切屏计数丢更新（存在）

- 先正常提交一次拿到 `answerId`，然后 10 个并发 `POST /api/public/exam/switch-screen`。
- 结果：10 个请求全部 200，但**返回的累计值全是 1**，数据库 `meta_info.switchScreenTimes` 最终也是 **1**。
- 机制：`SurveyServiceImpl.recordSwitchScreen` 是标准读-改-写：
  ```java
  int times = metaInfo.getSwitchScreenTimes() == null ? 0 : metaInfo.getSwitchScreenTimes();
  times += 1;                       // ← 10 个线程都读到 0
  metaInfo.setSwitchScreenTimes(times);
  answerService.updateById(answer); // ← 后写覆盖先写
  ```
- 用户侧表现：「切屏超过 N 次自动交卷」这类反作弊规则，在连续快速切屏（比如 1 秒内切 10 次）时会严重少记，规则形同虚设。

### T5 · 同一 answerId 并发交卷（未复现异常）

- 项目开启 `submittedSetting.enableUpdate`，先提交拿到 `answerId`，再并发 5 次带同一 `id` 的 `saveAnswer`。
- 结果：5 次全 200，`t_answer` 仍是 **1 条**，返回分数 **恒为 10**，没有出现互相覆盖导致的异常值。
- 说明：在「同一份答案、同一分数」的前提下，多次覆盖写的结果是收敛的。**这不代表没有竞态**——如果并发请求携带的答案不同（比如改答案的同时另一处又交卷），仍可能出现「分数与答案不匹配」。要验证这一点需要构造不同答案的并发，本次未做。

---

## 3. 顺带发现的健壮性问题（阻塞了本次测试，值得单独修）

用 `POST /api/project/create` 只传 `name/mode/survey`、不传 `setting` 时：

- `POST /api/project/update`（`settingKey: 'status'`）→ **500**
- `POST /api/public/loadProject` → **500**
- `POST /api/public/saveAnswer` → `4004 页面不存在`

根因是 `addProject` 不会补默认 `ProjectSetting`，`setting` 为 `null` 后：

- `updateProject` 里 `getById(id).getSetting()` 返回 null，紧接着 `spelParser.parseExpression(key).setValue(setting, value)` 直接 NPE；
- `loadProject` 走到 `project.getSetting().getSubmittedSetting()` 之类链路同样 NPE。

也就是说：**任何不经前端、直接调 API 建的项目都是坏的**（前端建项目时传了完整 setting 才掩盖了这个问题）。这是 API 健壮性缺口，不是并发问题，但会干扰一切自动化测试与第三方集成。

---

## 4. 修复建议（按性价比）

| 优先级 | 建议 | 说明 |
|---|---|---|
| P0 | 答卷提交加幂等 | 前端生成 `clientToken` 随提交上送，后端 `(projectId, userId, clientToken)` 建唯一索引，重复请求直接返回既有答案 |
| P0 | 上限/配额改成「原子校验」 | `INSERT ... SELECT ... WHERE (select count(*)) < max` 或捕获唯一约束冲突，别用「先 count 再 insert」 |
| P0 | 切屏计数改原子自增 | 用 `UPDATE t_answer SET meta_info = JSON_SET(meta_info, '$.switchScreenTimes', COALESCE(...)+1) WHERE id=?`，或在应用层加行锁 |
| P1 | 修 `cookieLimit` 不生效 | 先确认语义，再补顺序对照测试（本次对照组已证明它连顺序提交都不拦） |
| P1 | `addProject` 补默认 setting | 避免 500；顺带让 API 可以脱离前端独立使用 |
| P2 | 补 T5 的不同答案并发用例 | 验证「分数 + 答案」是否会出现版本错配 |

---

## 5. 本次测试的边界

- 单机单实例、本机回环，没有网络抖动/多副本因素；分布式部署下的表现只会更差，不会更好。
- 并发度固定 10（T5 为 5），未做压力梯度；目的只是「证明存在」，不是测极限。
- 后端在测试期间被其他任务重建过；脚本已加「会话失效自动重登录 + 后端不可用等待重试」，最终数据来自一次完整运行（`tag = zz-concurrency-mw50lzt6`）。
- 临时数据已全部删除并复查为 0 条。
