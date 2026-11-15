---
title: "问卷结果收集与问卷化适配规划（2026-11）"
description: "先修匿名答卷可见性，再把问卷从考试设置/考试语义里拆出来，最后补分析交付"
---

# 问卷结果收集与问卷化适配规划

> 结论先行：**问卷不是“没有结果收集”，而是“收得到、默认看不到”**。
> 公开问卷最常见的形态是匿名作答，而数据页、导出、报表、概览四处都默认把 `is_anonymous=1` 的答卷过滤掉；即使不匿名，结果层也只有“答卷表格 + 单题分布”，没有投放回收指标、筛选、交叉分析和可交付的数据页。
> 因此建议顺序是：**先修可见性（1–2 天）→ 问卷设置与考试设置分家（2–3 天）→ 收集概览（3–4 天）→ 分析与交付（P1）→ 设置/题型补全（P2）**。

---

## 0. 先回答你的判断

| 判断 | 结论 | 证据 |
|---|---|---|
| “问卷没有结果收集” | **半对**：答卷一直有落库，但管理端默认看不见匿名答卷；非匿名也只有最基础的单题统计 | 见 §1.3 的四条过滤 |
| “所有逻辑围绕考试” | **部分对**：后端已经把判分、错题、随机卷、考试窗口隔离在 `mode=exam`；真正缺的是“问卷专属能力”，不是考试逻辑污染了问卷 | `AnswerScoringService`、`RandomSurveyProcessor`、`ProjectAnswerValidator#validateExamSetting` 都有 mode 判断 |
| “需要为问卷单独适配” | **对**，但要分三层：设置层（界面/入口）、结果层（指标/分析/交付）、语义层（交卷/得分/成绩单等考试词汇） | 见 §1.4 |

一句话：**底座够用，缺的是问卷产品层**。`t_answer`、`t_answer_item`、`meta_info`、`t_anonymous_subject` 这些表已经能支撑 80% 的问卷结果能力，不需要重做数据模型。

---

## 1. 现状体检（带证据）

### 1.1 已经具备的底座

| 能力 | 现状 | 证据 |
|---|---|---|
| 问卷/考试同表 | `t_project.mode` 区分 `survey/exam/folder`，题目树和设置都在同一行 | `ProjectModeEnum`、`ProjectServiceImpl#addProject` |
| 题目树 | `t_project.survey` 存整棵 `SurveySchema` JSON，不另建题目表 | `docs/modules/survey.md` |
| 答卷 | `t_answer.answer` 存答案、`temp_answer` 存草稿、`survey` 存整卷快照 | `Answer.java` |
| 统计投影 | `t_answer_item` 把答案展开成“一题一选项一行”，可走 SQL 聚合 | `25-answer-items.sql`、`AnswerItemMapper.xml` |
| 匿名身份 | `sk-anon` cookie + `t_anonymous_subject`，支持认领与过期清理 | `AnonymousIdentityServiceImpl`、`AnonymousCleanupService` |
| 回收限制 | 登录/密码/回收上限/截止时间/IP/设备限次 | `Overview.tsx` 回收限制卡、`AnswerValidationService` |
| 答题体验 | 逐题下发、草稿、一页一题/瀑布流、答题卡、题号、复制开关 | `PublicAnswer.tsx`、`PublicProjectLoader` |
| 答卷管理 | 列表、详情、补录、导入、导出、回收站 | `Data.tsx`、`AnswerApi` |
| 单题统计 | 选项计数/占比、文本题 Top 50、每日答卷、数值 min/max/avg | `Report.tsx`、`QuestionBlock.tsx`、`ReportServiceImpl` |
| 导出元数据列 | 导出模板本来就有“填写时长/设备/操作系统/浏览器/地区/IP”列 | `SchemaHelper#parseColumns`（L115–120） |
| 逻辑规则 | 显隐/必填/跳转规则编辑器；配额、唯一校验后端有 | `RuleEditor.tsx`、`ProjectAnswerValidator#validateAnswer` |

### 1.2 后端已经按 mode 分叉的地方（这部分是好的）

| 能力 | 是否只对考试生效 | 证据 |
|---|---|---|
| 自动判分 | 是 | `AnswerScoringService#computeExamScore`（`ProjectModeEnum.exam` 才判） |
| 错题本 | 是 | `PublicAnswerSubmitter` 只在 exam 分支写错题 |
| 随机抽题/随机顺序 | 是 | `RandomSurveyProcessor`（非 exam 直接返回） |
| 考试窗口/最短最长交卷/切屏/闯关 | 是 | `ProjectAnswerValidator#validateExamSetting`、`AnswerTimer` |
| 导出分数列 | 是 | `SchemaHelper#parseColumns`（exam 才加“分数”） |
| 答卷/统计/导出查询 | 否，共用 | `AnswerServiceImpl#listAnswer`、`ReportServiceImpl` |

结论：**后端已经把“考试专属”隔离得不错**；问卷的问题是“问卷专属”没做，而不是考试逻辑把问卷带歪了。

### 1.3 决定性的四条“匿名过滤”

