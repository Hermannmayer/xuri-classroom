# 旭日云课堂 · Docker 部署

> 发布形态：**GHCR 镜像 + mysql:8.0**，只有两个容器。
> 前端 SPA 已打包在 jar 内，由 **app** 自己托管（**SK_WEB_SPA_ENABLED=true**），不再需要 nginx 容器。
> 需要 HTTPS/域名时，在宿主机或上层网关做反向代理，转发到 **APP_PORT**（默认 8080）。

## 1. 文件说明

| 文件 | 说明 |
|---|---|
| **docker-compose.release.yml** | 发布编排：db（mysql:8.0）+ app（GHCR 镜像） |
| **.env.example** | 环境变量模板，复制为 .env |
| **Dockerfile.runtime** | 可选：本地构建运行时镜像（离线/私有仓库场景） |
| **README.md** | 本文件 |

从 Releases 下载的 **xuri-classroom-<version>-docker.tar.gz** 是部署包（不是镜像），解压后还包含：

| 文件 | 说明 |
|---|---|
| **xuri-classroom.jar** | 发布 jar（已内嵌前端 SPA），本地构建镜像时用 |
| **init-mysql.sql** | 空库初始化脚本，仅首次启动时执行 |
| **VERSION** | 包内版本号 |

首次启动需要一个 **init-mysql.sql**（空库初始化脚本），放在 compose 同目录，默认文件名就是 **./init-mysql.sql**。可从仓库复制：

~~~bash
curl -fL -o init-mysql.sql \
  https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/server/rdbms/src/main/resources/scripts/init-mysql.sql
~~~

> ⚠️ init-mysql.sql 含 25 处 **DROP TABLE**，只在数据卷为空时由 MySQL 官方镜像自动执行一次。
> 已有数据的库绝对不要再挂这个文件（也不要对生产库手工执行）。

## 2. 前置条件

- Linux + Docker Engine 20.10+（推荐 24+）
- Docker Compose **v2**（命令是 **docker compose**，不是旧版 docker-compose）
- 能访问 ghcr.io；国内网络见第 8 节镜像源
- 端口 APP_PORT 可被访问

检查：

~~~bash
docker version
docker compose version
~~~

## 3. 快速开始

~~~bash
# 1) 建目录并进入
mkdir -p /opt/xuri-classroom && cd /opt/xuri-classroom

# 2) 下载编排、环境变量模板、初始化 SQL
curl -fLO https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/docker/docker-compose.release.yml
curl -fL -o .env.example https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/docker/.env.example
curl -fL -o init-mysql.sql https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/server/rdbms/src/main/resources/scripts/init-mysql.sql

# 3) 生成 .env 并改密码
cp .env.example .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 16)/" .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')/" .env
chmod 600 .env

# 4) 启动（首次会拉镜像 + 初始化数据库，约 1-3 分钟）
docker compose --env-file .env -f docker-compose.release.yml up -d
~~~

访问 **http://<服务器IP>:8080**，初始账号 **admin / 123456**（由 init-mysql.sql 导入），登录后立即修改密码。

### 一行命令（脚本会做上面这些事）

~~~bash
curl -fsSL https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/scripts/deploy/docker-one-line.sh | sudo bash
~~~

可用环境变量覆盖默认值：

~~~bash
curl -fsSL https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/scripts/deploy/docker-one-line.sh | sudo XURI_HOME=/opt/xuri APP_PORT=9090 VERSION=2.0.0 bash
~~~

## 4. 状态与日志

~~~bash
# 容器状态
docker compose -f docker-compose.release.yml ps

# 应用日志（实时）
docker compose -f docker-compose.release.yml logs -f app

# 数据库日志
docker compose -f docker-compose.release.yml logs --tail=100 db

# 健康检查
curl -fsS http://127.0.0.1:8080/api/system

# 启停
docker compose -f docker-compose.release.yml restart app
docker compose -f docker-compose.release.yml stop
docker compose -f docker-compose.release.yml start
~~~

## 5. 升级与回滚

**升级到新版本**

~~~bash
cd /opt/xuri-classroom
# 改 .env 里的 VERSION（例如 v1.13.1）
vi .env
docker compose --env-file .env -f docker-compose.release.yml pull app
docker compose --env-file .env -f docker-compose.release.yml up -d app
~~~

