---
title: "ADR-0002 管理员 = 管理权限全集，不是所有权限串"
description: "为什么管理员不自动拥有学员能力；前端 can() 如何配合"
---

# ADR-0002 管理员权限全集

## 状态

已接受（2026-11）。

## 背景

早期 `ROLE_admin` 在前端 `can()` 里对所有权限直接放行，后端又把权限目录全量注入管理员，导致管理员/老师页面反复出现「开始答题」「开始练习」「我的任务」等学员入口。权限配置形同虚设。

## 决策

1. 把权限目录分两类：
   - **管理权限**：管理员自动拥有；
   - **学员专属**：`project:answer`、`repo:practice`、`repo:book`、`repo:questions:read`、`exercise:list`、`portal:student`，不自动注入管理员。
2. 后端 `toAuthorityNames` 注入管理员时跳过 `studentOnly`。
3. 前端 `can()` 对学员专属必须精确命中，`ROLE_admin` 不兜底；其它权限保留管理员兜底与显式域通配符。
4. 管理员若确实要答题/练习，必须显式给角色勾选对应权限。

## 后果

- 管理员默认看不到学员入口；老师默认也没有。
- 权限矩阵里「管理员全选」不再成立，管理员只拥有管理全集。
- 新增学员能力时，必须同时加 `PermissionEnum.studentOnly`、前端 `STUDENT_ONLY_PERMISSIONS`、迁移/初始化。

## 当前点数

管理员 71 个管理权限点（不含 `ROLE_admin`），老师 33，学员 14（含 6 个学员专属）。

## 相关

- [权限与角色](../modules/permissions.md)
- [权限目录（生成）](../reference/permissions.md)

