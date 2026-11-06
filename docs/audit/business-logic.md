# 业务逻辑审计：考试 / 答卷 / 评分 / 错题 / 题库练习

> 审计时间：2026-11-06 20:30–21:10
> 范围：`server/rdbms`（SurveyServiceImpl、AnswerServiceImpl、UserBookServiceImpl、RepoServiceImpl、RandomSurveyProcessor、ProjectViewMapper）、`server/shared`（AnswerScoreEvaluator、ProjectSetting、SchemaHelper、RepoTemplateExcelParseHelper）、`client/src/pages/answer`、`client/src/pages/exercise`、`client/src/pages/repo`、`client/src/pages/survey/Overview.tsx`、`client/src/pages/project/BatchSettingModal.tsx`
> 方式：**只读**。静态阅读 + `grep` + 4 组只读 HTTP 探针（`/api/public/projectOutline`、`/api/public/question`、`/api/public/loadExamResult`、`/api/template/list`，未写库、未改源码、未重启服务、未做 git 操作）。
> 基线：当前工作区（含未提交改动）`SurveyServiceImpl.java` 1655 行、`AnswerServiceImpl.java` 977 行、`PublicAnswer.tsx` 1498 行、`Practice.tsx` 698 行、`ExamResult.tsx` 633 行。
> 记号：**✅ 已实现** / **🟡 部分实现** / **❌ 未实现**。每条结论都带 `文件:行`；文末附可复跑的复核命令与探针原始结论。
> 改动范围：**只新增本文件**，未修改任何源码/配置（`git diff --stat` 为空），未提交。
> 与既有文档的关系：`docs/research/exam-limit-audit.md`、`docs/research/exam-mode-audit.md` 是**改造前**的结论，本文按当前代码复核，其中多条已被实现（练习模式即时判题、再考一次新建答卷、本场错题维度），不再重复它们的旧结论；`docs/audit/backend-data.md` 的 P0-2（@Async 错题身份）、P0-4（时间限制）、P0-5（重复提交）与本文互相印证，本文只补业务语义。

---

## 0. 结论摘要（先看这 10 条）

1. **「最短交卷 / 最长交卷」对首次提交完全无效**：服务端只在「更新已有答卷」时校验，而首次提交走的是新建分支，`previousAnswer == null` 直接放行（`AnswerServiceImpl.java:786-810` + `:765-777`）。前端倒计时只是提示，刷新即续。
2. **「错题练习」（`randomSurveyWrong`）没有实现**：全库唯一读取点是「强制登录」（`SurveyServiceImpl.java:1436-1448`），没有任何「只抽本场错题」的逻辑；打开这个开关，考试内容不变。
3. **主观题（简答）没有人工打分**：`manual` 判分模式只有枚举和设计器选项（`AnswerScoreEvaluator.java:30-34`、`attributeSchema.ts:55`），没有 evaluator，落到 `DefaultEvaluator` 恒 0 分；简答题实际靠「字符串全等」自动判分。
4. **填空/简答在缺 `examMatchRule` 时恒 0 分**：`optionValueMatchCorrectAnswer` 只在 `completeSame`/`contain` 两个分支命中（`AnswerScoreEvaluator.java:253-279`），而设计器和题库编辑器都没有这个字段的入口（`attributeSchema.ts:61-97`、`Questions.tsx:465-477`），只有 Excel 导入会写（`RepoTemplateExcelParseHelper.java:130`、`:143`）。
5. **三个开关是纯装饰**：「显示题目序号」「允许复制题目」「完成跳转」没有任何读取点（§1.1/§1.4）。
6. **随机卷可以无视「允许修改答案」重复提交**：随机卷走 cookie 分支，该分支不校验 `enableUpdate`（`SurveyServiceImpl.java:363-368`），而普通 id 分支才校验（`:373-383`）。
7. **知道 answerId 就能改/看别人的答卷**：`saveAnswer` 的 id 分支和 `loadExamResult` 都只校验「答卷属于该项目」，不校验「属于当前人」（`SurveyServiceImpl.java:373-383`、`:1131-1146`）。
8. **「显示成绩单」只在成绩单页生效**：交卷后的即时结果页无条件显示分数（`SurveyServiceImpl.java:407-410` + `PublicAnswer.tsx:1081-1085`）。
9. **题库练习完成后，「我的练习」里没有记录**：练习页提交 `projectId=exercise` 但不带 `examExerciseType`（`Practice.tsx:455-462`），而练习历史查询强制 `exam_exercise_type is not null`（`AnswerServiceImpl.java:476-479`）——DTO 其实有这个字段（`AnswerRequest.java:45`）。
10. **判断题/多选题的判分口径本身是对的**（集合全等），但**导入题库里有整批没有正确答案的题**（运行时：保育员四级前 3 题 `correctKids=0`），这些题永远 0 分，成绩单显示「未设置正确答案」。

---

## 1. 发布设置 → 实现状态总表

设置项的 UI 现在都在「项目概述」页（`client/src/pages/survey/Overview.tsx`），另有批量设置弹窗（`client/src/pages/project/BatchSettingModal.tsx`）。下表按页面分组，`存储字段` 都是 `ProjectSetting` 的路径。

> **统计（共 35 个设置项：编号 31 个 + 页面无入口的 4 个）**：✅ 已实现 13 个（进度条、一页一题、答题卡、开始时间、练习模式、随机顺序、需要登录、凭密码、回收截止、发布状态、允许修改答案、提交后提示、公开查询）；🟡 部分实现 15 个；❌ 未实现 7 个（显示题目序号、允许复制、错题练习、完成跳转、triggerType、defaultLocale、initialValues）。
> 对用户来说，「开关存得下、页面也回显」不等于生效——下面每个 🟡/❌ 都给了具体断点。

### 1.1 答题显示（`answerSetting`）

