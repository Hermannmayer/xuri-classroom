# 权限与角色

系统有三类角色，权限来自后端 `t_role.authority`，前端按 `authorityList` 决定菜单、按钮和页面可见性。

## 角色对照

| | 管理员 `admin` | 老师 `teacher` | 学员 `student` |
|---|---|---|---|
| 定位 | 系统运维 + 全部业务 | 出卷、管题库、看数据 | 做题、练习 |
| 首页 | 概览 + 全部统计 | 概览 + 自己项目的统计 | 我的任务（待考 / 已考） |
| 我的考试 | 建卷、组卷、看答卷与报表 | 同管理员（范围限于自己可见的项目） | 只看被授权的考试，能答、能看成绩 |
| 题库中心 | 增删改、导入导出、授权给班级 | 同管理员 | 只读浏览 + 练习 |
| 我的练习 | 不显示 | 不显示 | ✅ 刷题、错题本 |
| 系统管理 | ✅ 用户 / 用户组 / 系统设置 | ❌ | ❌ |
| 账号设置 | ✅ | ✅ | ✅ |

## 权限串

| 角色 | authority |
|---|---|
| 管理员 | `ROLE_admin`（后端全放行） |
| 老师 | `project:*`（list/detail/create/update/delete/report）`answer:*`（list/detail/create/update/delete/export/upload）`repo:*`（list/detail/create/update/delete/book）`template:*` `exercise:list` `file:*` `user:update` `home` |
| 学员 | `exercise:list` `repo:list` `repo:detail` `repo:book` `user:update` |

## 两条数据可见性规则

**题库**：`t_repo_partner`（`user_id` 或 `dept_id` = 我的部门）
**考试**：`t_project_partner`（`user_id` 或 `group_id` = 我的部门，`type` 为 1/2/3）

匿名答题不受这两条影响——公开链接 `/s/:id` 任何人都能答。

## 区分「数据视角」和「答题视角」

同一个「我的考试」入口，两类用户看到的东西不同：

| | 管理员 / 老师 | 学员 |
|---|---|---|
| 列表内容 | 自己创建/协管的所有考试 | 被授权的考试 |
| 每行显示 | 答卷数、收集状态 | 我做没做、得分、还能做几次 |
| 主要操作 | 编辑、数据、报表、设置 | 开始答题 / 查看成绩 / 再考一次 |
| 数据接口 | `/api/project/list` + `/api/answer/list` | `/api/project/list`（只返回被授权的） |

## 前端如何判断

```ts
import { can, loadAuthorities } from '../auth/permissions';

const authorities = await loadAuthorities();
can(authorities, 'repo:create'); // false for 学员
```

- 菜单：`BasicLayout` 按权限过滤
- 页面：`RequirePerm` 守卫（无权限直接 403 页）
- 按钮：按权限渲染或不渲染（不只是 disabled）

## 后端如何兜底

所有写接口都有 `@PreAuthorize`，前端隐藏只是体验，真正拦截在后端。例如：

- `POST /api/repo/create` → `repo:create`
- `POST /api/repo/delete` → `repo:delete`
- `GET /api/project/list` → `project:list` 或 `exercise:list`（后者给学员，SQL 已限制只能看到被授权的）
- `GET /api/repo/book/list` → `repo:book`
