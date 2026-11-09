---
id: flow-repo-compose
title: 从题库组卷到考试
status: current
keywords:
  - 组卷
  - 抽题
  - 题库
  - 新建考试
  - 发布
  - repo/pick
  - ComposeModal
source_globs:
  - client/src/pages/project/ComposeModal.tsx
  - client/src/pages/project/List.tsx
  - server/api/src/main/java/cn/surveyking/server/api/RepoApi.java
  - server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/RandomSurveyProcessor.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectSetting.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/SurveySchema.java
entrypoints:
  - client/src/pages/project/ComposeModal.tsx
  - server/api/src/main/java/cn/surveyking/server/api/RepoApi.java
  - server/api/src/main/java/cn/surveyking/server/api/ProjectApi.java
apis:
  - GET /api/repo/list
  - POST /api/repo/pick
  - POST /api/project/create
  - POST /api/project/update
  - POST /api/project/delete
  - POST /api/project/status
  - GET /api/teaching/projects
  - GET /api/teaching/classes
tables:
  - t_repo
  - t_template
  - t_project
  - t_project_partner
  - t_answer
tests:
  - 'client:npx tsc --noEmit'
  - 'docs:npm run docs:check'
last_verified: '2026-11-09'
verified_against: '765fc89'
---

# 从题库组卷到考试

## 目标

把「题库里已有题目」变成一份可发布的考试：选题库 → 按题型配题数与每题分值 → 后端随机抽题 → 生成一份固定试卷 → 发布 → 学员作答 → 在班级学情里看交卷与均分。入口是「教学管理 → 新建 → 类型选考试、来源选从题库组卷」，实现集中在 `client/src/pages/project/ComposeModal.tsx`，抽题规则在 `RepoServiceImpl.pickQuestionFromRepo`。

## 前置条件

- 调用者有 `project:create`（建考试）、`project:update`（保存试卷）、`repo:list` 与 `repo:detail`（选库与抽题）；发布还需要 `project:publish`。
- 题库里已经有题，且这些题库对当前用户可见。注意组卷弹窗的可见口径与题库列表页不同，见「已知限制」。
- 抽题不区分题库的 `mode`（`exam`/`survey`），也不要求题库是练习库；选库时自己确认。

## 端到端步骤

1. **打开组卷弹窗**：`client/src/pages/project/List.tsx` 的 `submitCreate` 在 `mode='exam'` 且 `source='compose'` 时把考试名带进 `ComposeModal`，不创建项目；其它组合走「先建空项目再进编辑器」。
2. **选题库**：`ComposeModal` 打开后调 `GET /api/repo/list?current=1&pageSize=200`。请求没有传 `memberOnly`，所以 `RepoServiceImpl.listRepo` 对非管理员只返回「自己创建 + 共享」的题库，不含按组/按人授权的题库。
3. **配题**：对每个选中的题库，按 `Radio/Checkbox/Judge/FillBlank/Textarea` 五种题型分别填题数与每题分值；题数为 0 或空的题型不提交。底部的「目标总分」按当前总分等比缩放每题分值（保留两位小数），只是前端计算，不写库。
4. **建空考试**：点「生成试卷」后先 `POST /api/project/create`，请求 `{ name, mode: 'exam', setting: DEFAULT_SETTING }`。`ProjectServiceImpl.addProject` 会把 `setting` 补全成完整结构（`status=0`、进度条/自动保存、`examSetting` 为空对象），并把当前用户写成 `t_project_partner` 的 `OWNER`，所以后续 `/project/update` 的 `@EnableDataPerm` 能通过。
5. **抽题**：`POST /api/repo/pick`，请求体是 `ProjectSetting.RandomSurveyCondition` 数组，每个元素形如 `{ repoId, types: ['Radio'], questionsNum, examScore }`。`pickQuestionFromRepo` 逐条执行：`assertReadableRepo` → 按 `types`/可选 `tags` 查题目 → `Collections.shuffle` 后截断到 `questionsNum` → 给每道题写 `attribute.examScore` → 跨条件按题目 id 去重 → 按题型排序返回 `SurveySchema` 列表。
6. **组装并保存试卷**：前端给返回的题补两样东西——`attribute.required=true`（考试默认必答）和 `dataSource`（后端只回 `children` 的选项节点，渲染器读 `dataSource`）。然后 `POST /api/project/update`，请求 `{ id, survey }`；`ProjectApi.updateProject` 先过 `@EnableDataPerm(key="#project.id")`（所有者/协作者）与 `project:update`，再写 `t_project.survey`。
7. **收尾**：前端按 `sum(question.attribute.examScore)` 算实际总分并提示「已生成 N 道题，总分 X」，成功后跳 `/survey/:id/edit`。抽不到题或保存失败时会 `POST /api/project/delete` 回滚刚建的空项目（失败则忽略）。
8. **发布**：在考试列表或概述页调 `POST /api/project/status`（`project:publish`）把 `status` 置 1；这时代码才允许学员打开答题页。
9. **学员作答**：学员在「我的任务 → 考试安排」看到被授权（`t_project_partner` 个人或组，`type=3`）的考试，点「开始答题」直接跳公开页 `/s/:id`；交卷后 `t_answer.temp_save=1`。
10. **看学情**：老师视角 `GET /api/teaching/projects` 与 `GET /api/teaching/classes?projectId=` 汇总交卷数与平均分；明细仍在答卷/报表模块。