**回滚**

把 .env 里的 VERSION 改回上一个版本，再 pull + up -d app 即可。数据库结构变更的回滚请用第 6 节的备份恢复，不要依赖镜像回退。

> 生产环境建议固定 VERSION（例如 2.0.0），不要长期用 latest。

## 6. 备份与恢复

**备份**

~~~bash
cd /opt/xuri-classroom

# 数据库（容器内执行，密码从容器环境变量读，不进 shell 历史）
docker compose -f docker-compose.release.yml exec -T db sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --quick --routines --triggers --no-tablespaces "$MYSQL_DATABASE"' \
  > surveyking-$(date +%F).sql

# 上传文件（命名卷打包）
docker run --rm \
  -v xuri-classroom-app-files:/files:ro \
  -v "$PWD":/backup \
  alpine tar czf /backup/files-$(date +%F).tar.gz -C /files .

# 配置（含 JWT 密钥）
cp .env .env-$(date +%F).bak
~~~

**恢复**

~~~bash
cd /opt/xuri-classroom
docker compose -f docker-compose.release.yml stop app

# 数据库
docker compose -f docker-compose.release.yml exec -T db sh -c \
  'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < surveyking-2026-01-01.sql

# 上传文件
docker run --rm \
  -v xuri-classroom-app-files:/files \
  -v "$PWD":/backup \
  alpine sh -c 'tar xzf /backup/files-2026-01-01.tar.gz -C /files'

docker compose -f docker-compose.release.yml start app
~~~

## 7. 卸载

~~~bash
cd /opt/xuri-classroom

# 停止并删除容器，保留数据卷（可再次 up -d 恢复）
docker compose -f docker-compose.release.yml down

# 彻底删除（含数据库与上传文件，不可恢复！）
docker compose -f docker-compose.release.yml down -v
~~~

数据卷名固定为 **xuri-classroom-db-data** 与 **xuri-classroom-app-files**。

## 8. GHCR 拉取与国内镜像源

**公开镜像**：直接 pull，无需登录。

如果 401/403（私有包或未登录）：

~~~bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u <GitHub用户名> --password-stdin
~~~

**国内网络慢**：通过 XURI_IMAGE 换镜像前缀（不含 tag，tag 仍由 VERSION 决定）：

~~~bash
# .env
XURI_IMAGE=ghcr.nju.edu.cn/hermannmayer/xuri-classroom
VERSION=latest
~~~

任意可用的 GHCR 代理/镜像地址都可以这样替换；镜像内容必须与官方一致。

**本地构建**（离线或私有仓库）：

~~~bash
cd docker
cp <linux包>/app/xuri-classroom-<version>.jar ./xuri-classroom.jar
docker build -f Dockerfile.runtime -t ghcr.io/hermannmayer/xuri-classroom:local .

# .env 里改用本地镜像
# XURI_IMAGE=ghcr.io/hermannmayer/xuri-classroom
# VERSION=local
docker compose --env-file .env -f docker-compose.release.yml up -d
~~~

## 9. 常见问题

**第一次启动 db 一直重启，日志里是 init-mysql.sql 相关错误**

确认 init-mysql.sql 存在且是文件（不是同名目录），路径与 .env 的 INIT_SQL_FILE 一致。缺失时 Docker 会创建一个同名目录，MySQL 初始化会失败。

**改过 DB_PASSWORD，但应用连不上**

MySQL 的账号密码只在数据卷为空时初始化。已有数据的卷不会跟着 .env 改密码：

~~~bash
docker compose -f docker-compose.release.yml exec db \
  mysql -uroot -p -e "ALTER USER 'xuri'@'%' IDENTIFIED BY '新密码';"
~~~

然后同步修改 .env 并重启 app。

**8080 端口被占用**

改 .env 的 APP_PORT 后重新 up -d；或找出占用进程：**ss -ltnp | grep ':8080'**。

**时区不对**

编排已设置 TZ=Asia/Shanghai；如部署在其他时区，请同时调整 JVM 与数据库配置。

**数据库连不上 / TLS 握手失败**

编排里的 **useSSL=false** 是故意保留的：JDK8 的 MySQL connector 与 MySQL 8 的 TLS 握手会失败。不要去掉。