| # | 设置项 | 存储字段 | 状态 | 生效点与行为 | 证据 |
|---|---|---|---|---|---|
| 1 | 自动暂存 | `answerSetting.autoSave` | 🟡 部分实现 | 前端 600ms 防抖写 `localStorage` 草稿（有效）；远程暂存调 `/api/public/tempSaveAnswer`，但该接口要求 **已登录 + 随机卷 cookie**，普通考试永远静默 return；`saveAnswer` 缺省 `tempSave=1` | `PublicAnswer.tsx:363-372`、`:383-401`；`SurveyServiceImpl.java:675-696`；`AnswerServiceImpl.java:217-238` |
| 2 | 显示进度条 | `answerSetting.progressBar` | ✅ 已实现 | 顶部 2px 进度条，按已答/总题数 | `PublicAnswer.tsx:464`、`:1242-1243` |
| 3 | 一页一题 | `answerSetting.onePageOneQuestion` | ✅ 已实现 | 一页一题渲染 + 上一题/下一题；闯关模式会强制打开 | `PublicAnswer.tsx:470`、`:1312-1409` |
| 4 | 显示答题卡 | `answerSetting.answerSheetVisible` | ✅ 已实现 | 桌面常驻侧栏 + 移动端抽屉 | `PublicAnswer.tsx:465`、`:1234-1235`、`:1293-1308`、`:1462-1465` |
| 5 | 显示题目序号 | `answerSetting.questionNumber` | ❌ 未实现 | 设置能存能读进表单，但答题页/渲染器**没有任何读取点**，题号恒定显示 | 写入：`Overview.tsx:91`、`:184`、`:369`；`SchemaRenderer.tsx:57-65`、`shared.tsx:34-40` 恒定渲染；全库 `grep questionNumber` 无消费方 |
| 6 | 允许复制题目 | `answerSetting.copyEnabled` | ❌ 未实现 | 项目级开关无读取点；全站用的是**系统级**内容保护（CopyGuard） | 写入：`Overview.tsx:92`、`:185`、`:370`；实际生效的是 `components/CopyGuard.tsx:51-152`（`main.tsx:41-42` 全局挂载） |

### 1.2 考试控制（`examSetting`）

| # | 设置项 | 存储字段 | 状态 | 生效点与行为 | 证据 |
|---|---|---|---|---|---|
| 7 | 考试开始时间 | `examSetting.startTime` | ✅ 已实现 | 进入答题页、以及「首次提交且走 `validateAndGetLatestAnswer`」的分支会校验（`ExamUnStarted=6000`）；仅考试模式 | `SurveyServiceImpl.java:1000-1013`、`:324-339`、`:1021-1055` |
| 8 | 考试结束时间 | `examSetting.endTime` | 🟡 部分实现 | 同上校验；但「带 answerId 的改答案」路径不再走 `validateProject`，只走 `validateSubmittable`（不查 examSetting.endTime） | `SurveyServiceImpl.java:1000-1013`、`:353-398`、`:857-882` |
| 9 | 最短交卷（分钟） | `examSetting.minSubmitMinutes` | 🟡 部分实现 | 前端倒计时到点才允许点提交；服务端 `assertWithinTimeLimit` **只在 `previousAnswer != null` 时生效**，首次提交永远放行 | `PublicAnswer.tsx:702-716`、`:813-822`；`AnswerServiceImpl.java:786-810` |
| 10 | 最长交卷（分钟） | `examSetting.maxSubmitMinutes` | 🟡 部分实现 | 前端从「组件挂载」起算（刷新重置）；服务端同样只在更新已有答卷时按 `create_at` 判，给 60s 宽限 | `PublicAnswer.tsx:719-738`；`AnswerServiceImpl.java:786-799` |
| 11 | 最大切屏次数 | `examSetting.maxSwitchScreenTimes` | 🟡 部分实现 | 前端 `visibilitychange` → 上报 `/api/public/exam/switch-screen` 累加 → 达到上限自动交卷并锁 UI；**服务端只计数、不判定、不锁定**；匿名且没有 answerId 时后端返回 0，只能本地计数（刷新清零） | `PublicAnswer.tsx:744-790`；`SurveyServiceImpl.java:436-467`（`:457-459` 返回 0） |
| 12 | 练习模式 | `examSetting.exerciseMode` | ✅ 已实现 | 逐题下发时保留正确答案与解析（其它模式剥离），答题页选完即判、填空失焦判 | `SurveyServiceImpl.java:283-292`；`ProjectViewMapper.java:40-44`；`PublicAnswer.tsx:461-462`、`:1348-1386`、`:166-208` |
| 13 | 错题练习 | `examSetting.randomSurveyWrong` | ❌ 未实现 | 唯一读取点：开启后**强制登录**；没有任何「用错题本组卷」的逻辑，考试题目不变 | `SurveyServiceImpl.java:1436-1448`；全库仅此一处；UI：`Overview.tsx:415`、`BatchSettingModal.tsx:75` |
| 14 | 随机题目顺序 | `examSetting.randomOrder` | ✅ 已实现（有瑕疵） | 下发前打乱可计分题目顺序；判断题/填空/不计分题保持原序。瑕疵：每次请求都重洗（刷新即变序）；递归条件取的是父节点属性 | `ProjectViewMapper.java:45-50`、`:61-90`（`:84` 条件用错）；`RandomSurveyProcessor.java:170-176` |
| 15 | 闯关模式 | `examSetting.passMode` | 🟡 部分实现 | 前端：强制一页一题、不可跳题/回头、每题倒计时、超时自动推进；服务端：只按前端上报的 `metaInfo.passModeTimes/timeouts` 把超时题改判 0 分 | `PublicAnswer.tsx:467-470`、`:864-866`、`:881-970`；`SurveyServiceImpl.java:293-297`、`:503-548` |
| 16 | 闯关每题限时（秒） | `examSetting.passModePerSeconds` | 🟡 部分实现 | 后端也把限时塞进 `question.timeLimitSeconds`（`SurveySchema.java:48-50`），但前端读取的是 setting 里的值，不是题目上的值；且超时判定完全信任前端上报 | 同上；`PublicAnswer.tsx:468` |
| 17 | 交卷后显示排名 | `examSetting.rankingEnabled` | 🟡 部分实现 | **后端零引用**；真正生效的是 `submittedSetting.rankVisible`。概述页把两个字段一起写，所以从概述页打开能工作；批量设置页两个开关独立，只开 `rankingEnabled` 无效 | 后端：`SurveyServiceImpl.java:619`、`:636-638`（只读 rankVisible）；`grep getRankingEnabled` 无命中；`Overview.tsx:110`、`:214`、`:224`；`BatchSettingModal.tsx:72-73`、`:391-405` |

### 1.3 回收限制（`answerSetting`）

