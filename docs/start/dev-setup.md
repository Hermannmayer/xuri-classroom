---
title: "本地开发环境"
description: "JDK/Node/MySQL、启动顺序、端口与构建命令"
---

# 本地开发环境

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Ant Design 5 + Vite 5 |
| 后端 | Spring Boot 2.7 + MyBatis-Plus + MySQL 8 |
| 认证 | RSA 登录 + sk-token HttpOnly Cookie |
| 文档 | VitePress + Node 脚本 |

## 目录

~~~text
client/    前端（npm run dev）
server/    后端（Gradle 多模块：api / rdbms / shared / ai）
scripts/   开发、部署、NAS、迁移脚本
docs/      文档站与 AI 文档源
~~~

## 启动顺序

1. 启动 MySQL 8（本地默认 3306）。
2. 启动后端：server 下 gradlew :api:bootJar -x test，运行 api/build/libs 产物；默认 7007。
3. 启动前端：cd client && npm run dev；/api 代理到后端。

> 登录密码必须 RSA 加密；前端从 GET /api/system 取 publicKey。JWT 在 HttpOnly Cookie 里，开发期必须同源代理，不能走 CORS。

## 检查命令

~~~bash
cd client
npm run check        # tsc --noEmit
npm run build        # tsc + vite build
npm run test:rules   # 规则引擎断言
npm run test:tree    # 树操作断言
~~~

后端没有本地 JDK 时，可通过 NAS 的 Gradle 容器编译；发布脚本会做 :api:bootJar。详细见 docs/ops/NAS-开发工作流.md（内部，不在公开站）。

## 端口与代理

| 环境 | 前端 | 后端 |
|---|---|---|
| 本地开发 | Vite 默认 5173（或 80，按脚本） | 7007 |
| 生产 | nginx 容器 80 → 宿主机端口 | 容器内 7007 |

## 常见坑

- 后端 HTTP 状态恒为 200，业务码在 body.code；不要只看 HTTP status。
- 写接口大多返回 void，改完要重新拉数据。
- userCache / projectCache 有 TTL；直接改库不一定立即生效，必要时重启后端。
- 题库导入 Excel 按题型分 sheet；单 sheet 格式需要先转换。

## 下一步

- 改功能前：读 [文档维护流程](docs-workflow.md)，并用 `npm run docs:where -- "关键词"` 定位模块。
- 改完：跑 [检查与测试](testing.md)，再按 [文档维护流程](docs-workflow.md) 更新文档。

