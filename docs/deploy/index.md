---
title: "部署安装"
description: "Windows 单机、Linux 服务器、Docker 三种安装方式总览与选择建议"
---

# 部署安装

旭日云课堂提供三种安装方式。三者跑的是**同一个 jar + MySQL 8**，区别只在"谁来提供运行时"：

| | [Windows 便携包](windows.md) | [Linux 安装包](linux.md) | [Docker](docker.md) |
|---|---|---|---|
| 适合 | 考点单机、教研室、临时机房 | 学校服务器、已有 MySQL 的机器 | 已有 Docker 的服务器 |
| 需要什么 | Windows 10/11 x64 | x86_64 Linux + systemd | Docker Engine 20.10+、Compose v2 |
| MySQL 从哪来 | 首次向导下载并初始化 | `--init-db` 自动建库，或接外部 MySQL | compose 里的 `mysql:8.0` |
| Java 从哪来 | 首次向导下载 JRE 8 | 默认用系统 Java，可 `--download-jre` | 镜像内置 |
| 默认端口 | 8080 | 8080 | 8080（`APP_PORT`） |
| 数据在哪 | 解压目录下 `data/` | `/opt/xuri-classroom/` + MySQL 数据目录 | 卷 `xuri-classroom-db-data`、`xuri-classroom-app-files` |
| 升级方式 | 换程序文件，保留 `data/` | 重跑 `install.sh` | 改 `VERSION` 后 `up -d` |
| 停止方式 | `stop.cmd` | `systemctl stop xuri-classroom` | `docker compose down` |

## 我该选哪个

- **只有一台 Windows 电脑，装完就要用** → [Windows 便携包](windows.md)。解压双击 `setup.cmd`，向导会把 JRE 8 和 MySQL 8 一起装好。
- **有一台 Linux 服务器，希望开机自启、多人长期使用** → [Linux 安装包](linux.md)。装成 systemd 服务 `xuri-classroom`。
- **服务器上已经有 Docker / 要做统一编排、离线分发** → [Docker](docker.md)。一条 compose 起 app + mysql，或一行脚本装好。
- **已经有 MySQL 8，只想要一个 jar** → 任意一种方式都可以，或直接看[环境变量](../reference/env.md)手工起 jar。

## 系统要求

| 项 | 最低 | 推荐 |
|---|---|---|
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB | 4 GB（MySQL 8 + JVM 一起跑） |
| 磁盘 | 2 GB | 20 GB 以上（附件与备份另算） |
| 浏览器 | Chrome / Edge 90+ | 最新版 |
| 网络 | 局域网内可访问安装机 | — |

> 以上是经验值：题量大、附件多（上传上限默认单文件 20MB）时按实际加内存与磁盘。

## 每一端都要知道的三件事

1. **首次启动会初始化数据库**：建表、写入角色/用户组/系统参数种子，并创建管理员 `admin / 123456`。`init-mysql.sql` 开头有 25 处 `DROP TABLE IF EXISTS`，**只能对空库执行**，不要拿它去升级有数据的库。
2. **首次登录后立即改密码**。程序不会强制你改（没有强制改密逻辑），这是运维要求；生产环境还要改 `DB_PASSWORD` 并配置 `SK_JWT_SECRET`（不配则每次重启随机生成，所有人掉线）。
3. **备份就是备份两样东西**：数据库 + 附件目录。详见各端"备份"小节与[部署常见问题](faq.md)。

## 安装之后

- 版本号、升级与回滚：[版本与升级](versioning.md)
- 装不上、起不来、打不开：[部署常见问题](faq.md)
- 环境变量清单：[环境变量](../reference/env.md)