| # | 设置项 | 存储字段 | 状态 | 生效点与行为 | 证据 |
|---|---|---|---|---|---|
| 18 | 需要登录 | `answerSetting.loginRequired` | ✅ 已实现 | 进入答题页弹登录表单（用户名+密码），成功后可答题；提交时不复验 | `SurveyServiceImpl.java:1453-1463`、`:1596-1607`；注释 `:850-855` |
| 19 | 凭密码 | `answerSetting.password` | ✅ 已实现（有隐患） | 进入答题页先弹密码表单；密码**明文**存在 setting JSON；公开视图里被忽略不下发 | `SurveyServiceImpl.java:1465-1476`；`ProjectSetting.java:45-48`；`ProjectViewMapper.java:30` |
| 20 | 回收上限 | `answerSetting.maxAnswers` | 🟡 部分实现 | 进入答题页与新建答卷时校验；`count()` **不带 `isNotNull(answer)`**，随机卷占位草稿也算一条；「先查后写」非原子，理论上可超发 | `SurveyServiceImpl.java:900-909`、`:872-881`；`AnswerServiceImpl.java:275-283` |
| 21 | 每 IP 限次 | `answerSetting.ipLimit` | 🟡 部分实现 | 只在**进入答题页**时校验（提交不校验）；`count()` 用 `metaInfo like '%ip%'` 做 JSON 子串匹配（`10.0.0.1` 会命中 `10.0.0.10`）；IP 只在新建答卷时补齐 | `SurveyServiceImpl.java:927-929`、`:1182-1193`、`:1206-1223`；`AnswerServiceImpl.java:245-272`、`:275-283` |
| 22 | 每台设备限次 | `answerSetting.cookieLimit` | 🟡 部分实现 | 同上；首次访问下发 cookie 后**直接放行**；`response.addCookie(cookie)` 连写两次（无害） | `SurveyServiceImpl.java:923-925`、`:1160-1180`（`:1172-1173` 重复） |
| 23 | 回收截止时间 | `answerSetting.endTime` | ✅ 已实现 | 打开答题页与提交时都校验（`ExceededEndTime=4011`） | `SurveyServiceImpl.java:868-871`、`:911-916` |
| 24 | 白名单（系统用户/导入用户） | `answerSetting.whitelistType` / `whitelistLimit` | 🟡 部分实现 | 后端逻辑完整（登录表单校验白名单、答题次数限制、答完回写 partner 状态）；**前端没有任何入口写 `whitelistType`** | 后端：`SurveyServiceImpl.java:1478-1555`、`:931-933`、`:1195-1204`、`:1614-1649`；前端：`grep whitelist` 只有 `schema/project.ts:46-47` 与 i18n 文案，无 UI |
| 25 | 只能微信作答 / 微信用户信息 | `answerSetting.wechatOnly` / `wechatUserInfo` | 🟡 部分实现 | 后端有完整校验与 OpenID 收集；前端设置页无开关（仅 i18n 残留） | `SurveyServiceImpl.java:808-833`、`:768-775`；`OAuthServiceImpl.java:157`、`:168`；Overview 无对应项 |

### 1.4 提交与分享（`submittedSetting`）

| # | 设置项 | 存储字段 | 状态 | 生效点与行为 | 证据 |
|---|---|---|---|---|---|
| 26 | 发布状态 | `setting.status` | ✅ 已实现 | `status=0` → `SurveySuspend(4000)`；打开与提交都校验；概述页保存时会额外同步 `t_project.status` 列 | `SurveyServiceImpl.java:865-867`、`:896-898`；`Overview.tsx:243-250` |
| 27 | 允许修改答案 | `submittedSetting.enableUpdate` | ✅ 已实现（有绕过口） | 前端出现「修改答案」；后端在带 id 的提交上校验，未开则 `AnswerChangeDisabled(4020)`；**随机卷 cookie 分支不校验** | `PublicAnswer.tsx:1086-1090`、`:17-18`、`:677-682`；`SurveyServiceImpl.java:373-383` vs `:363-368`；`ErrorCode.java:52` |
| 28 | 显示成绩单 | `submittedSetting.transcriptVisible` | 🟡 部分实现 | 成绩单页仅在开启时下发分数；**交卷后立即展示的即时结果页无条件显示分数** | `SurveyServiceImpl.java:632-634`、`:407-410`；`PublicAnswer.tsx:1081-1085` |
| 29 | 显示答案解析 | `submittedSetting.answerAnalysis` | 🟡 部分实现 | 成绩单页：开启且「考试结束」才下发答案与解析；即时结果页：只看开关、不看考试结束时间，且非练习模式拿不到正确答案（逐题下发已剥离） | `SurveyServiceImpl.java:626-630`、`:761-766`；`PublicAnswer.tsx:1058-1067`；剥离逻辑 `SurveyServiceImpl.java:285-292` |
| 30 | 完成跳转 | `submittedSetting.redirectUrl` | ❌ 未实现 | 服务端零引用、答题页零引用；交卷后固定在当前页展示结果 | 全库 `grep getRedirectUrl` 只命中 OAuth 无关代码；`PublicAnswer.tsx` 无 |
| 31 | 提交后提示内容 | `submittedSetting.contentHtml` | ✅ 已实现 | 交卷后 `submittedHtml || contentHtml` 作为富文本展示 | `PublicAnswer.tsx:1059`、`:1076-1080`；`PublicProjectView.java:39` |

### 1.5 代码里存在、但页面没有入口的设置

| 设置项 | 存储字段 | 状态 | 说明 | 证据 |
|---|---|---|---|---|
| 校验触发时机 | `answerSetting.triggerType` | ❌ 未实现 | 无 UI、无读取；渲染器固定「失焦/提交时」校验 | `ProjectSetting.java:129-132`；`grep getTriggerType` 无命中 |
| 默认语言 | `answerSetting.defaultLocale` | ❌ 未实现 | 无 UI、无读取 | `ProjectSetting.java:139-142` |
| 问卷初始值 | `answerSetting.initialValues` | ❌ 未实现 | 公开视图会带出去，但答题页不读 | `ProjectSetting.java:70`；`PublicAnswer.tsx` 无 |
| 公开查询 | `submittedSetting.publicQuery` | ✅ 已实现（独立功能） | 公开查询页有完整校验（开关/有效期/密码/字段权限） | `SurveyServiceImpl.java:1225-1264`、`:1311-1330` |

### 1.6 同名不同义 / 双份开关（容易踩）

1. **两个「排名」**：`submittedSetting.rankVisible`（真正生效）与 `examSetting.rankingEnabled`（后端零引用）。概述页已合并成一个开关并同时写两个字段（`Overview.tsx:60-61`、`:110`、`:214`、`:224`），批量设置页没有合并（`BatchSettingModal.tsx:72-73`、`:391-405`）→ 批量设置里只勾「显示排名（考试）」不生效。
2. **两个「结束时间」**：`answerSetting.endTime` = 回收截止（`Overview.tsx:472`），`examSetting.endTime` = 考试窗口结束（`Overview.tsx:389`）。前者在提交时校验，后者只在打开/常规校验时判（§1.2 #8）。
3. **两个「自动保存」**：`answerSetting.autoSave` 既驱动本地草稿也驱动远程草稿，但远程草稿另有「登录 + 随机卷」前提（§1.1 #1）。
4. **两套「防复制」**：项目级 `answerSetting.copyEnabled`（未实现）与系统级 CopyGuard（实现）。用户以为关掉项目开关就能复制，实际是反的。

---

## 2. 评分口径

### 2.1 入口与开关

