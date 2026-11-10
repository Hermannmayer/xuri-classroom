---
title: "Docker 部署"
description: "一行脚本或 docker compose 起 app + mysql；含 GHCR 镜像、离线安装、备份升级与回滚"
---

# Docker 部署

Docker 方式起两个容器：`app`（旭日云课堂，端口 8080）和 `db`（`mysql:8.0`），数据放在两个卷里。

- compose 文件：`docker/docker-compose.release.yml`（项目名 `xuri-classroom`）
- 镜像：`ghcr.io/hermannmayer/xuri-classroom:<tag>`（GHCR，带 `:latest`；`.env` 的 `VERSION` 决定 tag，`XURI_IMAGE` 可换成国内镜像源）
- 默认端口：`8080`（`.env` 的 `APP_PORT`）
- 数据卷：`xuri-classroom-db-data`（MySQL）、`xuri-classroom-app-files`（附件），卷名固定，备份不用猜项目前缀
- 更细的说明（国内镜像源、卸载、日志）见仓库 `docker/README.md`，部署包内也带一份

## 系统要求

| 项 | 要求 |
|---|---|
| Docker | Docker Engine 20.10+，Compose v2（`docker compose` 子命令） |
| 内存 | 2GB 起，建议 4GB（MySQL 8 比较吃内存） |
| 磁盘 | 2GB 起，附件与备份另算 |
| 网络 | 能访问 `ghcr.io`；不能就按下面的[离线安装](#离线安装) |

## 方式一：一行脚本（最快）

```bash
curl -fsSL https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/scripts/deploy/docker-one-line.sh | sudo bash
```

可用环境变量调整（写在 `bash` 前面）：

| 变量 | 作用 |
|---|---|
| `XURI_HOME` | 部署包落盘目录（脚本有内置默认值，见脚本头部注释） |
| `APP_PORT` | 对外端口，默认 `8080` |
| `VERSION` | 镜像 tag，默认 `latest`；生产建议固定到具体版本 |

```bash
# 下载后再执行，便于先看一眼脚本内容
curl -fsSL https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/scripts/deploy/docker-one-line.sh -o docker-one-line.sh
sudo APP_PORT=9090 VERSION=2.0.0 bash docker-one-line.sh
```

> **国内网络**：GitHub raw 可能很慢或不通，可以在 URL 前加第三方代理前缀，例如
> `curl -fsSL https://ghproxy.net/https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/scripts/deploy/docker-one-line.sh | sudo bash`。
> **风险提示**：ghproxy 之类的第三方代理不是本项目维护的，可能不可用、限速或被篡改。用代理时请先把脚本下载到本地看一眼内容，并核对发布说明里的 SHA256；有条件就用官方地址或离线安装。

## 方式二：手动 compose（推荐长期使用）

1. 从 Releases 下载 `xuri-classroom-<version>-docker.tar.gz`（**部署包，不是镜像 tar**），解压：

   ```bash
   tar -xzf xuri-classroom-<version>-docker.tar.gz
   cd xuri-classroom-<version>-docker
   ls    # docker-compose.release.yml  .env.example  README.md  Dockerfile.runtime  VERSION  xuri-classroom.jar  init-mysql.sql
   ```

   > 也可以在仓库里直接用 `docker/` 目录。

2. 生成配置：

   ```bash
   cp .env.example .env
   ```

   编辑 `.env`，**这两个必填**（compose 里用 `:?` 强制，缺了直接拒绝启动）：

   | 变量 | 说明 |
   |---|---|
   | `DB_PASSWORD` | MySQL root 与应用账号共用的密码，**必须改**，别用默认值 |
   | `JWT_SECRET` | JWT 签名密钥，`openssl rand -base64 48` 生成；不配则每次重启随机、所有人掉线 |

   其余可选项：

   | 变量 | 默认 | 说明 |
   |---|---|---|
   | `APP_PORT` | `8080` | 对外端口 |
   | `VERSION` | `latest` | 镜像 tag，**不带 `v`**（例如 `2.0.0`）；生产建议固定版本 |
   | `DB_NAME` / `DB_USER` | `surveyking` / `xuri` | 库名与连接账号 |
   | `XURI_IMAGE` | `ghcr.io/hermannmayer/xuri-classroom` | 换国内镜像源，如 `ghcr.nju.edu.cn/hermannmayer/xuri-classroom` |
   | `JAVA_OPTS` | `-Xmx768m` | JVM 堆上限（4GB 机器用 768m，8GB 可用 1536m） |
   | `INIT_SQL_FILE` | `./init-mysql.sql` | 初始化 SQL 路径，仅空卷首次启动时执行 |

3. 启动：

   ```bash
   docker compose -f docker-compose.release.yml up -d
   docker compose -f docker-compose.release.yml ps
   docker compose -f docker-compose.release.yml logs -f app
   ```

   `app` 会等 `db` 的 healthcheck 通过后再启动。

## 初始化

- **首次启动**（`xuri-classroom-db-data` 卷为空）时，`mysql` 容器会执行挂进去的 `init-mysql.sql`：建表、写种子数据、创建管理员 `admin / 123456`。
- 卷里**已经有数据时不会重跑**初始化脚本——这是 Docker 官方镜像的行为，也是保护。
- 首次登录后**立即修改 admin 密码**（程序不强制）；生产环境确认 `.env` 里 `DB_PASSWORD`、`JWT_SECRET` 都不是默认值。
- `init-mysql.sql` 只用于空库（开头 25 处 `DROP TABLE IF EXISTS`）。

## 访问

- `http://<服务器IP>:8080`（或你设置的 `APP_PORT`）
- 前面再加一层 Nginx / Lucky 反代也可以，反代目标就是 `http://127.0.0.1:<APP_PORT>`。

## 备份

```bash
# 数据库
docker compose -f docker-compose.release.yml exec -T db \
  sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --databases surveyking' \
  | gzip > db_$(date +%F).sql.gz

# 附件（卷名固定）
docker run --rm -v xuri-classroom-app-files:/data -v "$PWD":/backup alpine \
  sh -c 'tar czf /backup/files_$(date +%F).tar.gz -C /data .'
```

恢复：

```bash
docker compose -f docker-compose.release.yml stop app
gunzip -c db_2026-11-10.sql.gz | docker compose -f docker-compose.release.yml exec -T db \
  sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" surveyking'
docker run --rm -i -v xuri-classroom-app-files:/data alpine sh -c 'tar xzf - -C /data' < files_2026-11-10.tar.gz
docker compose -f docker-compose.release.yml start app
```

> **不要**用 `docker compose down -v` 清场：`-v` 会删数据卷，等于删库。

## 升级

```bash
# 1) 先备份（见上）
# 2) 改 .env 里的 VERSION
docker compose -f docker-compose.release.yml pull app
docker compose -f docker-compose.release.yml up -d
docker compose -f docker-compose.release.yml logs -f app
```

如果发布说明里有数据库迁移，先在 `db` 容器里执行迁移 SQL，再升级 `app`。

## 回滚

```bash
# 把 .env 的 VERSION 改回旧版本
docker compose -f docker-compose.release.yml pull app
docker compose -f docker-compose.release.yml up -d
```

表结构已被迁移时，程序回滚不会回滚数据库，只能恢复备份。

## 离线安装

`xuri-classroom-<version>-docker.tar.gz` 是**部署包，不是镜像**。离线机器需要自己搬镜像：

```bash
# 有网机器
docker pull ghcr.io/hermannmayer/xuri-classroom:<version>
docker save -o xuri-classroom-<version>.tar ghcr.io/hermannmayer/xuri-classroom:<version>

# 拷到目标机后
docker load -i xuri-classroom-<version>.tar
docker images | grep xuri-classroom
```

也可以**不搬镜像**：部署包里自带 `Dockerfile.runtime` 与 `xuri-classroom.jar`，在目标机本地构建：

```bash
cd xuri-classroom-<version>-docker
docker build -f Dockerfile.runtime -t ghcr.io/hermannmayer/xuri-classroom:<tag> .
```

然后照"方式二"用部署包里的 compose 启动（`.env` 的 `VERSION` 与 load/构建出来的标签一致即可）。`mysql:8.0` 也要一起 `save/load`，或在目标机能访问的镜像仓库里。

## 常见问题

| 现象 | 原因 / 处理 |
|---|---|
| 拉镜像超时 / `unauthorized` | 访问不了 GHCR。配 Docker 镜像加速，或按[离线安装](#离线安装)搬镜像 |
| `docker compose` 报 `unknown command` | 装的是 Compose v1。升级到 Compose v2（`docker compose version` 能查） |
| 端口被占用 | 改 `.env` 的 `APP_PORT`；`ss -lntp \| grep 8080` 查占用者 |
| 起来了但 500 / 表不存在 | `xuri-classroom-db-data` 卷不是空的，初始化脚本没执行。要么换空卷重来，要么手工导入 `init-mysql.sql`（仅空库） |
| MySQL 容器反复重启 | `.env` 里密码含 `$` 等特殊字符被 Compose 插值；写成 `$$` 或加引号 |
| 启动报「请在 .env 里设置 DB_PASSWORD / JWT_SECRET」 | 这两个是 compose 的必填变量，空值会直接拒绝启动 |
| 拉镜像超时（国内） | 在 `.env` 设 `XURI_IMAGE=ghcr.nju.edu.cn/hermannmayer/xuri-classroom`，或走离线安装 |
| 升级后接口 500（`Unknown column`） | 没跑数据库迁移 |
| 内存占用高 / 被 OOM | MySQL 8 默认吃内存，给主机加内存或限制容器内存 |
| 忘记 admin 密码 | 进 `db` 容器用 mysql 客户端改 `t_account.auth_secret`（BCrypt），或恢复备份 |

更多共性问题见[部署常见问题](faq.md)。
