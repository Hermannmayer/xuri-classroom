---
title: "导航自测题"
description: "用这些问题检验 AI 能否从文档找到正确代码"
---

# 导航自测题

> 每题的“期望”是文档 + 代码入口；如果 AI 找不到，说明文档或索引需要改。

| # | 问题 | 期望先读 | 期望代码 |
|---|---|---|---|
| 1 | 老师为什么能删考试但不能改题库？ | `decisions/ADR-0003-teacher-exam-vs-repo.md`、`modules/permissions.md` | `PermissionEnum.java`、`ProjectApi.java`、`RepoApi.java` |
| 2 | 新增一个权限点要改哪些文件？ | `flows/permission-change.md`、`ai/task-recipes.md` | `PermissionEnum.java`、`permissions.ts`、迁移 |
| 3 | 题库导入走哪个接口/权限？ | `modules/repo.md` | `RepoApi.java`、`TemplateApi.java`、`Questions.tsx` |
| 4 | 发布开关为什么走 `/api/project/status`？ | `modules/project.md` | `ProjectApi.java`、`ProjectList.tsx` |
| 5 | 班级删除为什么被拒绝？ | `modules/teaching.md` | `DeptServiceImpl.java`、`Classes.tsx` |
| 6 | 登录 Cookie 不生效先查什么？ | `flows/login-auth.md`、`modules/auth.md` | `UserApi.java`、`request.ts`、`Login.tsx` |
| 7 | 答卷数据为什么只能看自己的？ | `modules/answer.md`、`modules/permissions.md` | `AnswerServiceImpl.java`、`DataPermAspect.java` |
| 8 | 首页为什么显示教师/学员不同？ | `modules/dashboard.md` | `Dashboards.tsx`、`BasicLayout.tsx` |

## 评分

- 3 跳内找到（入口 → 模块页 → 代码）：合格。
- 需要 grep 整个仓库才找到：索引/模块页需要补 keywords/source_globs。
- 找到旧审计文档而不是当前模块页：归档/入口需要修。