这四条叠加，导致公开问卷（默认匿名）在管理端看起来像“没有收集到任何结果”：

1. **数据页不传 `includeAnonymous`**：`Data.tsx` 的 `load` 只传 `projectId/current/pageSize`，而 `AnswerServiceImpl#listAnswer` 在 `includeAnonymous != true` 时强制加 `is_anonymous = 0`（L179–185）。
2. **报表硬编码排除匿名**：`ReportServiceImpl#getData` 查询条件固定 `.eq(Answer::getIsAnonymous, false)`（L36）。
3. **导出不传 `includeAnonymous`**：`AnswerServiceImpl#downloadSurvey` 构造 `AnswerQuery` 时没有该字段，导出走同一个 `listAnswer` 过滤（L430–454）。
4. **概览用报表 total**：`Overview.tsx` 的“共 N 份答卷”来自 `report.total`（L505、L659），所以也显示 0。

而问卷默认就是匿名的：`AnswerServiceImpl#createAnswer` 在“未登录 + 无 createBy + 无白名单姓名 + 项目不要求登录”时创建 `t_anonymous_subject` 并置 `is_anonymous=1`（L306–318）。所以**用公开链接收集的问卷，默认 100% 命中这四条过滤**。

> 这不是“匿名没做好”，而是“匿名只对答题人可见，对管理者不可见”。`AnonymousAnswersDrawer` 只让答题人看自己的答卷；老师侧没有对应入口。

### 1.4 三层错位

#### A. 设置层：问卷被考试设置覆盖

- `Overview.tsx` 对两种模式渲染同一页；`EXAM / 考试控制` 卡（L839–886）无条件出现，包含考试开始/结束、最短/最长交卷、切屏、闯关、排名、练习模式、错题练习、随机顺序、收藏。
- 同一页还无条件出现 `显示成绩单`、`显示答案解析`（L950–951），这是考试语义。
- **白名单、微信答题、公开查询**：后端字段和校验都在（`whitelistType`、`wechatOnly`、`wechatUserInfo`、`submittedSetting.publicQuery`），前端没有任何配置入口；`docs/architecture/scope.md` 也把“白名单前端入口”列为已知缺口。
- **配额/唯一**：`SurveySchema.Attribute.quota/unique` 有后端校验（`ProjectAnswerValidator` L122–178），但设计器属性面板没有编辑入口；`client/src` 里 `quota` 只出现在类型定义和注释里。
- **选项随机**：`client/src` 全库 grep 无 `shuffle/随机选项` 实现。

#### B. 结果层：只有“答卷查看器”，没有“收集运营台”

- 数据页固定列：`# / 提交时间 / 答卷人 / 状态 / 得分`（`Data.tsx` L202–256）；问卷也显示“得分”。
- 筛选只有“日期区间 + 答卷人姓名”，且是前端对全量数组过滤（`Data.tsx` L73–77 注释、L496–510）。
- 报表只按“单题”出卡片：选项分布 + 数值统计 + 每日答卷（`Report.tsx`）；没有有效样本量口径、没有按条件筛选、没有交叉分析、没有文本题明细列表。
- **报表题目结构取 `answers[0].survey`**（`Report.tsx` L59–64）：只要首份答卷没有整卷快照，报表就退化成“0 题”。Excel 导入的答卷在 `AnswerUploadParser#parseRow2Answer` 里根本没有写 `survey`（L134–150），所以“先导入历史数据、再继续收集”的项目会直接看不到题目。
- 报表把全量答卷拉到浏览器再算：`Report.tsx` L37–45 用 `pageSize=-1` 拉 `/api/answer/list`；后端还有 20000 份硬上限（`ProjectStatisticsService` L40–50）。
- 导出只有 xlsx（`AnswerExporter`），没有 CSV/SPSS/Word 统计报告。
- 没有“数据分享页”（只读链接/密码/字段白名单）。
- 没有浏览量/回收率/平均完成时长：全库 grep `浏览量|viewCount|回收率` 为 0。
- 导出模板里的“填写时长/设备/OS/浏览器”列永远为空：前端提交时只在闯关模式带 `metaInfo`（`PublicAnswer.tsx` L783–786），从不传 `answerInfo.startTime/endTime` 和 `clientInfo`；后端 `AnswerMetaEnricher` 只补 IP 和限次 cookie。

#### C. 语义层：考试词汇渗入问卷

- 数据页“得分”列与详情“得分 X”（`Data.tsx` L244–255、L662–664）。
- 交卷成功页只要有 `examScore` 就显示“得分”（`PublicAnswer.tsx` L1214–1218）；问卷目前不会写分数，所以暂时不显示，但这是靠“恰好没值”兜住的，不是按 mode 分支。
- 答题页的“交卷/成绩单/排名/错题练习/收藏”等按钮和文案，在问卷模式下仍可能出现（取决于 setting 是否为空）。
- 完成后只有“已提交 + 自定义 HTML + 跳转链接”，没有问卷常见的结果页（图标/标题/说明/变量插值/按答案跳转）。

### 1.5 题型与能力盘点

