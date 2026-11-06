# 在线考试/问卷「答题 → 提交」链路设计惯例调研

> 2026-11-06。**【有据】**=厂商文档/代码可查；**【推断】**=基于行业惯例的推测。本仓库列指 `client/src/pages/answer/PublicAnswer.tsx`、`server/rdbms/.../SurveyServiceImpl.java`。

## 1. 答题页模式

| 产品 | 结论 | 出处 |
|---|---|---|
| 问卷星 | **按卷配置**：发布后链接下方可开「一题一页」，或编辑器中插入分页；考试与调研入口不同 | [1](https://drunkyong.sojump.cn/help/help.aspx?helpid=10616) [2](https://www.wjx.cn/help/help.aspx?helpid=266) |
| 腾讯问卷 | 按卷配置，设了「分页/一页一题」答题页才出现下一页 | [3](https://cloud.tencent.com/document/faq/1304/137106) |
| Canvas | 按测验配置；高校建议**长卷逐题、短卷全显**（逐题会逐题保存并保活连接） | [4](https://www.uhd.edu/computing/training-lms/canvas-testbestpractices.aspx) |
| Typeform | 产品形态即一页一题，无瀑布流 | [5](https://help.typeform.com/hc/en-us/articles/360029581051-Save-and-return-to-your-form-later) |
| Google Forms/SurveyMonkey/考试宝/学习通 | 以分节分页或固定形态实现【推断，未取到一手文档】 | — |

**主流是每份卷配置一次，考生不能切换**（会破坏计时与防作弊口径）。本仓库 `onePageOneQuestion` 属卷级，与主流一致。

## 2. 自动保存/暂存

- 问卷星：断点续答**基于 Cookie**，仅同机同浏览器生效，清 Cookie 即失效；跨设备靠「多人协作」转链接（尊享版）【有据 1、[6](https://www.wjx.cn/Help/Help.aspx?helpid=303)】。腾讯问卷同样要求**同一答题设备**【有据 3】。
- Typeform：答案存**浏览器 local storage，15 天**，仅同设备非无痕，可按卷关闭【有据 [7](https://help.typeform.com/hc/en-us/articles/13064754462228-Enable-or-disable-autosave-progress-for-your-respondents)】。
- Canvas：逐题模式每答即存；离开页面的提交会**挂起**，需教师手动代交【有据 4】。
- 断网、崩溃、**多端同时登录**是丢答案三大主因【有据 [8](https://help.wqu.edu/en/articles/12611142-what-causes-quiz-answers-to-fail-to-save-and-how-can-i-prevent-it)】。
- **本仓库**：localStorage 草稿（防抖 600ms）+ `/api/public/tempSaveAnswer`，但**远程暂存仅登录用户生效**，匿名换设备必丢。

## 3. 提交保护

- 幂等键：客户端生成 UUID 作 `Idempotency-Key`，服务端回放首次响应【有据 [9](https://docs.stripe.com/api/idempotent_requests.md)】；幂等消费者把 processed id 做主键、插入失败即丢弃【有据 [10](https://microservices.io/patterns/communication-style/idempotent-consumer.html)】。
- 前端防连点必须监听 `form submit`（回车与 `requestSubmit()` 也触发），提交中禁用按钮；否则就是**重复记录**，服务商原话【有据 [11](https://help.formspree.io/articles/troubleshooting/delay-on-submit-or-double-submissions)】。
- **本仓库**：`submittingRef/submittedRef` 防重；但后端**无幂等键**，`id` 为空时**每次 new UUID**，网络重试或双开即两答卷。

## 4. 限时考试

- Canvas：计时从点 Begin 起、**离开页面继续跑**，到点自动保存并提交【有据 4】。
- MS Forms：到点自动交，但记录没落库时教师**看不到**、且「每人一次」导致无法重考——真实事故【有据 [12](https://learn.microsoft.com/en-us/answers/questions/5157788/student-did-not-submit-timed-quiz-forms-quiz-optio)】。
- 防改时钟：**服务端在 begin 时下发 deadline，交卷按服务端时钟裁决**，超时标 `late` 而非丢弃【推断】。
- **本仓库**：deadline 由前端 `Date.now()+maxSubmitMinutes` 页面挂载时算算 → 刷新即重置；`maxSubmitMinutes` **服务端完全未校验**（仅 DTO + 前端使用）。

## 5. 提交后行为

问卷星按份配置 `transcriptVisible / answerAnalysis / rankVisible`；公开查询改答案有**字段级权限**，服务端与旧答案 merge【有据代码 `validateAndMergeAnswer`】。改答案边界：限时内可改；登录且 `enableUpdate` 时永远改「最近一份」【有据 `validateAndGetLatestAnswer`】。本仓库已做到解析等考试结束才放开。

## 6. 必填校验

主流是**拦截 + 跳到首道缺失题 + 答题卡标红**；Google Forms 以 `required` 在提交时阻断【推断】。**本仓库做对了**：`unansweredRequired` 拦截、跳题、答题卡 `missing`、底部计数（`PublicAnswer.tsx:419/578/625/873`）。建议确认二次确认框列出缺失题号。

## 7. 切屏检测

问卷星：超限后**锁定到交卷页**；明文承认误报——来电/短信算切屏，建议放宽；iOS 可能不生效、安卓分屏管不住、IE10 以下不支持【有据 [13](https://www.wjx.cn/help/help.aspx?helpid=386)】。高校实操：**切屏 ≥3 次或单次 >30 秒判 0 分**，且"无故退出=切屏"【有据 [14](https://www.gzpyp.edu.cn/jwc/ksjd/ksdt/content_73491)】。缓解靠阈值可配、只告警不判罚、服务端心跳复核【推断】。**本仓库计数不落库，刷新即清零**。

## 8. 常见逻辑坑（12 条）

1. 定时交卷与手动交卷并发 → 两份答卷。2. 草稿覆盖已提交答卷。3. 匿名无 `id` 时每次新建 UUID。4. 超时答卷落库失败、无重试无兜底（MS Forms 事故）。5. 前端计时可刷新/改钟绕过。6. 提交后残留 draft 被当"修改"，遇 `enableUpdate=false` 报 4020。7. 提交成功但响应丢失 → 用户重交成重复。8. 隐藏题仍算必填、跳转后题号错位 → 永远提交不了。9. 切屏计数不持久、多标签各记一份。10. 无痕/写满时 localStorage 静默失败。11. 多端同答、最后写者赢互相覆盖（WQU 明列）。12. 用当前题库结构渲染历史答卷，题目改动后判分/解析对不上。

## 9. 最值得改的 5 条

1. **服务端下发并在交卷时裁决截止时间**——现在刷新/改系统时钟即无限时；风险是要加字段与迁移。
2. **`saveAnswer` 加幂等键 + 唯一索引**——现无键、无 id 即新建，一次超时重试就是两份答卷。
3. **自动交卷加服务端兜底**（扫描过期未交卷、强制落库、重试退避）——避免"到点没交上"直接丢分。
4. **远程暂存覆盖保护**（拒绝覆盖 `tempSave=1`，草稿只写自身 answerId）——防止草稿回滚已交卷。
5. **切屏计数落库、默认只告警**——现计数刷新即清零等于无效，且即时判罚误报代价过高。
