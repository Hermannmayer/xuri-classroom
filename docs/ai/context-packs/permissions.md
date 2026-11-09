# 上下文包：权限

> 详细见 `docs/modules/permissions.md`、`docs/flows/permission-change.md`、`docs/decisions/ADR-0001/2/3`。

## 关键文件

- 权限目录：`server/shared/.../PermissionEnum.java`
- 前端判定：`client/src/auth/permissions.ts`
- 后端注入/装配：`UserServiceImpl.java`
- 路由/菜单：`client/src/router.tsx`、`BasicLayout.tsx`、`MobileTabBar.tsx`
- 迁移：`scripts/nas/migrate/NN-*.sql`、`init-mysql.sql`

## 不变量

- 权限点只挂角色；组只绑角色，不直接挂权限串。
- 管理员 = 管理权限全集；六个学员专属不自动注入。
- 学员专属：`project:answer`、`repo:practice`、`repo:book`、`repo:questions:read`、`exercise:list`、`portal:student`。
- 老师保留 `project:delete`（仅自己创建的考试），无 `repo` 写权限；答卷删除/恢复归管理员。

## 验证

`npm run docs:gen` 后看 `reference/permissions.md`；三角色登录看 `/api/currentUser`；权限接口用 403 用例验证。