- 只在「考试模式 + 非练习项目」里算分：`computeExamScore`（`AnswerServiceImpl.java:840-857`）→ 取 schema（随机卷优先用答卷快照 `:843-850`）→ `AnswerScoreEvaluator.eval()`。
- 触发点：`beforeSaveAnswer`（`:765-777`）里每次「带 `answer` 的保存」都会重算；`tempSaveAnswer` 只写 `tempAnswer`、`answer == null`，所以**草稿不参与判分**。练习项目 `projectId=exercise` 直接跳过（`:841-842`），**题库练习不判分**。

### 2.2 题型 × 判分模式矩阵

`AnswerScoreEvaluator` 里有 4 个 evaluator，命中条件是：`examScore != null` **且** `examAnswerMode` 等于其一 **且** `answer.get(qId) != null`（`AnswerScoreEvaluator.java:104-111`、`:146-153`、`:184-191`、`:222-229`）。否则落到 `DefaultEvaluator` 返回 0（`:233-245`）。

| 题型 | 需要的 `examAnswerMode` | 计分方式 | 备注 |
|---|---|---|---|
| 单选 Radio / 判断 Judge | `onlyOne` | 选中项是正确项、且只选了一个 → 得**题目分**；否则 0 | `:82-113`；多选一项检查在 `:96-97` |
| 多选 Checkbox | `selectAll` | 所选集合**完全等于**正确集合才得分；多选/少选/选错一律 0 | `:115-155`（`:129-141`） |
| 填空 FillBlank / 多空 MultipleBlank | `selectAll` 或 `selectCorrect` | 文本逐空比对；`completeSame` 全等、`contain` 标准答案包含作答；正确答案可用换行分隔多个写法 | `:157-193`、`:253-279`、`isBlank :286-293` |
| 简答 Textarea | 同上 | 同上（纯字符串比对，没有语义/人工） | 同上 |
| 任意题设为 `selectCorrect` | `selectCorrect` | **按选项分求和**；选择题若选了非正确项 → 整题 0 | `:157-193`（`:171-174`、`:178`） |
| 任意题设为 `select` | `select` | 按每个选项自己的 `examScore` 求和；选项没配分 → 0 + 警告日志 | `:195-231`（`:211-216`） |
| 任意题设为 `manual` | `manual` | **没有实现** → 0 分 | 仅枚举 `SurveySchema.java:297`；evaluator 列表 `AnswerScoreEvaluator.java:30-34` 无 manual |
| 任意题设为 `none` | `none` | 不计分 | 同上 |

### 2.3 未作答 vs 答错

- **计分上完全不区分**：未作答时 `support()` 因 `answer.get(qId) == null` 不命中 → `DefaultEvaluator` → 0；作答但错 → 0。`questionScore` 里两者都记 0（`AnswerScoreEvaluator.java:52-63`）。
- 唯一区分在**错题本**：只收「0 分 + 真的有作答」的题（`UserBookServiceImpl.java:88-90`、`hasAnswer :143-158`），未作答不进错题本。
- 成绩单/解析页（本轮已重做）能分别显示「未作答 / 回答错误 / 回答正确」，但那只是展示层判定，不影响分数。

### 2.4 没配分值是否一律 0 分

**是。** 所有 evaluator 的 `support()` 都要求 `qSchema.getAttribute().getExamScore() != null`（`AnswerScoreEvaluator.java:110`、`:152`、`:190`、`:228`），否则 `DefaultEvaluator` 返回 0（`:233-245`）。补充：
- 选项级分值只有 `select`/`selectCorrect` 用；选项没配分时 `select` 记 0 + warn（`:211-216`），`selectCorrect` 会 **NPE**（`:178`，见 §2.6）。
- 题目分值来源：Excel 导入的 `examScore` 列（`RepoTemplateExcelParseHelper.java:174`、`:205`）、组卷时按题型批量设分（`ComposeModal.tsx:149-161`）、设计器属性面板（`attributeSchema.ts:81`）、题库编辑页（`Questions.tsx:471`）。

### 2.5 计分配置从哪来（决定「为什么很多题 0 分」）

| 配置 | 谁能写 | 证据 |
|---|---|---|
| `examScore`（题目分） | 导入 / 组卷 / 设计器 / 题库编辑 | 同上 |
| `examAnswerMode`（判分模式） | **只有 Excel 导入和设计器属性面板**；题库编辑页保存时**不写** | `RepoTemplateExcelParseHelper.java:105`、`:116`、`:129`、`:142`；`attributeSchema.ts:82-88`；`Questions.tsx:465-477`（只写 examScore/examAnalysis） |
| `examMatchRule`（填空匹配规则） | **只有 Excel 导入**；设计器属性面板没有这个字段 | `RepoTemplateExcelParseHelper.java:130`、`:143`；`attributeSchema.ts:61-97` 无该 key |
| 选项级 `examCorrectAnswer` | 导入 / 题库编辑 / 设计器？**设计器不能**（选项编辑器没有「设为正确」） | `Questions.tsx:405-420`；`designer/OptionEditor.tsx:9-90`（只有增删改文案） |

> 结论：**用设计器自建的选择题无法自动判分**（选项级正确答案无处可填）；**用设计器自建的填空/简答即使填了正确答案也恒 0**（没有 `examMatchRule`）；在题库编辑页「新建/编辑」的题如果原本没有 `examAnswerMode`，保存后仍然没有 → 恒 0。

### 2.6 评分缺陷清单

| 编号 | 问题 | 证据 | 影响 |
|---|---|---|---|
| S-1 | `selectCorrect` 在选项未配分时 **NPE**：`sum += option.getAttribute().getExamScore()` 直接拆箱 | `AnswerScoreEvaluator.java:178`（选项分默认 null，导入不写：`RepoTemplateExcelParseHelper.java:196-198`） | 设了「按答对项计分」的题一提交就 500 |
| S-2 | `examMatchRule` 为 null 时填空恒 0 | `:269-277`；前端无入口（§2.5） | 自建填空题全 0 |
| S-3 | `manual` 模式恒 0 | `:30-34`、`:233-245` | 主观题无法人工判分 |
| S-4 | `select` 模式选项没配分时全 0（只有 warn 日志） | `:211-216` | 分值静默丢失 |
| S-5 | 判分用的 schema 可被客户端影响（更新已有答卷时优先 `existAnswer.getSurvey()`） | `AnswerServiceImpl.java:843-850`；`Answer.survey` 由请求体直接映射（`AnswerViewMapper.java:14`） | 先交一份改过 schema 的答卷，再改答案即可改判分口径（与 `backend-data.md` P0-6 同源） |
| S-6 | 题库里存在「没有正确答案」的题 | 运行时：`/api/template/list` 中 repo `2118342652941348865`（保育员四级）前 3 题 `correctKids=0`（题干/选项都在，但没有任何选项带 `examCorrectAnswer`，属导入期丢答案） | 这些题永远 0 分、成绩单显示「未设置正确答案」 |
| S-7 | 判断题依赖 `dataSource` 渲染 √/×，但导入题没有 dataSource；渲染层用 `optionsOf` 兜底后正常 | `answers.ts:20-32`、`Judge.tsx:9` | 已通过 `optionsOf` 兜底修复；新增题型别再用裸 `toOptions(schema.dataSource)` |
| S-8 | 题目分值与判分模式在「项目」里没有编辑入口，只能回题库/设计器改 | `BatchSettingModal.tsx` 无分值项；`Overview.tsx` 无 | 组卷后想调分只能重建项目或改题库模板 |

