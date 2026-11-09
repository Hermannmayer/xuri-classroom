---
title: "环境变量"
description: "前端、后端、NAS 部署常用变量；不记录真实值"
---

# 环境变量

> 这里只列变量名和用途；真实值在 `deploy/nas/live/.env` 或运行环境，不入库。

## 前端

| 变量 | 用途 | 默认 |
|---|---|---|
| `VITE_API_TARGET` | Vite 代理的后端地址 | `http://127.0.0.1:7007` |

## 后端

| 变量 | 用途 |
|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | MySQL 连接 |
| `SPRING_DATASOURCE_URL` | 显式 JDBC URL（生产用；必须 `useSSL=false`） |
| `SK_CRYPTO_KEY` | **当前未实现**：Java 里零引用，compose 里必填仅为将来预留 |
| `SK_JWT_SECRET` | JWT 签名密钥（留空则按应用默认策略） |
| `JAVA_TOOL_OPTIONS` | JVM 参数（生产默认 `-Xmx768m`） |

## NAS / compose

| 变量 | 用途 |
|---|---|
| `APP_PORT` | 对外映射端口（默认 201） |
| `APP_EXTRA_PORT` | 直连调试端口（默认 1201） |
| `XURI_SRC` | NAS 运行副本路径 |
| `XURI_BUILD_DIR` | 后端 jar 产物目录 |
| `XURI_DATA_DIR` | MySQL/附件数据目录 |
| `XURI_BACKUP_DIR` | 备份目录 |
| `XURI_RUNTIME_IMAGE` | 运行时镜像 |
| `BACKUP_RETENTION` | 备份保留份数 |

## 文档

| 变量 | 用途 |
|---|---|
| `DOCS_BASE` | VitePress 构建 base；GitHub Pages 用 `/xuri-classroom/` |
| `DOCS_BASE_REF` | `docs:impact` 的对比基准（CI 用 `origin/main`） |

## 修改原则

- 新增变量必须同时更新本页、compose/启动脚本和部署文档。
- 密钥只放 `.env`，不要写进 Markdown、代码或提交历史。

