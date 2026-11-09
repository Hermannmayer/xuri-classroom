---
title: "ADR-0003 老师可以编辑/删除考试，但不能改题库"
description: "老师保留考试与问卷生命周期；题库只读；答卷删除归管理员"
---

# ADR-0003 老师考试与题库边界

## 状态

已接受（2026-11-09，用户确认）。

## 背景

老师需要从题库出卷、编辑考试/问卷、发布和删除自己创建的考试；但题库是学校核心资产，不能让老师改题库本身。早期权限把「编辑考试」和「编辑题库」混在一起讨论，容易误收 `project:update`。

## 决策

老师保留：

- `project:list/detail/create/update/delete/publish/partner/report`；
- 可以编辑考试/问卷、从题库组卷、发布/关闭、删除自己创建/协作的考试；
- 题库只读：`repo:list/detail`、`template:list`，**没有** `repo:create/update/delete`；
- 导入题目走 `template:import`（原 `repo:import` 已合并）；
- 答卷补录/修改 `answer:create/update` 保留；答卷删除/恢复 `answer:delete/restore` 归管理员；
- `file:delete` 保留，但实现层只允许删自己上传的文件。

## 为什么

- 考试是老师的日常工作对象，不能因为「题库只读」误伤考试编辑。
- 题库改动影响所有老师/班级，必须收归管理员或授权角色。
- 删除考试有数据权限限制（`@EnableDataPerm` / `assertProjectIdsPermitted`），老师只能删自己创建/协作的考试。

## 不变量

- 不要为了「安全」把 `project:update` 从老师角色移除。
- 不要把 `repo:update` 加回老师默认角色。
- 删除答卷/恢复答卷仍归管理员。

## 相关

- [考试与问卷](../modules/project.md)
- [题库与题目](../modules/repo.md)
- [权限与角色](../modules/permissions.md)