---

## 3. 成绩单与解析

### 3.1 数据来源

- 页面：`/s/:id/exam-result/:answerId` → `POST /api/public/loadExamResult`（`SurveyApi.java:161-164`、`router.tsx:70`）。
- 服务端：`loadExamResult`（`SurveyServiceImpl.java:615-650`）：
  - `answerAnalysis && examFinished` → 下发 `answer` + `schema`（`:626-630`）；
  - `transcriptVisible` → 下发 `examScore`（`:632-634`）；
  - `rankVisible` → 下发 `rank`（`:636-638`）；
  - 随机卷优先用答卷快照，但**仅当快照里还有 `examCorrectAnswer`**（`:639-647`、`containsCorrectAnswer :659-672`）。
- 正确答案读取口径（前端）：选择题 `children[].attribute.examCorrectAnswer` 非空即正确项；填空/简答 `children[0]`，兜底题目级（`ExamResult.tsx:183-252`、`:172-180`）。
- 运行时复核：`loadExamResult` 现在能返回 378 个选项级正确答案（修复前是 0），说明「老快照缺答案 → 回退项目 schema」的兜底已生效（附录 A.3）。

### 3.2 历史快照与当前题目不一致

快照从哪来：答题页提交时把「逐题拉到的 schema」拼成整卷一起提交（`PublicAnswer.tsx:627-642`、`:651-662`），`Answer.survey` 由 `AnswerViewMapper` 同名字段直接落库（`AnswerViewMapper.java:14`、`Answer.java:45-49`）。

由此产生 4 个不一致场景：

| 场景 | 表现 | 证据 |
|---|---|---|
| 非练习模式的快照被剥掉了正确答案（逐题接口对 exam 模式剥离 `examCorrectAnswer/examScore/examMatchRule/examAnalysis`） | 成绩单改用**项目当前 schema**，因此「正确答案」正常，但题目集合/文案是**现在**的，不是当时作答的 | `SurveyServiceImpl.java:285-292`；`:639-647` |
| 随机抽题（每人一套题） | 快照被覆盖成剥离版后，回退到项目 schema：若项目本身没有手工题，成绩单**一道题都没有**（空态）；若有手工题，则只显示手工题 | `RandomSurveyProcessor.java:105-110`、`:165-176`、`:190-209`；`SurveyServiceImpl.java:626-647` |
| 题目被删/改 | 快照无正确答案时按当前 schema 渲染：被删题的答案在页面上**不出现**（静默丢失）；改过选项的题会把旧 answer key 当「已删除选项」显示 id | `ExamResult.tsx:183-213`（按 id 匹配选项）、`:478-482`（按当前 schema 遍历） |
| 老答卷 + 项目已改 | 同上，历史成绩单的「正确答案」跟着项目走，不是当时的 | 同上 |

### 3.3 排名

- 计算在 `getAnswer`：把所有答卷分数取出来排序，用 `scores.indexOf(answerView.getExamScore()) + 1`（`AnswerServiceImpl.java:186-193`）。
- 问题：
  1. 答卷 `examScore == null`（未提交/占位草稿）会被映射成 0 分参与排序（`:187-190`）→ 正常答卷的排名被 0 分项挤后；
  2. `examScore` 为 null 的答卷自己算排名时 `indexOf(null)` = -1 → `rank = 0`（前端会显示「第 0 位」）；
  3. 只有 `rankVisible` 生效，`rankingEnabled` 无效（§1.2 #17）。
- 前端展示：成绩单页大字分数 + 「排名第 N 位」（`ExamResult.tsx:538`、`:576`）；学员任务列表另用 `/api/public/attempts` 展示历次成绩（`exercise/List.tsx:383-395`、`:425-431`）。

### 3.4 即时结果页 vs 成绩单页（两套解析，口径不同）

| 维度 | 交卷后立即看到（`PublicAnswer.tsx:1058-1107`） | 成绩单页（`ExamResult.tsx`） |
|---|---|---|
| 分数 | **无条件显示**（不受 transcriptVisible 控制） | 受 `transcriptVisible` 控制 |
| 解析开关 | 只看 `answerAnalysis` | `answerAnalysis` + 考试已结束 |
| 正确答案 | 用前端提交的 schema（非练习模式已被剥离）→ 基本看不到正确答案 | 用服务端回退后的项目 schema → 正常 |
| 题目集合 | 刚提交的那份 | 项目当前 schema（见 §3.2） |

> 用户视角的坑：开了「显示答案解析」，交卷那一刻看到的是没有正确答案的卡片；刷新/从成绩单入口进去才有。建议即时结果页改为「跳转到成绩单页」或由后端在提交响应里带回完整解析。

---

## 4. 错题本

| 维度 | 现状 | 证据 |
|---|---|---|
| 收集时机 | 仅公开提交接口 `saveAnswer` 的考试分支调用；练习项目跳过 | `SurveyServiceImpl.java:407-417`（`:408` 排除 exercise） |
| 收集条件 | 该题 `questionScore == 0` **且** 该题真的有作答；未作答不收 | `UserBookServiceImpl.java:88-90`、`hasAnswer :143-158` |
| 是否登录 | 必须是登录用户，匿名考试不收集 | `UserBookServiceImpl.java:80-82` |
| 去重键 | `(create_by, type=错题, project_id, template_id)`；同一场考试重复错同一题 → `wrong_times+1`；不同考试 → 两条 | `UserBookServiceImpl.java:96-110`、`:117-136` |
| 跨考试 | 支持（`project_id` 维度）；错题本页有「来源考试」筛选 | `UserBookServiceImpl.java:99-104`；`RepoServiceImpl.java:277`；`Book.tsx:75`、`:506`、`:620` |
| 题干兜底 | 题库题用模板名；设计器自建题用题干（截断 200 字） | `UserBookServiceImpl.java:112-136`、`:170-180` |
| 练习入口 | 错题本页 → `/repo/book/practice`（按来源考试/重点/次数筛选后练习） | `Book.tsx:402-412`；`BookPractice.tsx:283-382` |
| 练习时的答案 | 练习接口 `withAnswer=1` 才下发正确答案（只有本人错题本里的题可取） | `RepoServiceImpl.java:284-301`；`BookPractice.tsx:328-335` |
| 练习结果回写 | **不回写**：本地判分、可标「已掌握/重点」，没有提交、不增加 `wrong_times`、不产生练习记录 | `BookPractice.tsx:330-370`、`:423-429`；无 saveAnswer 调用 |
| 考试里的「错题练习」 | **未实现**（§1.2 #13） | `SurveyServiceImpl.java:1436-1448` |

