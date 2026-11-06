# 部署说明

三种部署方式，按场景选一种。**所有方式的前端都已打进后端 jar**（`classpath:/static`），只需要跑一个 Java 进程。

## 一、Docker（推荐，Linux / Windows 通用）

```bash
# 1. 准备环境变量
cp .env.example .env
#    编辑 .env，至少改掉 DB_PASSWORD

# 2. 构建并启动（首次会拉镜像 + 构建前后端，约 5-10 分钟）
docker compose up -d

# 3. 查看状态
docker compose ps
docker compose logs -f app
```

启动后访问 `http://<服务器IP>:${APP_PORT}`，默认账号 `admin` / `123456`（登录后请立即修改）。

**数据持久化**（两个命名卷）：

| 卷 | 内容 |
|---|---|
| `db-data` | MySQL 数据（`/var/lib/mysql`） |
| `app-files` | 上传的图片/附件（`/app/files`） |

**首次启动建表**：`docker-compose.yml` 把 `server/rdbms/src/main/resources/scripts/init-mysql.sql` 挂到 MySQL 的 `docker-entrypoint-initdb.d`，**只在数据卷为空时执行一次**。

**升级**：

```bash
git pull
docker compose build app
docker compose up -d app
```

**备份**：

```bash
# 推荐：用脚本（数据库进容器 mysqldump + 附件打包 + 脱敏 .env + 自动清理旧备份）
bash scripts/deploy/backup.sh --output /var/backups --retention 14
```

手动最小版本（仅供排查）：

```bash
docker compose exec db mysqldump -u root -p"$DB_PASSWORD" --no-tablespaces surveyking > backup.sql
docker run --rm -v xuri-classroom_app-files:/files -v "$PWD":/out alpine tar czf /out/files.tar.gz -C /files .
```

> 为什么必须 `docker compose exec`：MySQL 端口没有发布到宿主机（只在 compose 内网），
> 宿主机上的 `mysqldump` 连不进去。

## 二、Linux（systemd）

```bash
# 1. 构建（在开发机或服务器上）
cd server && ./gradlew :api:bootJar -x test
# 2. 把 client/dist 拷进 jar 前需要重新打包：见下方「打包带前端的 jar」
# 3. 安装
sudo bash scripts/deploy/linux/install.sh server/api/build/libs/xuri-classroom-v1.13.0.jar \
  --install-dir /opt/xuri-classroom --port 80
```

安装脚本会：建用户和目录、拷 jar、生成 `/opt/xuri-classroom/app.env`、注册 systemd 服务并启动。

**改配置**：编辑 `/opt/xuri-classroom/app.env`，然后 `systemctl restart xuri-classroom`。

**卸载**：`sudo bash scripts/deploy/linux/uninstall.sh`（默认保留数据目录，`--purge` 才删）。

## 三、Windows（服务）

```powershell
# 以管理员身份运行
.\scripts\deploy\windows\install.ps1 -JarPath .\server\api\build\libs\xuri-classroom-v1.13.0.jar `
  -InstallDir C:\xuri-classroom -Port 80
```

优先用 `sc.exe` 注册服务；如果失败会提示安装 [nssm](https://nssm.cc/)。

卸载：`.\scripts\deploy\windows\uninstall.ps1`（`-Purge` 连目录一起删）。

## 打包带前端的 jar

后端从 `classpath:/static/index.html` 提供前端页面，所以要先把 `client/dist` 放进 `server/api/src/main/resources/static/` 再打包：

```bash
cd client && npm ci && npm run build
rm -rf ../server/api/src/main/resources/static
cp -r dist ../server/api/src/main/resources/static
cd ../server && ./gradlew :api:bootJar -x test
```

Docker 构建里已经自动做了这一步（见 `Dockerfile`）。

## 备份与恢复

| 形态 | 备份 | 恢复 |
|---|---|---|
| **Docker Compose（推荐）** | `bash scripts/deploy/backup.sh --output /var/backups --retention 14` | 见下方说明 |
| Windows 服务 / systemd（宿主机安装） | `.\scripts\deploy\backup.ps1 -InstallDir C:\xuri-classroom -OutputDir D:\backups -Retention 7`，或 `bash scripts/deploy/backup.sh`（旧参数形态） | `restore.ps1` / `restore.sh` |

**Docker 形态下 `backup.sh` 做了什么**：

1. 前置检查：`docker`、`docker compose`、`docker-compose.yml`、`.env`、db 服务是否在运行，任一缺失给中文错误；
2. `docker compose exec -T db mysqldump ...`（带 `--single-transaction --quick --routines --events --triggers --no-tablespaces`）；
3. `docker compose exec -T app tar ... -C /app files` 打包上传目录（应用容器没跑时记录 `files.missing`）；
4. 生成 `.env` 的脱敏副本（`DB_PASSWORD` / `SK_CRYPTO_KEY` / `JWT_SECRET` 打码）；
5. 打成 `backup_<时间戳>.tar.gz`，按 `--retention` 清理旧备份。

> ⚠️ 目前 `restore.sh` 仍是「宿主机安装」形态（读 `app.env`、在本机执行 mysql）。
> Docker 形态的恢复请手动执行：
> ```bash
> docker compose down
> docker compose up -d db
> docker compose exec -T db mysql -uroot -p"$DB_PASSWORD" < db.sql
> tar xzf files.tar.gz && docker cp files app:/app/
> docker compose up -d
> ```
> 把 `restore.sh` 也改成 compose 形态已列入待办。

## 环境变量

后端支持这些环境变量（`application-dev.yml` 已改成可覆盖）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `DB_HOST` | `localhost` | MySQL 地址 |
| `DB_PORT` | `3306` | 端口 |
| `DB_NAME` | `surveyking` | 库名 |
| `DB_USER` | `root` | 用户 |
| `DB_PASSWORD` | `123456` | 密码 |
| `SERVER_PORT` | 见 `application-dev.yml`（7007） | 后端端口；Docker 里固定 80 |
| `SK_CRYPTO_KEY` | 无（未配置则题库明文存储） | 题库字段加密密钥，Base64 的 32 字节；**Docker 部署必填**，丢失后已加密数据无法解密 |
| `JWT_SECRET` | 空（每次启动随机） | JWT 签名密钥，`openssl rand -base64 48` 生成。不配则重启后所有人要重新登录、多实例无法共享会话 |

> 生产环境务必改掉 `DB_PASSWORD`，并修改默认管理员密码。
> `SK_CRYPTO_KEY` 与 `JWT_SECRET` 都要**备份到密码管理器**，不能只放在服务器上。

## 常见问题

**页面 404 / 白屏**：jar 里没打包前端。按「打包带前端的 jar」重新构建，或直接用 Docker。

**启动报数据库连接失败**：确认 MySQL 已启动、库已建、`app.env` 里的密码正确；Docker 方式常见原因是忘记了 `.env` 里的密码和卷里已初始化的密码不一致（改密码后需要删卷重建，或者进容器改 MySQL 密码）。

**修改代码后需要重启**：项目缓存（`custom-cache.projectCache: 1d`）会把 settings/schema 缓存一天，直接改库不会立刻生效，重启后清空。
