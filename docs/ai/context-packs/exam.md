# 上下文包：考试/答题链路

> 给 AI 的最小上下文；详细见 `docs/modules/project.md`、`docs/modules/answer.md`、`docs/flows/exam-publish-answer.md`。

## 关键文件

- 前端列表：`client/src/pages/project/List.tsx`
- 概览/发布：`client/src/pages/survey/Overview.tsx`
- 编辑器：`client/src/pages/survey/Editor.tsx`、`client/src/designer/**`
- 公开答题：`client/src/pages/answer/PublicAnswer.tsx`
- 后端接口：`server/api/.../ProjectApi.java`、`AnswerApi.java`、`SurveyApi.java`
- 实现：`ProjectServiceImpl.java`、`AnswerServiceImpl.java`、`SurveyServiceImpl.java`

## 不变量

- 发布开关走 `POST /api/project/status`（`project:publish`）；整包设置走 `/api/project/update`（`project:update`）。
- 老师保留 `project:create/update/delete/publish`；只能操作自己创建/协作的考试。
- 数据范围由 `@EnableDataPerm` / `t_project_partner` 决定；管理员不是无条件全量。
- 答题页公开链接 `/s/:id` 不需要登录；后台数据接口需要 `answer:list`。

## 验证

`cd client && npm run check`；`npm run test:rules`；发布后答题链路手工走一遍。