其他事实：
- 错题本写入是 `@Async`，存在「身份串号 / 主事务回滚仍落库」风险，见 `docs/audit/backend-data.md` P0-2，此处不重复。
- 题库练习（`Practice.tsx`）**不会**产生错题（因为练习项目不算分、也不调错题收集）。

---

## 5. 题库练习

| 维度 | 现状 | 证据 |
|---|---|---|
| 题目来源 | 顺序练习 `/api/template/list`（分页）；随机练习 `/api/repo/pick`（一次抽全） | `Practice.tsx:175-185`、`:312-333` |
| 懒加载 | 首屏只取第 1 页（`PAGE_SIZE = 10`），滚动哨兵/跳到第 N 题时按页追加；并发 1 页串行追加，按 id 去重；翻页无新题视为到头 | `Practice.tsx:29`、`:188-227`、`:229-241`、`:410-423` |
| 提交完整性 | 提交前把剩余页全部补加载，仍缺则报错；提交 `survey=整卷`、`answer=values`、`tempSave=1` | `Practice.tsx:439-462`（`:445-453` 补齐循环） |
| 提交落点 | `POST /api/public/saveAnswer`，`projectId='exercise'`（后端识别为练习项目，跳过判分与错题收集） | `Practice.tsx:457-462`；`ExerciseProjectTemplate.java:10-30` |
| 练习记录 | 🟡 **不出现**：`/api/exercise/list` 强制 `exam_exercise_type is not null`，而练习页没传这个字段（DTO 其实有） | `AnswerServiceImpl.java:472-479`；`AnswerRequest.java:45`；`Practice.tsx:455-462` 的注释已承认 |
| 继续练习 | ✅：每次答题/切题写 `localStorage`（`practice:<repoId>`），`?mode=resume` 恢复题目/答案/序号/布局；提交成功即清除 | `Practice.tsx:44`、`:270-310`、`:383-404`、`:463` |
| 随机练习 | ✅：按题型数量调 `/api/repo/pick`，一次给全，不再分页 | `Practice.tsx:312-333` |
| 选项渲染 | ✅：Excel 导入题没有 `dataSource`，渲染层用 `optionsOf()` 从 children 兜底（已修复） | `answers.ts:20-32`；运行时复核见附录 A.4 |
| 练习判分 | ❌ 不判分、不给答案（练习页只提交，无判题） | `AnswerServiceImpl.java:841-842` 跳过；`Practice.tsx` 无判题 |
| 错题练习（题库维度） | ✅ 独立页面 `/repo/book/practice`，本地判分 | §4 |

> 缺口小结：练习完成 → 没有记录、没有分数、没有错题沉淀，「我的练习」里看不到任何新练习（只能看到历史/旧数据）。最小修复：提交时带上 `examExerciseType`（O/R/W），后端已在 `historyExercise` 里按它过滤，DTO 也已支持。

---

## 6. 状态机：草稿 → 提交 → 修改 → 再考一次

### 6.1 状态定义

- `t_answer.temp_save`：`0` 暂存、`1` 已完成（`Answer.java:65-68`）。注意 `saveAnswer` 在请求没带 `tempSave` 时**默认写成 1**（`AnswerServiceImpl.java:222-224`）。
- `t_answer.answer` / `temp_answer`：最终答案 / 草稿（`Answer.java:33-43`）。
- 外部入口：`/api/public/saveAnswer`（提交/修改）、`/api/public/tempSaveAnswer`（草稿，仅登录+随机卷）。

### 6.2 转换表

| 起点 → 终点 | 触发 | 服务端行为 | 证据 |
|---|---|---|---|
| 无 → 新答卷 | 首次 `saveAnswer`（无 id / 无 cookie） | `validateSubmittable` + `validateProject` → 新建（UUID，无幂等键） | `SurveyServiceImpl.java:384-402`；`AnswerServiceImpl.java:225-238` |
| 无 → 新答卷（随机卷） | 打开答题页 | `RandomSurveyProcessor` 先建一条 `tempSave=1`、`answer=null` 的占位答卷并下发 7 天 cookie | `RandomSurveyProcessor.java:190-209` |
| 草稿 → 完成 | `saveAnswer` 带 id | 走更新；`enableUpdate=false` 时**只有 `tempSave=0` 的暂存能覆盖**，正式提交被 4020 拒 | `SurveyServiceImpl.java:373-383` |
| 完成 → 修改 | 「修改答案」→ 再提交 | `enableUpdate=true` 时允许更新（取本人最近一份）；跨考试时间仍可改（§1.2 #8） | `SurveyServiceImpl.java:1021-1055`；`PublicAnswer.tsx:851-855` |
| 完成 → 再考一次 | `?fresh=1` | 清本地凭证/草稿，提交时 `freshAttempt=true` → 跳过「复用最近一份」，直接新建一条 | `PublicAnswer.tsx:214-215`、`:294-300`、`:329-337`、`:656-657`；`SurveyServiceImpl.java:385-390` |
| 完成 → 覆盖旧答卷 | 随机卷 cookie 存在时的再次提交 | **不校验 `enableUpdate`**，直接更新 cookie 指向的答卷 | `SurveyServiceImpl.java:363-368` |

### 6.3 互斥性与重复提交

| 问题 | 说明 | 证据 |
|---|---|---|
| 随机卷绕过「允许修改答案」 | cookie 分支优先于 id 分支，`enableUpdate` 校验被跳过；表现：随机抽题的考试交完刷新还能改 | `SurveyServiceImpl.java:363-368` vs `:373-383` |
| 任意 answerId 可被覆盖 | id 分支只校验「答卷属于该项目」，不校验当前用户；成绩单链接里就带 answerId | `SurveyServiceImpl.java:373-383`、`:1131-1146` |
| 重复提交产生多条 | 新建分支无幂等键；前端只用 `submittingRef` 防连点，网络重试/刷新后仍可能两行（与 `backend-data.md` P0-5 一致） | `PublicAnswer.tsx:620-690`；`AnswerServiceImpl.java:225-238` |
| 再考一次无次数限制 | 没有「最多考 N 次」设置；`?fresh=1` 可无限重考（只受回收上限约束）；配合「显示答案解析」可先看答案再重考 | `PublicAnswer.tsx:215`；`ProjectSetting.java` 无对应字段 |
| 考试结束后还能改已有答卷 | 带 id 的提交不再走 `validateProject`，`validateSubmittable` 只看回收截止 | `SurveyServiceImpl.java:857-882` |
| 必填只在客户端 | 服务端无 `required` 校验（只校验 unique/quota），直接 POST 可绕过 | `SurveyServiceImpl.java:942-998`；`PublicAnswer.tsx:584`、`:830-839` |
| 草稿计数 | 随机卷占位草稿 `tempSave=1` + `answer=null`：数据页看不见（`isNotNull(answer)`），但会占回收上限、进排名分母 | `AnswerServiceImpl.java:75`、`:275-283`、`:186-193` |

