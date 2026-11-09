# 上下文包：题库/组卷

> 详细见 `docs/modules/repo.md`、`docs/flows/repo-compose.md`。

## 关键文件

- 题库列表：`client/src/pages/repo/List.tsx`
- 题目页：`client/src/pages/repo/Questions.tsx`
- 组卷弹窗：`client/src/pages/project/ComposeModal.tsx`
- 后端：`RepoApi.java`、`TemplateApi.java`、`RepoServiceImpl.java`
- 表：`t_repo`、`t_template`、`t_repo_partner`

## 不变量

- 老师题库只读：无 `repo:create/update/delete`；导入题目用 `template:import`。
- 题库导出要 `repo:export`；导出密码/审计由 `ExportGuardService`。
- 数据范围：题库创建者 + `t_repo_partner` 个人/组授权；管理员全量。

## 验证

`npm run check`；导入/导出用 Excel 样本；组卷后检查考试总分与题目顺序。