## 数据与权限

> 角色现状：老师保留 `project:create/update/delete/publish`（只作用于自己创建或协作的考试），但题库本身只读——没有 `repo:create/update/delete`，导入题目走 `template:import`。

| 步骤 | 接口 | 权限 | 数据范围 |
|---|---|---|---|
| 选题库 | `GET /api/repo/list` | `repo:list`（或 `exercise:list` 兜底） | 非管理员：自己创建 + 共享（本弹窗没传 `memberOnly`，组授权不参与） |
| 抽题 | `POST /api/repo/pick` | `repo:detail` 或 `repo:book` 或管理员 | 每个 `repoId` 都要可读，否则 403 |
| 建考试 | `POST /api/project/create` | `project:create` | 无 |
| 存试卷 | `POST /api/project/update` | `project:update` + `@EnableDataPerm` | 项目所有者/协作者 |
| 回滚 | `POST /api/project/delete` | `project:delete` | 项目所有者/协作者（老师保留该权限） |
| 发布 | `POST /api/project/status` | `project:publish` | 项目所有者/协作者 |

## 变体：答题时随机抽题（后端能力，暂无前端入口）

考试设置里的 `ProjectSetting.ExamSetting.randomSurvey` 是另一条路径：不改试卷内容，而是在每次打开答题页时由 `RandomSurveyProcessor.processRandomSurvey` 调 `RepoServiceImpl.pickQuestionFromRepo` 抽题，把结果写进 `t_answer.survey` 并用 Cookie（`sk-random-project-<projectId>`，7 天）复用同一份卷子。它还会把编辑器中的题目与题库抽出的题目合并。

目前前端只提供 `randomSurveyWrong`（错题练习）的开关，**没有编辑 `randomSurvey` 条件的界面**；要启用只能直接改 `t_project.setting` 的 JSON 或通过接口写入。写文档或排障时不要把这条路径当成「组卷弹窗」的一部分。

## 已知限制

- **组卷弹窗看不到被组授权的题库**：`ComposeModal` 请求 `/api/repo/list` 时没传 `memberOnly`，后端只给「自己创建 + 共享」。老师没有 `repo:create`，所以如果题库只授权给了他所在的组，他在组卷弹窗里选不到；需要管理员把题库设为 `shared=true`，或由题库创建者组卷。
- **最多加载 200 个题库**：`pageSize=200`，题库更多的部署会截断，没有翻页/搜索。
- **不筛题库类型**：`mode=survey` 的题库也能被抽进考试；后端只按 `repoId` 取题。
- **不支持按标签抽题**：后端 `RandomSurveyCondition.tags` 已实现，但弹窗没有标签选择。
- **题量不足不报错**：某题型题数大于题库实际数量时，后端按实际数量返回，前端只提示总题数/总分，不会提示「少抽了」。
- **跨条件去重**：同一道题被多个条件命中时只保留第一次出现的副本，分值也取第一次条件的分值。
- **抽题是随机的**：`Collections.shuffle` 没有种子，同样的配置每次生成结果不同；生成后的试卷是快照，之后再改题库不会回写。
- **总分缩放有舍入误差**：目标总分按比例缩放每题分值并保留两位小数，实际总分可能与目标差 ±0.01。
- **回滚依赖 `project:delete`**：抽不到题/保存失败时会删掉刚建的项目；如果调用者没有删除权限，删除失败被静默忽略，会留下一个空考试。
- **发布是单独一步**：生成试卷只写 `t_project`，不会自动发布；没点发布学员打不开。

## 验证

```bash
cd client && npx tsc --noEmit
npm run docs:check
```

手工冒烟：

1. 用一个有 5 种题型的题库，配「单选 5 题 × 2 分 + 判断 5 题 × 1 分」，生成后提示 10 题 / 15 分，编辑器里题数与分值一致。
2. 把题库授权给某个组、不共享，换一个只有组授权的老师账号，确认组卷弹窗里选不到该题库（当前行为）；管理员共享后再试应能选到。
3. 故意把某题型题数填成大于题库总量，生成后题数按实际数量，页面不报错。
4. 生成后立即检查考试列表：项目存在、状态未发布；点发布后学员能看到并能作答。
5. 学员交卷后，教学工作台的班级分布交卷数 +1。

## 相关文档

- [题库与题目](../modules/repo.md)：题库列表口径、抽题接口、导入导出。
- [班级与用户组](../modules/teaching.md)：组授权如何影响学员可见范围。
- [建班与授权](./class-grant.md)：把考试/题库授权给班级的完整链路。
- [权限与角色](../modules/permissions.md)：`project:*`、`repo:*` 的现状。