---

## 7. 问题清单（分级 + 修复建议）

### P0（功能被绕过 / 数据错 / 安全）

**P0-1 随机卷提交绕过「允许修改答案」**
- 证据：`SurveyServiceImpl.java:363-368`（cookie 分支只 `getAnswerForProject`）、`:373-383`（id 分支才判 `enableUpdate`）。
- 影响：随机抽题考试交卷后可反复覆盖，成绩可刷；「只允许考一次」的承诺失效。
- 修复：cookie 分支同样读 `submittedSetting.enableUpdate`（或显式只允许 `tempSave=0` 的草稿覆盖）。

**P0-2 任何人知道 answerId 就能看/改别人答卷**
- 证据：`SurveyServiceImpl.java:373-383`、`:1131-1146`（只比对 projectId）；`loadExamResult` 同样只校验 projectId（`:616-619`）。
- 影响：成绩单链接（含 answerId）转发即泄露作答内容；同一问卷内可覆盖他人答卷。
- 修复：`getAnswerForProject` 增加「答卷 create_by == 当前用户 或 本人白名单 partner」校验；管理员走管理接口。

**P0-3 最短/最长交卷对首次提交无效**
- 证据：`AnswerServiceImpl.java:786-810`（`previousAnswer == null` 直接 return）+ `:225-238`（首次提交走新建）。
- 影响：用户关掉前端脚本或刷新即可无视限时；与设置的承诺不符。
- 修复：新建答卷时把「开始作答时间」随请求/服务端下发（或让随机卷/首屏就落一条 draft），以该时间为起点判；前端不得是唯一判据。

**P0-4 主观题无法判分（manual 未实现）+ 简答仅字符串全等**
- 证据：`AnswerScoreEvaluator.java:30-34`、`:233-245`；`attributeSchema.ts:55`。
- 影响：简答题基本全 0 分；老师无法补分（没有阅卷界面）。
- 修复：实现 manual 模式的「人工打分」视图（数据页可改 `questionScore` 并重算总分），或明确从产品上移除该选项。

**P0-5 填空题缺 `examMatchRule` 恒 0**
- 证据：`AnswerScoreEvaluator.java:253-279`；设计器无此字段（`attributeSchema.ts:61-97`）、题库编辑不写（`Questions.tsx:465-477`）。
- 修复：evaluator 对 null 规则默认按 `completeSame` 处理（一行兜底）；同时把规则暴露到设计器/题库编辑。

### P1（用户明显感知「设置没用」）

**P1-1 错题练习开关未实现**（`SurveyServiceImpl.java:1436-1448`）——建议先隐藏该开关，或实现「按 projectId 从错题本抽题组卷」。

**P1-2 三个装饰性开关：显示题目序号 / 允许复制 / 完成跳转**
- 证据：`Overview.tsx:369-370`、`:543-545`；无消费方。
- 建议：至少让 `questionNumber` 在 `SchemaRenderer` 里生效（加 `showNumber` 参数）；`redirectUrl` 在交卷成功后 `location.replace`；`copyEnabled` 要么接到 CopyGuard（项目级优先），要么删掉。

**P1-3 交卷即时页与「显示成绩单/解析」不一致**（`PublicAnswer.tsx:1058-1107` vs `SurveyServiceImpl.java:626-638`）。建议即时页只显示「已提交 + 跳转成绩单」，或由后端在 `saveAnswer` 响应里按开关带回解析。

**P1-4 排名算法脆弱 + rankingEnabled 无效**（`AnswerServiceImpl.java:186-193`；`SurveyServiceImpl.java:619`）。建议改为 SQL 窗口函数/排序后按名次，过滤 `answer is not null`，并只保留 `rankVisible` 一个字段（`rankingEnabled` 标记 deprecated 或兼容读取）。

**P1-5 回收上限/每 IP/每设备把草稿算进去，且提交时不再校验**（`AnswerServiceImpl.java:275-283`；`SurveyServiceImpl.java:850-882`）。建议 `count` 增加 `tempSave=1 and answer is not null`；提交前补一次限制校验；IP/cookie 用结构化列或 JSON 精确匹配。

**P1-6 题库练习无记录、不判分、不进错题本**（`Practice.tsx:455-462`；`AnswerServiceImpl.java:472-479`、`:841-842`）。建议提交带 `examExerciseType`，并让练习项目也走「按题库模板判分 + 收错题」的轻量路径。

**P1-7 设计器/题库编辑无法配齐判分字段**（§2.5）。建议 `OptionEditor` 加「设为正确答案」，`attributeSchema` 加 `examMatchRule`，`Questions.tsx` 保存时补 `examAnswerMode` 默认值（按题型）。

**P1-8 成绩单对随机卷/老快照的题目集合不确定性**（`SurveyServiceImpl.java:639-647`；`RandomSurveyProcessor.java:190-209`）。建议：提交时**不要**用客户端 schema 覆盖服务端随机卷快照（或服务端合并：以服务端快照的题目集合为准，只更新答案）。

### P2（体验/一致性问题）

| 编号 | 问题 | 证据 | 建议 |
|---|---|---|---|
| P2-1 | 随机顺序每次刷新都变 | `ProjectViewMapper.java:45-50` | 按答卷/会话种子固定顺序 |
| P2-2 | `randomSchemaOrder` 递归条件用了父节点属性 | `ProjectViewMapper.java:83-87` | 改成 child |
| P2-3 | `passModePerSeconds` 下发到 `timeLimitSeconds` 但前端不读 | `SurveyServiceImpl.java:293-297`；`PublicAnswer.tsx:468` | 二选一，删掉冗余字段或前端改用题目字段 |
| P2-4 | 必填只在客户端校验 | `PublicAnswer.tsx:584`、`:830-839`；`SurveyServiceImpl.java:942-998` | 服务端补 required 校验（至少提交时） |
| P2-5 | 题库里有整批没有正确答案的题 | 运行时附录 A.4；`RepoTemplateExcelParseHelper.java:159-169` | 导入时统计并提示「N 道题缺答案」 |
| P2-6 | 项目级 copyEnabled 与系统级 CopyGuard 两套 | `Overview.tsx:370`；`CopyGuard.tsx:51-152` | 合并为一个层级 |
| P2-7 | 白名单/微信/triggerType/defaultLocale/initialValues 无 UI | §1.5 | 要么补 UI，要么从 DTO 移除避免误解 |
| P2-8 | 错题本 @Async 身份风险 | `UserBookServiceImpl.java:74`（详见 `backend-data.md` P0-2） | 显式传 userId 进异步方法 |

