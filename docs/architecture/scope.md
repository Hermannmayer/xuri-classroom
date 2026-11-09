---
title: "功能范围"
description: "当前做了什么、有意不做什么、已知缺口"
---

# 功能范围

系统覆盖「出卷 → 组卷 → 答题 → 判分 → 数据分析 → 练习巩固」，面向职业技能培训场景。

## 已实现

| 域 | 能力 |
|---|---|
| 考试 | 空白建卷、题库组卷、可视化编辑、发布设置、考试控制、自动判分、成绩单/排名 |
| 问卷 | 匿名/登录/密码/白名单、回收限制、IP/设备限次、提交后跳转 |
| 题库 | 分类、题目增删改、Excel 导入导出、组卷抽题、按组/个人授权 |
| 练习 | 顺序/随机、继续上次、一页一题/瀑布流、错题本、重点标记、本场错题练习 |
| 数据 | 答卷列表、逐份查看、筛选、编辑、补录、导入导出、回收站、逐题统计 |
| 账号权限 | 权限点→角色→用户组/用户、多组、组有效期、数据范围、审计 |
| 教学 | 班级树、成员管理、老师分配、班级学情 |
| 其它 | 品牌配置、亮/暗主题、字号缩放、移动端底栏、内容保护/水印 |

## 有意不做

| 项 | 原因 |
|---|---|
| 模板广场 | 后端创建项目不读模板；模板只在客户端 localStorage 参与 |
| 流程编排 | `flow` 模块不在 api 构建里，`/api/workflow/*` 不可用 |
| 系统管理·职务 | 唯一下游是工作流审批，权限体系用不到 |
| 系统管理·数据字典 | 仅 `dataType=selectDict` 时使用，初始库无默认字典 |
| 独立角色权限矩阵页 | 权限矩阵已并入「权限配置」 |
| 模板相关接口 | `/api/template/get`、`create`、`listCategory`、`listTag` 前端不接；模板只在客户端 localStorage 参与「从模板新建」 |
| 文件管理页 | `/api/file/list`、`/api/file/delete` 无前端入口；附件只通过题库导入、答题上传两条路径产生 |
| OAuth 账号绑定 | `/api/oauth/bind/*`、`/api/oauth/bindings` 无前端入口；当前只支持「用第三方登录」，不支持在已登录状态下绑定 |

> 这些是“前端不提供入口/不进入主流程”，后端数据与接口不一定删除。

## 已知缺口

| 项 | 状态 |
|---|---|
| 多数据库支持 | 只支持 MySQL 8，没有通用迁移工具 |
| 整站备份按钮 | 只有脚本，无产品化按钮 |
| 学员答题状态跨设备 | 部分依赖本地 localStorage |
| 标签筛选（题库内） | 后端 `listTag` 硬编码 `question_type=Survey`，题库题型查不到 |
| 白名单前端入口 | 后端支持，前端入口不完整 |
| 模板/文件/OAuth 绑定的端点 | 见上表「有意不做」，接口保留但没有前端调用方（`docs/architecture/unwired-inventory.md`） |

### 前端零调用的端点：逐个结论（2026-11-09）

扫描口径：后端 150 个端点 vs 前端 `client/src` 里出现的 `/api/...` 字面量，27 个未命中。逐个核对后分三类：

| 端点 | 结论 |
|---|---|
| `/api/template/get`、`create`、`listCategory`、`listTag` | **有意不接**：模板广场不做，模板只在客户端 localStorage 参与「从模板新建」 |
| `/api/file/list`、`file/delete` | **有意不接**：没有文件管理页；附件只经题库导入与答题上传产生 |
| `/api/oauth/bind/{provider}/start`、`/api/oauth/bindings`、`/api/oauth/bindings/{id}` | **有意不接**：当前只支持「用第三方登录」，不支持在已登录状态下绑定 |
| `/api/public/oauth/login/{provider}/start`、`oauth/callback`、`oauth/register/{ticket}`、`/api/public/listRegisterRole` | **扫描误报**：浏览器整页跳转，不走 fetch |
| `/api/public/validateProject` | **扫描误报**：答题页在 `submit` 前调用，路径由 `PublicAnswer.tsx` 动态拼接 |
| `/api/public/statistics` | **已迁移**：改成 `/api/report/statistics`（S6-6） |
| `/api/public/loadDict`、`loadLinkResult` | **待接**：字典下拉与「关联结果」两块前端还没做，接口保留 |
| `/api/dashboard/list` | **待确认**：首页看板目前走 `/api/project/list` 与 `/api/exercise/list` 拼数据；该端点可能是早期实现，候选删除 |
| `/api/repo/batchCreate`、`repo/unbind`、`repo/book/create` | **待接**：题库批量建卷与「我的题库」绑定入口没做，接口保留 |
| `/api/userOverview`、`/api/listUserTask`、`/api/listHistoryTask` | **待确认**：学员任务页已改用 `/api/exercise/list` 与 `/api/teaching/*`；这三个可能是旧实现，候选删除 |

处理原则：**「有意不接」写进文档保留接口**；**「扫描误报」无需处理**；**「待接/待确认」在真正删除前先 grep 一次前端动态拼接的用法**，避免误删。

## 维护

功能变化时更新本页；模块级实现细节放到对应 `modules/*.md`，不要重复。

