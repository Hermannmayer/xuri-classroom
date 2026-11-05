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
docker compose exec db mysqldump -u root -p"$DB_PASSWORD" surveyking > backup.sql
docker run --rm -v xuri-classroom_app-files:/files -v "$PWD":/out alpine tar czf /out/files.tar.gz -C /files .
```

## 二、Linux（systemd）

```bash
# 1. 构建（在开发机或服务器上）
cd server && ./gradlew :api:bootJar -x test
# 2. 把 client/dist 拷进 jar 前需要重新打包：见下方「打包带前端的 jar」
# 3. 安装
sudo bash scripts/deploy/linux/install.sh server/api/build/libs/surveyking-v1.13.0.jar \
  --install-dir /opt/xuri-classroom --port 80
```

安装脚本会：建用户和目录、拷 jar、生成 `/opt/xuri-classroom/app.env`、注册 systemd 服务并启动。

**改配置**：编辑 `/opt/xuri-classroom/app.env`，然后 `systemctl restart xuri-classroom`。

**卸载**：`sudo bash scripts/deploy/linux/uninstall.sh`（默认保留数据目录，`--purge` 才删）。

## 三、Windows（服务）

```powershell
# 以管理员身份运行
.\scripts\deploy\windows\install.ps1 -JarPath .\server\api\build\libs\surveyking-v1.13.0.jar `
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

| 平台 | 备份 | 恢复 |
|---|---|---|
| Windows | `.\scripts\deploy\backup.ps1 -InstallDir C:\xuri-classroom -OutputDir D:\backups -Retention 7` | `.\scripts\deploy\restore.ps1 -BackupPath D:\backups\backup_xxx.zip` |
| Linux | `bash scripts/deploy/backup.sh --install-dir /opt/xuri-classroom --output /var/backups --retention 7` | `bash scripts/deploy/restore.sh /var/backups/backup_xxx.tar.gz` |

备份内容：`mysqldump` 全库 + `files/` 上传目录 + 脱敏的 `app.env` + manifest。恢复前会停服务，恢复后自动拉起。

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

> 生产环境务必改掉 `DB_PASSWORD`，并修改默认管理员密码。

## 常见问题

**页面 404 / 白屏**：jar 里没打包前端。按「打包带前端的 jar」重新构建，或直接用 Docker。

**启动报数据库连接失败**：确认 MySQL 已启动、库已建、`app.env` 里的密码正确；Docker 方式常见原因是忘记了 `.env` 里的密码和卷里已初始化的密码不一致（改密码后需要删卷重建，或者进容器改 MySQL 密码）。

**修改代码后需要重启**：项目缓存（`custom-cache.projectCache: 1d`）会把 settings/schema 缓存一天，直接改库不会立刻生效，重启后清空。
