<!-- 由 npm run docs:gen 生成；不要手改。来源：client/src/router.tsx -->

# 路由表（生成）

> 由 `client/src/router.tsx` 解析；守卫列写的是前端 `guard(...)` 的权限码。后端还会做 `@PreAuthorize` 二次校验。

| 路径 | 组件 | 前端守卫 |
|---|---|---|
| `/user/login` | `Login` | 公开/仅登录 |
| `/user/register` | `Register` | 公开/仅登录 |
| `/` | `BasicLayout` | 公开/仅登录 |
| `/home` | `Home` | 公开/仅登录 |
| `/teaching` | `TeachingHome` | `portal:teacher`<br>`project:list` |
| `/teaching/classes` | `TeachingClasses` | `class:list` |
| `/tasks` | `TaskCenter` | `project:answer` |
| `/project` | `ProjectEntry` | `project:list` |
| `/project/trash` | `ProjectTrash` | `project:list` |
| `/project/:id` | `Placeholder` | 公开/仅登录 |
| `/exercise` | `ExerciseList` | `exercise:list` |
| `/exercise/practice/:repoId` | `Practice` | `exercise:list` |
| `/exercise/:repoId` | `Placeholder` | 公开/仅登录 |
| `/repo/index` | `RepoList` | `repo:list` |
| `/repo/book` | `RepoBook` | `repo:book` |
| `/repo/book/practice` | `BookPractice` | `repo:book` |
| `/repo/:repoId/questions/:mode` | `RepoQuestions` | `repo:detail`<br>`repo:questions:read`<br>`template:list` |
| `/account/settings` | `AccountSettings` | 公开/仅登录 |
| `/survey/:id` | `SurveyOverview` | `project:detail` |
| `/survey/:id/edit` | `SurveyEditor` | `project:update` |
| `/survey/:id/setting` | `SurveySetting` | `project:update` |
| `/survey/:id/data` | `SurveyData` | `answer:list` |
| `/survey/:id/report` | `SurveyReport` | `project:report` |
| `/survey/:id/poster` | `Placeholder` | 公开/仅登录 |
| `/system/user` | `SystemUser` | `system:user:list` |
| `/system/group` | `SystemGroupEntry` | `system:dept:list` |
| `/system/setting` | `SystemSetting` | `system:role:list` |
| `/system/permissions` | `SystemPermissions` | `system:role:list` |
| `/system/audit` | `SystemAudit` | `system:log:list` |
| `/s/:id` | `PublicAnswer` | 公开/仅登录 |
| `/s/:id/:answerId` | `PublicAnswer` | 公开/仅登录 |
| `/s/:id/exam-result/:answerId` | `ExamResult` | 公开/仅登录 |
| `/s/:id/result/:resultId` | `PublicQuery` | 公开/仅登录 |
| `/setup` | `Placeholder` | 公开/仅登录 |
| `/*` | `Placeholder` | 公开/仅登录 |
