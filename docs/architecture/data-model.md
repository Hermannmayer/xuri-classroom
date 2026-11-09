---
title: "数据模型"
description: "核心表、关系、软删除、迁移与生成参考"
---

# 数据模型

## 核心关系

~~~text
用户 t_user ──< t_account（登录方式）
  │
  ├──< t_user_role >── t_role ──< t_dept_role >── t_dept（用户组/班级）
  ├──< t_user_dept（附加组）
  └──< t_user_book（错题/收藏）

考试/问卷 t_project ──< t_project_partner（协作者/班级授权）
                      └──< t_answer（答卷）

题库 t_repo ──< t_template（题目）
            └──< t_repo_partner（个人/班级授权）
            └──< t_repo_template（题库模板）
~~~

## 表分组

| 组 | 表 | 说明 |
|---|---|---|
| 账号 | `t_user`、`t_account`、`t_user_dept`、`t_user_position` | 用户、登录账号、附加组、岗位 |
| 组织 | `t_dept`、`t_class_partner` | 班级/用户组树、班级老师授权 |
| 权限 | `t_role`、`t_user_role`、`t_dept_role` | 角色、用户直挂角色、组绑定角色 |
| 考试 | `t_project`、`t_project_partner`、`t_answer` | 考试/问卷、协作者/班级授权、答卷 |
| 题库 | `t_repo`、`t_repo_partner`、`t_template`、`t_repo_template`、`t_tag` | 题库、授权、题目、模板、标签 |
| 练习 | `t_user_book` | 错题本/收藏/练习记录 |
| 文件 | `t_file` | 上传附件引用 |
| 系统 | `t_sys_info`、`t_comm_dict`、`t_comm_dict_item`、`t_dashboard`、`t_audit_log` | 配置、字典、首页卡片、审计 |

## 约定

- 主键多为字符串 id；逻辑删除字段 `is_deleted`，查询默认过滤。
- 时间字段 `create_at` / `update_at`；MyBatis-Plus 自动填充。
- 权限串在 `t_role.authority`，逗号分隔；不要把它当规范权限目录，目录以 `PermissionEnum` 为准。
- 项目/题库的数据范围由 `*_partner` 表 + 组链决定，不要只看 `create_by`。

## 迁移

- 初始化：`server/rdbms/src/main/resources/scripts/init-mysql.sql`。
- 增量：`scripts/nas/migrate/NN-*.sql`，必须幂等；已执行的迁移不要改历史语义，新增编号。
- 改表时同时更新：实体、DTO、Mapper、init 脚本、迁移、模块页 frontmatter。

## 生成参考

完整表/列清单见 [数据库结构（生成）](../reference/db-schema.md)。该页由脚本生成，不手改。