- 设计器面板 18 项、渲染器注册 15 个（`defaults.ts` / `registerAll.ts`）。
- 未注册：`Upload`、`Signature`、`Barcode`、`HorzBlank` 等；后端枚举存在、导出也能解析，但答题页没有输入控件。
- 卷王常见的“图片单选/图片多选”在本系统没有独立题型；选项富文本可以部分替代，但没有专门的图片选项编辑体验。
- 无“项目复制/另存为模板”，问卷复用成本高（每做一次同类调研都要重配）。

---

## 2. 对标：卷王、问卷星、腾讯问卷

### 2.1 卷王（SurveyKing 商业版，同族产品，参考价值最高）

卷王把问卷的“结果收集”拆成五段，每段都有独立入口：

| 段 | 卷王能力 | 对本项目的启示 |
|---|---|---|
| 投放 | 链接、二维码、短信、邮件、微信、嵌入、渠道链接 | 先补链接/二维码/渠道参数；短信/邮件不在本期 |
| 回收 | 收集中/已暂停、回收设置（登录/白名单/次数/时间/配额）、发布设置 | 现有底座够，缺“回收概览”和“白名单入口” |
| 清洗 | 数据详情：列设置、高级筛选（题目/时间/标记颜色）、批量标记、回收站 | 当前只有日期+姓名，差距最大 |
| 分析 | 统计图表（单题分布/占比/横向条形/柱状/饼图/有效样本量/Word 报告）、交叉分析（行×列、行百分比、Excel 导出） | 当前只有单题分布，且在前端全量算 |
| 交付 | 导出 Excel/SPSS/附件/打印、数据分享（只读实时页/密码/字段白名单/重置链接）、数据权限 | 当前只有 xlsx，无分享页 |

