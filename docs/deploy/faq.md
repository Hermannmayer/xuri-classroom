---
title: "部署常见问题"
description: "装不上、起不来、打不开、登录失败、数据恢复——按现象查原因"
---

# 部署常见问题

先记住三条：

1. **日志是第一现场**。Windows 看安装目录 `logs/`；Linux 用 `journalctl -u xuri-classroom -n 200`；Docker 用 `docker compose logs -f app`。
2. **Windows 有自检命令**：`doctor.cmd` 会检查 Java、MySQL、端口、目录权限并打印日志位置。
3. **数据库使用 MySQL 8**。

## 安装与启动

| 现象 | 原因 | 处理 |
|---|---|---|
| Windows 双击 `setup.cmd` 窗口一闪而过 | 启动器报错太快 | 进解压目录执行 `powershell -NoProfile -ExecutionPolicy Bypass -File lib\launcher.ps1 status` 看真实错误 |
| 服务起不来 / `systemctl status` 是 failed | 数据库连不上、端口被占、Java 缺失 | `journalctl -u xuri-classroom -n 200`；Linux 可加 `--download-jre` |
| Docker 容器反复重启 | MySQL 密码含特殊字符被 Compose 插值；卷权限 | 密码写 `$$` 或加引号；`docker compose logs db` |
| 升级后起不来 | 新版本要求的库结构没迁移 | 看日志里的 `Unknown column` / 表不存在，按发布说明先迁移 |
| 装完能起但没有页面 | 装的是 nginx 形态却关了内嵌，或静态资源没打进去 | 发布包应设 `SK_WEB_SPA_ENABLED=true`；自定义部署要自己配前端 |

## 下载与网络

| 现象 | 处理 |
|---|---|
| Windows 首次向导下载卡住 | 换网络/代理；或按 [Windows 离线安装](windows.md#离线安装)把 JRE / MySQL 压缩包放进 `cache/` |
| 下载完成但校验失败 | 删掉 `cache/` 里对应文件重试；或手工下载官方包放进去 |
| Docker 拉不到镜像 | 配镜像加速，或在 `.env` 设 `XURI_IMAGE=ghcr.nju.edu.cn/hermannmayer/xuri-classroom`；离线按[离线安装](docker.md#离线安装) `docker pull` → `docker save` → `docker load` |
| 一行脚本下载失败 | GitHub raw 不通，可换官方地址重试；用第三方加速前缀有风险，见 [Docker 部署](docker.md) |

## 数据库

| 现象 | 原因 | 处理 |
|---|---|---|
| 初始化脚本执行后数据没了 | `init-mysql.sql` 开头 25 处 `DROP TABLE IF EXISTS` | 它只用于**空库**；有数据的库升级只能跑迁移脚本 |
| `Unknown column xxx` | 库结构落后于程序 | 按发布说明跑对应的迁移 SQL，再启动 |
| MySQL 连不上 | 地址/端口/账号/权限/bind-address | 先用 `mysql -h <host> -u <user> -p` 手工验证，再查应用配置 |
| 能否用 MySQL 5.7 / MariaDB | 不支持 | 使用 MySQL 8（`mysql:8.0` 或本机 8.x） |

## 访问与网络

| 现象 | 原因 | 处理 |
|---|---|---|
| 本机能开，局域网打不开 | 防火墙没放行端口 | Windows 手动建入站规则；Linux `ufw allow 8080/tcp` 或 `firewall-cmd --add-port=8080/tcp` |
| 端口被占用 | 上次没停干净 / 其他服务 | `netstat -ano \| findstr :8080`（Windows）、`ss -lntp \| grep 8080`（Linux）、改 `APP_PORT`（Docker） |
| 反向代理后页面空白 | 反代只转发了 `/api` | 这是单端口 SPA：`location /` 整体 `proxy_pass` 到 8080，参考 [Linux 部署 · Nginx 反代](linux.md) |
| HTTPS 后登录异常 | Cookie 安全属性与协议不匹配 | 让反代带上 `X-Forwarded-Proto`；证书放在反代上，应用本身仍跑 HTTP |

## 登录与账号

| 现象 | 原因 | 处理 |
|---|---|---|
| `admin / 123456` 登不上 | 已被改过；或数据库不是本次初始化的 | 用备份恢复，或改 `t_account.auth_secret` 为已知密码的 BCrypt 串 |
| 用 curl 发明文密码总报"账号或密码错误" | 登录密码走 RSA 加密（`/api/system` 的 `publicKey`） | 用浏览器；脚本要先取公钥再加密 |
| 重启后所有人都要重新登录 | 没配 `SK_JWT_SECRET`，每次启动随机生成 | 在 `config/app.env` / `app.env` / `.env` 里配置固定密钥 |
| 首次登录要不要改密码 | **要**，但程序不强制 | 这是运维要求：默认口令是公开知识，装完立刻改 |

## 数据与备份

- **备份两样**：数据库 + 附件目录（Windows `data/mysql` + `data/files`；Linux 数据库 + `/opt/xuri-classroom/files`；Docker 卷 `xuri-classroom-db-data` + `xuri-classroom-app-files`）。
- **升级前必须备份**，备份要**演练过一次恢复**才算有效。
- 恢复顺序：停服务 → 空库导入 `db.sql.gz` → 解开附件 → 启动 → 抽查列表与答卷。
- 不要用 `docker compose down -v`：`-v` 删数据卷。

## 升级与回滚

| 问题 | 答案 |
|---|---|
| 怎么升级 | 各端升级步骤：[Windows](windows.md#升级)、[Linux](linux.md#升级)、[Docker](docker.md#升级) |
| 能跨大版本直接升吗 | 先看 `RELEASE_NOTES.md`；有数据库迁移就先迁移，别跳步 |
| 回滚程序会回滚数据库吗 | 不会。迁移通常不可逆，只能恢复备份 |
| 怎么知道装的是哪个版本 | 见[版本与升级](versioning.md#在哪里看当前版本) |

## 性能与资源

| 现象 | 处理 |
|---|---|
| 内存吃紧 / 被 OOM | MySQL 8 + JVM 至少留 2GB；容器可限制内存，Windows 别同时开一堆程序 |
| 附件越存越大 | 定期清理历史附件或扩容；单文件上传上限默认 20MB |
| 导出 Excel 很慢 | 数据量大时属正常；导出在服务端生成，耐心等或分批导 |

## 还解决不了

1. 收集：版本号（`VERSION`）、安装方式、日志最后 200 行、`doctor.cmd` 输出（Windows）。
2. 到仓库 Issues 提交，附上上面四样。**不要贴数据库密码、JWT 密钥、真实学员信息。**
