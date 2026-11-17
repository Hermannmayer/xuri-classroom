---
id: module-notice
title: 通知公告
status: current
keywords:
  - 公告
  - 通知
  - 未读数
  - 已读
  - 系统更新
  - newsletter
  - t_notice
  - 公告中心
  - 班级公告
source_globs:
  - client/src/pages/notice/**
  - client/src/layout/BasicLayout.tsx
  - server/api/src/main/java/cn/surveyking/server/api/NoticeApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/NoticeServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/service/NoticeService.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/Notice.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/NoticeRead.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/NoticeMapper.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/NoticeReadMapper.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/NoticeView.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/NoticeRequest.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/NoticeQuery.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/NoticeReadRequest.java
entrypoints:
  - client/src/pages/notice/NoticeCenter.tsx
  - client/src/pages/notice/NoticeEditor.tsx
  - client/src/pages/notice/NoticeBell.tsx
  - server/api/src/main/java/cn/surveyking/server/api/NoticeApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/NoticeServiceImpl.java
apis:
  - GET /api/notice/list
  - GET /api/notice/unread-count
  - GET /api/notice/detail
  - POST /api/notice/read
  - POST /api/notice/create
  - POST /api/notice/update
  - POST /api/notice/publish
  - POST /api/notice/archive
  - POST /api/notice/delete
tables:
  - t_notice
  - t_notice_read
tests:
  - server/rdbms/src/test/java/cn/surveyking/server/impl/NoticeServiceImplTest.java
  - client:npm run check
last_verified: 2026-11-17
verified_against: 120dbd4056587d04d31f5e05ce9c5018c96722f6
---

# 通知公告

## 30 秒摘要

管理员发全站公告，老师只发**本班**公告，师生在站内看到未读提醒。
管理员公告与班级公告共用一张 `t_notice`，靠 `audience`（all/admin/teacher/student）和
`scope_type`（NULL=全站 / class=某个班）两个维度区分；已读状态单独落 `t_notice_read`。
「检查更新」发现新版本时不再单独弹提示，而是往这里写一条 `type='system_update'` 的系统公告。
本模块不负责站内私信、邮件/短信推送。

## 什么时候看这篇

- 用户说「顶栏那个铃铛数字不对」「公告看不到了」
- 要改「谁能发全站公告」「老师能不能发给别班」
- 接口返回 403（多半是 `notice:manage:*` 与 scope 的联合校验没过）

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 页面 | `client/src/pages/notice/NoticeCenter.tsx` | `/notice`：左分类（全部/系统更新/未读，管理员另有草稿/已归档）+ 列表 + 详情 |
| 页面 | `client/src/pages/notice/NoticeEditor.tsx` | 写公告抽屉：标题、富文本、受众、选班、置顶、过期 |
| 顶栏 | `client/src/pages/notice/NoticeBell.tsx` | 未读数 badge：60 秒轮询 + 窗口 focus 立即刷；顺带触发登录后的自动检查更新 |
| 后端接口 | `server/api/.../api/NoticeApi.java` | `@PreAuthorize` 只做粗筛，真正的判定在 Service |
| 业务实现 | `server/rdbms/.../impl/NoticeServiceImpl.java` | 受众过滤 + 班级可见性 + 富文本消毒 + 系统更新去重 |
| 数据表 | `t_notice` / `t_notice_read` | 见 `V2.2.2__notice.sql` |

## 关键流程

1. 铃铛挂载即请求 `GET /api/notice/unread-count`，之后 60 秒轮询一次，窗口重新获得焦点时立即刷新。
2. 打开公告中心 → `GET /api/notice/list`：先按 `audience` 过滤（all 所有人 / admin / teacher / student），
   再按 `scope_type` 过滤（class 要求当前用户在这个班组链里）。
3. 点开某条 → `GET /api/notice?id=`，服务端顺带写已读；返回体里的 `read` 已是已读后的值。
4. 写公告 → create 只落草稿（`status=draft`），再调 `publish` 才对外可见。草稿只有 `notice:manage:*` 看得到。

## 修改指南

### 改可见性规则

1. 先改 `NoticeServiceImpl` 里的 audience/scope 过滤，**不要**只在接口上加 `@PreAuthorize`——
   「老师能不能发全站」这类判定必须落在 Service。
2. 班级可见性统一走现成的班组链服务，不要自己写 SQL 拼 `t_dept`。
3. 改完补 `NoticeServiceImplTest` 的用例。

### 新增字段/接口

1. 迁移只能加列（`V2.2.x`），并同步 `init-mysql.sql` 与 `db/schema.json`。
2. 前端类型在 `client/src/pages/notice/types.ts`，时间字段一律是 **epoch 毫秒**（`expireAt` 传字符串会 400）。
3. 更新本页 frontmatter 的 `source_globs`。

## 权限与数据范围

| 动作 | 权限 | 数据范围 |
|---|---|---|
| 看公告 / 未读数 | `notice:list` | 按 audience + scope 过滤 |
| 发全站/按角色公告 | `notice:manage:system` | 仅管理员 |
| 发班级公告 | `notice:manage:class` | 只能发给自己可见的班 |

## 坑与已知限制

- **create 只写草稿**：前端「发布」按钮实际是 create/update 后再调 `publish`，少调一步会「保存成功但列表里没有」。
- `recordSystemUpdate` 固定写 `audience=admin`，所以「系统更新」分类只对 `notice:manage:system` 显示。
- 正文入库前过 `RichTextSanitizer`；前端 DOMPurify 只是第二道，别把消毒挪到前端。
- `requireAck` 字段已落库但**没有 UI 与强制弹窗**，目前不生效。

## 验证

```bash
cd client && npm run check
cd server && ./gradlew :rdbms:test :api:test
python scripts/release/check_schema.py
npm run docs:check
```

## 相关文档

- [权限模型](./permissions.md)
- [登录与鉴权](../flows/login-auth.md)
- [模块索引](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/README.md)