---

## 8. 复核方法（可复跑）

```bash
# 1) 五个「答题显示」设置在前端有没有消费方（预期：questionNumber/copyEnabled 只有设置页）
rg -n "questionNumber|copyEnabled" client/src

# 2) 排名两个字段：后端只读 rankVisible（预期：getRankingEnabled 无命中）
rg -n "getRankingEnabled|getRankVisible" server

# 3) 最短/最长交卷：服务端唯一读点（预期：AnswerServiceImpl 786-810）
rg -n "getMinSubmitMinutes|getMaxSubmitMinutes" server

# 4) 错题练习：唯一读点是「强制登录」（预期：1 处）
rg -n "getRandomSurveyWrong|randomSurveyWrong" server client/src

# 5) 评分模式与规则（预期：enum 5 个、evaluator 4 个、matchRule 只有导入写）
rg -n "examAnswerMode|examMatchRule" server/shared/src/main/java/cn/surveyking/server/core/uitls \
      client/src/designer/attributeSchema.ts client/src/pages/repo/Questions.tsx

# 6) 练习记录过滤条件（预期：examExerciseType is not null）
rg -n "getExamExerciseType" server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerServiceImpl.java

# 7) 允许修改答案的两个分支（预期：cookie 分支没有 enableUpdate）
rg -n "enableUpdate|answerIdFromCookie" server/rdbms/src/main/java/cn/surveyking/server/impl/SurveyServiceImpl.java
```

### 8.1 人工点检顺序（约 10 分钟，全部只读/可回滚）

1. 概述页把「最短交卷」设 1 分钟 → 匿名开一份新答卷 → 立刻点提交：前端会拦（说明前端生效）；再用浏览器直连 `POST /api/public/saveAnswer`（不带 id）→ **能提交成功**（说明服务端没拦，对应 P0-3）。
2. 打开一份随机抽题考试 → 交卷 → 刷新页面继续改 → 再交（`enableUpdate` 关闭也能成功，对应 P0-1）。
3. 交卷后看即时结果页 → 关掉「显示成绩单」再交一份 → 即时页仍然显示分数（P1-3）。
4. 打开「练习模式」考试 → 选一个选项：题下立刻出对错（说明练习模式生效）。
5. 打开「错题练习」开关 → 换账号或匿名进入：只会被要求登录，题目不变（P1-1）。
6. 题库练习顺序做 10 题 → 提交 → 打开「我的练习」：没有这条记录（P1-6）。
7. 关闭「允许复制题目」→ 复制题干：是否能复制只取决于「系统设置 → 内容保护」，与项目开关无关（项目开关没有消费方，见 §1.1 #6）。
8. 交卷后进入成绩单 → 排名若显示「第 0 位」或与同分人不一致，对应 §3.3。

---

## 附录 A：只读运行时探针（2026-11-06 20:45 左右，后端 7007）

### A.1 `/api/public/projectOutline` 会下发全部设置（不是只下发 answerSetting）

```json
{"status":1,
 "answerSetting":{"progressBar":true,"questionNumber":true,"autoSave":true,"onePageOneQuestion":true,"answerSheetVisible":true,"triggerType":"onBlur","copyEnabled":true},
 "submittedSetting":{"enableUpdate":true,"answerAnalysis":true,"transcriptVisible":true,"rankVisible":true},
 "examSetting":{"rankingEnabled":true,"exerciseMode":true}}
```
→ 前端能拿到 `examSetting/submittedSetting`，所以 §1 的「前端没读」不是下发缺失，是代码没消费。

### A.2 `/api/public/question` 的剥离行为（随练习模式而变）

- 项目 `qOnwfz` 处于**练习模式**：题目级只留 `examAnswerMode`（`examScore/examMatchRule/examAnalysis` 被剥），**选项级 `examCorrectAnswer` 保留**（练习模式有意下发答案）。
- 结论：练习模式下前端能即时判题；非练习模式会连选项级答案一起剥（代码 `SurveyServiceImpl.java:285-292`，本次没有可用的非练习样卷，未做运行时覆盖）。

### A.3 `/api/public/loadExamResult` 已能看到正确答案

```
code=200 score=0 rank=1 schemaChildren=100
question-level correct=0 option-level correct=378
```
→ 同一份答卷在当天早些时候（修复前）的探针里是 `option-level correct=0`；现在回退到项目 schema，成绩单可显示正确答案（§3.1）。

### A.4 题库模板：Excel 导入题没有 `dataSource`，且有整批缺答案

```
repo=2118342652479975425 保育员三级复习题 templates=1401
  q=...794 type=Radio dataSource=0 children=4 mode=onlyOne score=5 rule=undefined correctKids=1
repo=2118342652941348865 保育员四级复习题 templates=1023
  q=...657 type=Radio dataSource=0 children=4 mode=onlyOne score=5 rule=undefined correctKids=0
```
→ 渲染层用 `optionsOf()` 从 children 兜底（`answers.ts:20-32`），练习页实际能渲染出选项（已用浏览器复核：4 个选项按钮、无「未配置选项」）；但 `correctKids=0` 的题无法判分、成绩单显示「未设置正确答案」。

### A.5 练习页懒加载（浏览器复核）

打开 `/exercise/practice/2118342652479975425`：页面显示「顺序练习第 1 / 1401 题 · 已加载 10 / 共 1401 题」，答题卡序号 1..N，首题 4 个选项正常渲染 → 懒加载与选项兜底均生效。

---

## 附录 B：本次未覆盖 / 需要人工确认

1. **并发/事务类问题**（重复提交、@Async 错题身份、缓存放量）已在 `docs/audit/backend-data.md` 深入，本文只引用不重复。
2. **非练习模式的逐题剥离**没有可用的样卷做运行时验证，依据是代码路径（`SurveyServiceImpl.java:285-292`、`ProjectViewMapper.java:40-44`）。
3. **`selectCorrect` 的 NPE** 依据是拆箱路径（`AnswerScoreEvaluator.java:178`），未构造真实请求触发（避免写库）。
4. **导出/统计报表**不在本次业务链路范围（另有 `backend-data.md` / `frontend-*` 审计）。
5. **公开查询（publicQuery）**仅在设置表里标注，未展开（属另一条独立链路）。