卷王数据概览的指标是：**回收量、浏览量、回收率、平均完成时间、每日回收量、设备类型、操作系统**；这与本项目 `meta_info` 里已有的 clientInfo 字段高度重合，补采集即可，不需要新埋点模型也能先跑起来。[卷王·数据管理](https://www.surveyking.cn/help/data/) / [数据概览](https://www.surveyking.cn/help/data/data-overview/) / [统计图表](https://www.surveykingpro.cn/help/data/chart/) / [交叉分析](https://www.surveyking.cn/help/data/cross-analysis/) / [分享数据](https://www.surveyking.cn/help/data/share-data/)

卷王的问卷设置也值得直接对照：**问卷显示 / 回收设置 / 微信设置 / 消息通知 / 结果页 / URL 参数 / 敏感词**分开配置；逻辑分“基础规则”和“高级 DSL”，基础规则覆盖显示、跳转、结束、选项联动，高级 DSL 才处理动态必填/赋值/校验/标题替换。[发布设置](https://www.surveyking.cn/help/settings/publish/) / [问卷逻辑](https://www.surveyking.cn/help/logic/) / [自定义结果页](https://www.surveyking.cn/help/settings/result-page/)

### 2.2 问卷星 / 腾讯问卷

| 能力 | 问卷星 | 腾讯问卷 | 本项目 |
|---|---|---|---|
| 逻辑跳转 | 选项跳转/无条件跳转；只允许向后跳 | DSL 逻辑、筛选规则 | 前端 `visibleRule/requiredRule/jumpRule`，仅前端求值 |
| 配额 | 选项配额、配额分组；超 5 万份失效 | DSL 配额规则 | 后端有 `quota` 校验，无 UI |
| 统计 | 分类统计、交叉对比、自定义查询 | 统计图表、交叉分析 | 单题分布 + 数值统计 |
| 投放 | 样本服务、皮肤、多渠道 | 样本服务、皮肤、协作 | 链接/二维码/密码/白名单（白名单无 UI） |
| 数据交付 | Excel/SPSS、报告 | 导出、分享 | xlsx |

问卷星把“逻辑关系（跳题/题目关联）”和“数据分析（分类统计/交叉对比/自定义查询）”作为版本差异的核心卖点；腾讯问卷把逻辑、筛选、配额做成了可代码化的 DSL。[问卷星版本区别](http://qywx.wjx.cn/mobile/themehtml/plan.aspx) / [腾讯问卷 DSL](https://wj.qq.com/docs/v24.07/survey-dsl/) / [腾讯问卷样本服务](https://wj.qq.com/article/single-528.html)

### 2.3 对标结论

问卷的“结果收集”不是一张答卷表格，而是：

```
投放（链接/渠道） → 回收（量/率/时长） → 清洗（筛选/列/标记） → 分析（单题/交叉） → 交付（导出/分享/报告）
```

本项目目前：**第 1 段有入口无数据，第 2 段只有上限/截止，第 3 段几乎空白，第 4 段只有单题，第 5 段只有 xlsx**。所以不是“补一个报表页”，而是补一条链路。

---

## 3. 目标与边界

### 3.1 目标场景（按职业技能培训业务排序）

1. **培训需求调研**：匿名、按班级/批次、结果导出给业务方。
2. **课程/讲师满意度**：量表题、NPS、文本建议、按班级对比。
3. **报名/签到/信息收集**：登录或白名单、字段校验、导出名单。
4. **培训后评估**：前后测对比、按班级/工种分组。

### 3.2 设计原则

- **不重写 schema**：继续用 `t_project.survey` / `t_answer.answer`；统计走 `t_answer_item` 投影。
- **问卷设置 additive**：新字段只增不改；考试项目零感知。
- **服务端聚合**：报表不再把全量答卷拉到浏览器；前端只拿聚合结果和分页明细。
- **隐私最小化**：匿名答卷可见，但不额外采集身份；分享页字段白名单 + 密码 + 审计。
- **先修 bug 再加功能**：匿名可见性、元数据、报表 fallback 属于“现有能力没接通”，优先于新页面。

### 3.3 明确不做（本期）

| 项 | 原因 |
|---|---|
| 样本服务/抽奖/红包/支付 | 与培训场景无关，合规成本高 |
| 复杂市场调研统计（加权、显著性检验、正交实验） | 目标用户是培训管理者，不是专业调研机构 |
| 多租户 | 当前单校/单机构部署，见 `refactor-catalog` 的边界 |
| 模板市场/皮肤市场 | 当前模板只在 localStorage 参与，后端没有模板中心 |
| 重写答题页 | 现有逐题下发/草稿/移动端是资产，只做 mode 分支和文案 |

---

## 4. 分阶段规划

> 人日按“1 名熟悉代码的后端 + 1 名前端”估算；单人全栈约 ×1.6。
> 每个任务都带“现状/改动点/验收”，可以直接拆成提交。

### P0：让问卷“收得到、看得见”（8–10 人日）

**目标**：公开匿名问卷提交后，管理端数据页/导出/报表/概览都能看到；问卷设置页不再出现考试控制；导出能看到填写时长和设备。

#### P0-1 匿名答卷可见性（2 人日，最高优先级）

- **现状**：§1.3 四条过滤；匿名答卷只对答题人可见。
- **改动点**：
  - `Data.tsx` 的 `/api/answer/list` 增加 `includeAnonymous: true`（后端已限制只有 `canManageProject` 生效）。
  - `AnswerServiceImpl#downloadSurvey` 构造 `AnswerQuery` 时增加 `includeAnonymous`，导出增加“匿名”标识列（不写姓名）。
  - `ReportServiceImpl#getData` 增加 `includeAnonymous` 参数（默认 false 保持 API 兼容；新 UI 传 true）。
  - `Overview.tsx` 的“共 N 份”与每日收集改用带匿名的口径。
  - 数据页加一个“含匿名/仅实名”筛选（默认含匿名），并对“查看匿名答卷详情”写审计日志（复用 `t_audit_log`，动作 `VIEW_ANONYMOUS_ANSWER`）。
- **验收**：新建问卷 → 公开链接匿名提交 3 份 → 数据页显示 3 份、导出 3 行、报表 total=3、概览“共 3 份”；切到“仅实名”显示 0；审计有 3 条查看记录。
- **风险**：隐私预期变化。用“默认含匿名 + 可切换 + 审计”兜住，不新增身份字段。
- **实现状态（2026-11-15，考试与问卷共用）**：
  - 已实现：数据页「含匿名/仅实名」开关 + `includeAnonymous`；`downloadSurvey` 默认含匿名、导出「提交人」写「匿名」；`ReportServiceImpl` / `GET /api/report/{id}` 支持 `includeAnonymous`；`AnswerView.isAnonymous`；项目列表/回收站 total、`listAnswersForStat` / `ProjectStatisticsService` 含匿名。
  - 考试匿名：`PublicAnswerSubmitter` 提交后写 `rd_result_<projectId>` cookie，`AnswerLookup` 接受该凭证，匿名考试成绩单/结果页/「我的答卷」可打开；`rd_answer_id_` 仍只负责随机卷续答。
  - 未做：查看匿名详情的审计（数据页详情复用列表行，没有单独读接口）；PV/UV 概览见 P0-4。

#### P0-2 设置页按 mode 分家（2 人日）

- **现状**：`Overview.tsx` 单页渲染全部卡片，考试控制常驻。
- **改动点**：
  - 拆 `SurveySettingCards` / `ExamSettingCards` 两个组件，按 `project.mode` 渲染。
  - 问卷只保留：**基本信息 / 回收设置 / 问卷显示 / 结果页 / 投放与分享 / 协作者**。
  - 问卷隐藏：考试开始/结束、最短/最长交卷、切屏、闯关、排名、练习模式、错题练习、随机顺序、收藏、成绩单、答案解析。
  - 保存时不动 `examSetting` 原值（避免问卷项目误清考试字段）。
- **验收**：问卷项目看不到 `EXAM / 考试控制` 卡；考试项目页面与现在完全一致；问卷保存后 `examSetting` 仍是原 JSON。

#### P0-3 元数据补全（1 人日）

- **现状**：导出有“填写时长/设备/OS/浏览器”列，但前端从不提交。
- **改动点**：
  - `PublicAnswer.tsx` 提交时始终带 `metaInfo.answerInfo = { startTime, endTime }`（页面进入时间/提交时间）。
  - 增加 `clientInfo`：`deviceType/platform/browser` 用轻量 UA 解析（可加 `ua-parser-js`，或写 20 行正则）；`region` 先留空。
  - `AnswerMetaEnricher` 保持服务端补 IP/cookie。
- **验收**：导出的“填写时长/设备/操作系统/浏览器”四列非空；概览平均时长 = 各答卷时长均值（±1 秒）。

#### P0-4 收集概览（3–4 人日）

- **现状**：全库无浏览量/回收率/平均时长。
- **改动点**：
  - 新表 `t_project_visit`（见 §5.1），`POST /api/public/visit` 在首屏 `projectOutline` 成功后调用一次；服务端用 `sk-visit-<projectId>` cookie + 30 分钟窗口去重，写入 `visitor_hash`。
  - `GET /api/report/{id}/overview` 返回：`total / pv / uv / conversionRate / avgDurationSeconds / daily[{date,count}] / devices[{name,count}]`。
  - 报表页顶部改成“概览”Tab：回收量、浏览量、回收率、平均时长四张指标卡 + 每日趋势 + 设备分布。
- **验收**：模拟 10 次访问（同一 cookie 5 次、不同 cookie 5 次）→ UV=5、PV=10；3 次提交 → 回收率 3/5=60%（按 UV 口径，页面标注清楚）；平均时长可显示。
- **风险**：刷新/爬虫抬高 PV。用 cookie 去重 + 过滤明显 bot UA + 页面标注“PV 为访问次数，UV 为设备数”。

#### P0-5 报表 schema fallback + 服务端单题聚合（1–2 人日）

- **现状**：`Report.tsx` 用 `answers[0].survey`；导入答卷没有快照；全量拉答卷到浏览器。
- **改动点**：
  - 前端：`survey = answers[0]?.survey ?? project.survey`；没有答卷时也能从项目 schema 渲染题目（数值为 0）。
  - 后端：新增 `GET /api/report/{id}/questions`，走 `t_answer_item` 聚合，返回每题 `answered/options[{optionId,count,percent}]`；`Report.tsx` 改用它，不再拉全量答卷。
  - 保留旧 `GET /api/report/{id}` 给概览页过渡。
- **验收**：导入 100 份无快照答卷 → 报表仍显示全部题目；1 万份答卷报表首屏 < 2 秒（本机 MySQL）；多选题占比之和允许 > 100%，页面标注“多选题按答题人数计算”。

#### P0-6 语义去考试化（0.5 人日）

- **改动点**：问卷模式隐藏“得分”列/详情得分；交卷成功页按 mode 分支，不显示分数/成绩单/排名/错题/收藏；按钮文案“提交”而非“交卷”。
- **验收**：问卷全流程 grep 不到“得分/成绩单/排名/错题”；考试流程不变。

**P0 总验收**：一份公开匿名问卷从创建到导出全链路走通；问卷设置页无考试控制；导出的时长/设备列有值；1 万份答卷报表不卡死。

---

### P1：从“看答卷”到“做分析”（12–15 人日）

**目标**：培训管理者能按班级/批次/题目条件筛选，出单题图表和交叉表，把结果以只读链接或 CSV/Word 交付。

#### P1-1 统一筛选 DSL（2–3 人日）

- `AnswerFilter` DTO：`startTime/endTime/keyword/classId/includeAnonymous/logic/conditions[]`；条件支持 `eq/in/contains/between/empty/notEmpty`。
- 服务端先把条件翻译成 `t_answer_item` 子查询得到 `answerIds`，再套 `t_answer` 分页；数据页、报表、导出共用同一套口径。
- 验收：题目条件 + 时间 + 关键词组合筛选，页面数量与导出数量一致。

#### P1-2 数据详情增强（2 人日）

- 列设置（按项目存 localStorage）、高级筛选抽屉、批量标记颜色、保存当前视图。
- 验收：刷新后列设置保留；筛选标签可删除；标记颜色可批量设置。

#### P1-3 统计图表服务端化（3 人日）

- `/questions` 支持 bar/column/pie 三种视图；文本题分页明细（不再只取 Top 50）；数值题 min/max/avg/sum；每张图显示有效样本量。
- 验收：1 万份、50 题报表首屏 < 2 秒；切换图表不重新拉全量。

#### P1-4 交叉分析（3–4 人日）

- `POST /api/report/{id}/cross`：行题/列题各 1 个（P1 先不做多题组合），只允许分类题（单选/多选/下拉/判断）；返回二维计数 + 行百分比；限制 10×10 选项；Excel 导出。
- SQL：`t_answer_item row JOIN t_answer_item col ON answer_id`，见 §5.2。
- 验收：按“班级 × 满意度”出表，行百分比分母为该行有效样本；导出的 Excel 与页面一致。

#### P1-5 数据分享页（2–3 人日）

- `t_data_share` 表；`/r/:token` 公开只读页；支持密码、字段白名单、筛选条件、显示表格/图表开关、启用/停用/重置链接；写审计。
- 验收：无登录窗口打开只显示白名单字段；密码错误 403；重置后旧链接 404。

#### P1-6 导出增强（1–2 人日）

- CSV（UTF-8 BOM，Excel 直接打开）、Word 统计报告（POI，复用报表数据）；SPSS 作为可选（需要 `.sav` 库，建议先用 CSV + 码表替代）。
- 验收：CSV 中文不乱码；Word 报告包含题目、样本量、选项占比、交叉表。

**P1 总验收**：培训满意度问卷可以完成“筛选 → 单题图 → 交叉表 → 分享/导出”闭环。

---

### P2：问卷设置与题型补全（12–15 人日）

**目标**：把后端已有、前端没入口的问卷能力接通，并补上问卷高频题型与服务端校验。

| 任务 | 内容 | 人日 | 验收 |
|---|---|---|---|
| P2-1 白名单 UI | 在设置页/协作者面板加“答卷人”管理（系统用户/外部导入），复用 `ProjectPartnerTypeEnum.RESPONDENT_*` + `whitelistLimit` | 2 | 白名单外的人打开链接被拒；名单内可答；限次生效 |
| P2-2 公开查询 UI | 配置 `submittedSetting.publicQuery`（字段权限/条件题/密码/有效期），复用 `PublicQuery.tsx` | 2 | 填写人可凭条件查/改自己的答卷；字段权限生效 |
| P2-3 微信设置 | `wechatOnly/wechatUserInfo` 开关 + 公众号配置提示 | 2 | 非微信打开被拒；微信内记录 openid/昵称 |
| P2-4 结果页 2.0 | 图标/标题/说明/变量插值（`#{answerId}`）/按答案跳转 | 2 | 不同答案进入不同结果页；变量有值 |
| P2-5 配额/唯一/选项随机 | 属性面板入口 + 选项随机开关 | 2 | 配额满提示；唯一重复提示；选项顺序随机但答案 key 不变 |
| P2-6 服务端必填/显隐校验 | 把前端 `visibleRule/requiredRule` 求值器移植到 Java；只对“可见且必填”的题校验；按项目开关 | 3–4 | 构造缺少必填的请求返回 400；隐藏的必填题不拦截 |
| P2-7 题型补齐 | `Upload`、`Signature`、`HorzBlank` 渲染器；图片选项编辑体验 | 3 | 新题型可答题、可导出、可在报表统计 |

**P2 总验收**：问卷设置页覆盖卷王“问卷显示/回收/结果页/白名单/公开查询”的主要项；服务端能拦住绕过前端的必填缺失。

---

### P3（可选，不排期）

- AI 数据分析（把报表 JSON 交给 LLM 出结论）
- 渠道管理（渠道链接/来源统计）
- 抽奖/红包/兑奖
- 模板中心/项目复制
- SPSS 导出

---

## 5. 技术设计

### 5.1 新表

```sql
-- 访问明细：PV/UV/渠道/设备；按 project_id + create_at 聚合
CREATE TABLE IF NOT EXISTS `t_project_visit` (
  `id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `visitor_hash` varchar(64) NOT NULL COMMENT 'cookie/指纹的 SHA-256，用于 UV',
  `channel` varchar(64) DEFAULT NULL COMMENT '渠道参数',
  `device_type` varchar(32) DEFAULT NULL,
  `platform` varchar(64) DEFAULT NULL,
  `browser` varchar(64) DEFAULT NULL,
  `region` varchar(64) DEFAULT NULL,
  `ip_hash` varchar(64) DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_visit_project_time` (`project_id`,`create_at`),
  KEY `idx_visit_project_visitor` (`project_id`,`visitor_hash`,`create_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='问卷访问明细';

-- 数据分享
CREATE TABLE IF NOT EXISTS `t_data_share` (
  `id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `token` varchar(64) NOT NULL,
  `password_hash` varchar(128) DEFAULT NULL,
  `config_json` text COMMENT '字段白名单/筛选/展示开关',
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `expire_at` timestamp NULL DEFAULT NULL,
  `create_by` varchar(64) DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_share_token` (`token`),
  KEY `idx_share_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='问卷数据分享链接';
```

补充索引（迁移 `41-answer-item-cross.sql`）：

```sql
ALTER TABLE t_answer_item
  ADD INDEX idx_item_project_question_option (project_id, question_id, option_id, answer_id);
```

### 5.2 交叉分析 SQL

```sql
SELECT r.option_id AS rowOption,
       c.option_id AS colOption,
       COUNT(DISTINCT r.answer_id) AS cnt
FROM t_answer_item r
JOIN t_answer_item c
  ON c.answer_id = r.answer_id
 AND c.project_id = r.project_id
WHERE r.project_id = #{projectId}
  AND r.question_id = #{rowQuestionId}
  AND c.question_id = #{colQuestionId}
  AND r.option_id IS NOT NULL
  AND c.option_id IS NOT NULL
GROUP BY r.option_id, c.option_id;
```

行百分比 = `cnt / 该行 option 的 distinct answer_id`；多选行允许同一答卷落多个列，页面标注“行百分比之和可能 > 100%”。

### 5.3 接口清单

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/api/public/visit` | 首屏访问埋点（cookie 去重） | 公开 |
| GET | `/api/report/{id}/overview` | 回收量/PV/UV/回收率/平均时长/每日/设备 | `project:report` |
| GET | `/api/report/{id}/questions` | 单题聚合（筛选参数） | `project:report` |
| POST | `/api/report/{id}/cross` | 交叉表 | `project:report` |
| GET | `/api/report/{id}/text` | 文本题分页明细 | `project:report` |
| POST | `/api/answer/share` | 创建/更新分享 | `answer:share`（新增） |
| GET | `/api/public/share/{token}` | 分享页数据（密码校验） | 公开 |
| POST | `/api/public/share/{token}/unlock` | 密码换短期 token | 公开 |

保留 `GET /api/report/{id}` 作为兼容接口，内部改为调用新聚合服务。

### 5.4 前端结构

- `client/src/pages/survey/Overview.tsx` 拆出 `setting/SurveySettingCards.tsx`、`setting/ExamSettingCards.tsx`。
- `client/src/pages/survey/Report.tsx` 改成 Tabs：`概览 / 统计图表 / 交叉分析 / 数据明细`；旧锚点 `/report` 仍可用。
- 新增 `client/src/pages/survey/report/OverviewCards.tsx`、`CrossTable.tsx`、`TextAnswerList.tsx`。
- 新增 `client/src/pages/survey/data/FilterDrawer.tsx`、`ColumnSetting.tsx`。
- 新增公开分享页 `client/src/pages/public/SharedData.tsx`（路由 `/r/:token`）。
- `Data.tsx` 的 `load` 增加 `includeAnonymous` 与筛选 DTO。

### 5.5 兼容与迁移

- **setting**：P0 不改 JSON 结构，只改渲染；P2 新增 `submittedSetting.resultPage` 等字段时全部给默认值，旧项目读取为 null 走旧逻辑。
- **匿名口径**：后端 `includeAnonymous` 默认保持 false；新前端显式传 true。老 API 调用方行为不变。
- **历史数据**：PV/UV 从上线日开始累计，不回填；平均时长对没有 `answerInfo` 的历史答卷显示“—”。
- **回滚**：新表与新接口独立；报表页保留旧 `/api/report/{id}` 路径，前端可一键回退。
- **文档**：改完后按仓库约定跑 `npm run docs:gen`、`npm run docs:check`，更新 `docs/modules/answer.md` / `docs/modules/project.md` / `docs/modules/survey.md`。

---

## 6. 验收与测试

### 6.1 功能验收（P0）

1. 新建问卷 → 发布 → 匿名提交 3 份 → 数据页显示 3 份（含匿名）→ 导出 3 行。
2. 切“仅实名” → 0 份；切回“含匿名” → 3 份。
3. 报表 total=3；题目来自项目 schema（即使先导入 100 份无快照答卷）。
4. 概览 PV/UV/回收率/平均时长有值；UV 去重正确。
5. 导出“填写时长/设备/OS/浏览器”非空。
6. 问卷设置页无考试控制；考试设置页与改动前一致。
7. 问卷详情/成功页无“得分/成绩单/排名/错题”。

### 6.2 性能验收

| 场景 | 目标 |
|---|---|
| 1 万份答卷、50 题，报表首屏 | < 2 秒（本机 MySQL，4C8G） |
| 交叉分析 10×10 | < 3 秒 |
| 数据页 1 万份分页查询 | < 500 ms |
| 导出 1 万份 xlsx | < 30 秒，内存不 OOM |

### 6.3 安全与隐私

- 匿名答卷：不写 `create_by`；详情不显示身份；导出只多一列“匿名”。
- 分享页：密码 + 字段白名单 + 停用/重置；敏感字段（手机号/身份证/邮箱）在配置时标记。
- 审计：查看匿名详情、创建/重置分享链接、导出答卷都写审计。
- 权限：`answer:share` 新增；`project:report` / `answer:list` 不变；学员仍然只能看自己的答卷。

### 6.4 回归范围

- 考试全流程：创建 → 组卷 → 判分 → 成绩单 → 排名 → 错题本。
- 答题页：逐题下发、草稿、倒计时、切屏、闯关。
- 导出：考试分数列仍存在；问卷不出现分数列。
- 权限：协作者 level1/2/3、班级授权、匿名认领。

### 6.5 自动化

- 后端单测：`AnonymousVisibilityTest`、`ReportOverviewTest`、`CrossAnalysisTest`、`AnswerFilterTest`。
- 前端：`npm run check`；现有 `test:rules` / `test:tree` 不能回归。
- 集成：扩展 `scripts/nas/smoke-test.py`，加“匿名问卷提交 → 数据页可见 → 导出”一条。

---

## 7. 排期与里程碑

| 迭代 | 周期 | 交付 | 依赖 |
|---|---|---|---|
| M1（P0） | 2 周 | 匿名可见、设置分家、元数据、概览、报表 fallback | 无 |
| M2（P1 上半） | 1.5 周 | 筛选 DSL、数据页列设置/高级筛选、统计图表服务端化 | M1 |
| M3（P1 下半） | 1.5 周 | 交叉分析、分享页、CSV/Word 导出 | M2 |
| M4（P2） | 2–3 周 | 白名单/公开查询/微信/结果页/配额/必填/题型 | M1；P2-6 依赖规则求值器 |

> P0 的第一天就可以先做 P0-1（匿名可见性），它是独立热修，不依赖其他设计。

---

## 8. 需要拍板的决策点

| # | 决策 | 建议 | 影响 |
|---|---|---|---|
| 1 | 匿名答卷默认对管理者可见，还是默认隐藏？ | **默认可见 + 可切“仅实名” + 审计** | 决定 P0-1 的默认值；影响隐私预期 |
| 2 | 数据分享页是否允许公开链接？ | **允许，但必须密码 + 字段白名单 + 可重置** | 决定 P1-5 的范围 |
| 3 | SPSS 是否必须？ | **先用 CSV（UTF-8 BOM）+ Excel**；SPSS 放 P3 | 影响 P1-6 选型 |
| 4 | 是否接受新增 `t_project_visit` 埋点表？ | **接受**；PV/UV/回收率是问卷结果的核心指标 | 决定 P0-4 是否能做 |
| 5 | 服务端必填校验是否对历史项目强制？ | **只对新提交生效 + 按项目开关**；历史答卷不追溯 | 决定 P2-6 的灰度方式 |
| 6 | 问卷和考试设置是“彻底分页”还是“同页按 mode 折叠”？ | **同页按 mode 分卡**（改动小、入口不变）；后续再考虑独立导航 | 决定 P0-2 的交互 |

---

## 9. 附录：现状证据索引

| 主题 | 文件 | 关键点 |
|---|---|---|
| 模式枚举 | `server/shared/.../ProjectModeEnum.java` | `survey/exam/folder` |
| 设置模型 | `server/shared/.../ProjectSetting.java` | `AnswerSetting/SubmittedSetting/ExamSetting` |
| 设置页 | `client/src/pages/survey/Overview.tsx` | 考试控制卡 L839–886；成绩单/解析 L950–951 |
| 数据页 | `client/src/pages/survey/Data.tsx` | 得分列 L244–255；筛选 L496–510；查询 L132 |
| 报表页 | `client/src/pages/survey/Report.tsx` | 快照取题 L59–64；全量拉取 L37–45 |
| 报表后端 | `server/rdbms/.../ReportServiceImpl.java` | 排除匿名 L36；内存聚合 L33–53 |
| 答卷查询 | `server/rdbms/.../AnswerServiceImpl.java` | 匿名过滤 L179–185；导出 L430–454；匿名创建 L306–318 |
| 校验 | `server/rdbms/.../ProjectAnswerValidator.java` | 唯一/配额 L122–178；考试窗口 L180–193 |
| 交卷 | `server/rdbms/.../PublicAnswerSubmitter.java` | 分数只 exam L121–132 |
| 导出列 | `server/shared/.../SchemaHelper.java` | 分数列 exam L111；元数据列 L115–120 |
| 导入 | `server/rdbms/.../AnswerUploadParser.java` | 导入答卷不写 `survey` L134–150 |
| 投影表 | `scripts/nas/migrate/25-answer-items.sql` | `t_answer_item` 结构 |
| 统计上限 | `server/rdbms/.../ProjectStatisticsService.java` | 20000 份 L40–50 |
| 题型面板 | `client/src/designer/defaults.ts` | 18 项 |
| 渲染注册 | `client/src/renderer/registerAll.ts` | 15 个组件 |
| 匿名体系 | `server/rdbms/.../AnonymousIdentityServiceImpl.java` | `sk-anon` / claim / purge |
| 范围文档 | `docs/architecture/scope.md` | 白名单前端入口列为缺口 |

---

## 10. 参考

- 卷王·数据管理：<https://www.surveyking.cn/help/data/>
- 卷王·数据概览：<https://www.surveyking.cn/help/data/data-overview/>
- 卷王·统计图表：<https://www.surveykingpro.cn/help/data/chart/>
- 卷王·交叉分析：<https://www.surveyking.cn/help/data/cross-analysis/>
- 卷王·分享数据：<https://www.surveyking.cn/help/data/share-data/>
- 卷王·发布设置：<https://www.surveyking.cn/help/settings/publish/>
- 卷王·问卷逻辑：<https://www.surveyking.cn/help/logic/>
- 卷王·自定义结果页：<https://www.surveyking.cn/help/settings/result-page/>
- 卷王·题型总览：<https://surveyking.cn/help/editor/question-types/>
- 问卷星·版本区别：<http://qywx.wjx.cn/mobile/themehtml/plan.aspx>
- 腾讯问卷·DSL：<https://wj.qq.com/docs/v24.07/survey-dsl/>
- 腾讯问卷·样本服务：<https://wj.qq.com/article/single-528.html>
