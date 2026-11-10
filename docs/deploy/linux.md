---
title: "Linux 服务器部署"
description: "tar.gz 解压 + install.sh 一键安装为 systemd 服务；含外部 MySQL、Nginx 反代、备份升级与排查"
---

# Linux 服务器部署

Linux 包是一个 tar.gz：解压后执行 `install.sh`，它会创建系统用户、铺好目录、生成配置、写 systemd 服务并启动。

- 安装包：`xuri-classroom-<version>-linux-x64.tar.gz`
- 默认安装目录：`/opt/xuri-classroom`
- 服务名：`xuri-classroom`
- 默认地址：`http://<服务器IP>:8080`
- 数据库：MySQL 8（本机或远程）

## 系统要求

| 项 | 要求 |
|---|---|
| 系统 | x86_64 Linux，带 systemd（Debian/Ubuntu/CentOS/RHEL/麒麟等） |
| Java | Java 8 运行时；没有就加 `--download-jre`（清华 TUNA 的 Temurin JRE 8，失败回退南大镜像） |
| MySQL | MySQL 8，本机或可访问的远程实例；用 `--init-db` 可自动建库导入 |
| 内存 | 2GB 起，建议 4GB |
| 磁盘 | 2GB 起（附件与备份另算） |
| 权限 | `sudo` / root（要建用户、写 systemd unit） |

## 安装步骤

```bash
# 1) 解压
tar -xzf xuri-classroom-<version>-linux-x64.tar.gz
cd xuri-classroom-<version>-linux-x64

# 2) 安装（连本机/远程 MySQL 8，并自动建库导入）
sudo bash install.sh --port 8080 --init-db \
  --db-host 127.0.0.1 --db-port 3306 \
  --db-name surveyking --db-user surveyking --db-password '改成强密码'

# 没有系统 Java 时（从清华 TUNA 下载 Temurin JRE 8，回退南大镜像）
sudo bash install.sh --port 8080 --download-jre --init-db --db-password '改成强密码'
```

> 脚本只支持 **bash**（`sh install.sh` 会失败）；解压出来 `install.sh` 带执行位，`sudo ./install.sh …` 等价。`--db-password` 不传会交互询问。

`install.sh` 会：

1. 校验 root 权限；
2. 创建运行用户（默认 `xuri`）与安装目录；
3. 复制 jar 到 `/opt/xuri-classroom/app.jar`；
4. 生成 `/opt/xuri-classroom/app.env`（权限 `0600`，含 `DB_*`、`SERVER_PORT`、随机 `SK_JWT_SECRET`、`SK_WEB_SPA_ENABLED=true`、附件目录，并按 `DB_*` 同步 `SPRING_DATASOURCE_*`）；
5. 选 Java：优先系统 `java`；系统没有时复用安装目录已有的 `runtime/jre8`；两者都没有则提示安装，或加 `--download-jre` 从国内镜像下载；
6. `--init-db` 时：建库、建用户、授权、导入 `init-mysql.sql`（失败会明确报错且**不启动**服务）；
7. 写 `/etc/systemd/system/xuri-classroom.service`，`systemctl enable` + 启动；`--no-systemd` 只准备目录并打印手动启动命令；
8. 打印访问地址、配置路径与看日志的命令。

### 参数

| 参数 | 默认 | 说明 |
|---|---|---|
| `--port` | `8080` | 应用端口 |
| `--install-dir` | `/opt/xuri-classroom` | 安装目录 |
| `--user` | `xuri` | 运行服务的系统用户 |
| `--db-host` / `--db-port` | `127.0.0.1` / `3306` | MySQL 地址 |
| `--db-name` | `surveyking` | 库名 |
| `--db-user` | `surveyking` | 连接账号 |
| `--db-password` | 必填（或交互询问） | 连接密码；也可用环境变量 `XURI_DB_PASSWORD` |
| `--db-admin-user` / `--db-admin-password` | `root` / 空 | 只有 `--init-db` 建库时用 |
| `--init-db` | 关 | 用本机 `mysql` 客户端建库、建用户、授权并导入 `init-mysql.sql`（只允许空库；缺客户端会明确报错） |
| `--download-jre` | 关 | 下载 Temurin JRE 8 到 `/opt/xuri-classroom/runtime/jre8`（清华 TUNA，回退南大） |
| `--no-jre` | 关 | 不下载、不使用 `runtime/jre8`，强制系统 `java`（与 `--download-jre` 互斥） |
| `--no-systemd` | 关 | 不写 unit、不启动（容器或自管守护进程时用）；检测不到 systemd 会自动降级到这个模式 |
| `--yes` / `-y` | 关 | 非交互确认 |
| `--help` | — | 用法 |

## 初始化

- `--init-db` 会做一次**空库**初始化：建库、建连接账号（默认 `surveyking`）、授权、导入建表与种子数据，最后得到管理员 `admin / 123456`。
- 手工初始化也可以（记得把 `app.env` 的 `DB_USER` 换成你建的账号）：

  ```bash
  sudo mysql -e "CREATE DATABASE surveyking DEFAULT CHARACTER SET utf8mb4;"
  sudo mysql -e "CREATE USER 'surveyking'@'localhost' IDENTIFIED BY '改成强密码';"
  sudo mysql -e "GRANT ALL ON surveyking.* TO 'surveyking'@'localhost';"
  sudo mysql surveyking < app/init-mysql.sql
  ```

- `init-mysql.sql` 开头有 25 处 `DROP TABLE IF EXISTS`，**只对空库执行**。
- 首次登录后立即修改 `admin` 密码（程序不强制，属运维要求）；生产环境务必改 `app.env` 里的 `DB_PASSWORD`，并确认 `SK_JWT_SECRET` 有值。

## 访问

- 直接访问：`http://<服务器IP>:8080`
- 放防火墙：`sudo firewall-cmd --add-port=8080/tcp --permanent && sudo firewall-cmd --reload`（firewalld）或 `sudo ufw allow 8080/tcp`（ufw）。

### 用 Nginx 反代（可选）

单端口应用，反代只需要 `proxy_pass` 到 8080：

```nginx
server {
    listen 80;
    server_name ks.example.com;
    client_max_body_size 25m;          # 上传上限默认 20MB，留点余量

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配好后把 `--port` 改成只监听回环也可以，或用防火墙只放行 80/443。

## 备份

```bash
# 数据库（连接账号见 app.env 的 DB_USER，默认 surveyking）
mysqldump -u surveyking -p --single-transaction --databases surveyking | gzip > /backup/db_$(date +%F).sql.gz

# 附件 + 配置
tar -czf /backup/files_$(date +%F).tar.gz -C /opt/xuri-classroom files
cp /opt/xuri-classroom/app.env /backup/app.env_$(date +%F)
```

恢复：

```bash
sudo systemctl stop xuri-classroom
gunzip -c /backup/db_2026-11-10.sql.gz | mysql -u root -p surveyking
tar -xzf /backup/files_2026-11-10.tar.gz -C /opt/xuri-classroom
sudo systemctl start xuri-classroom
```

建议配一个 cron（例如每天凌晨）跑上面的备份，并定期**恢复到临时库验证一次**——没验证过的备份等于没有。

## 升级

```bash
sudo systemctl stop xuri-classroom
# 备份（见上）

tar -xzf xuri-classroom-<新版本>-linux-x64.tar.gz
cd xuri-classroom-<新版本>-linux-x64
sudo bash install.sh --port 8080     # 幂等：保留已有 app.env 与 SK_JWT_SECRET，只更新程序
sudo systemctl status xuri-classroom
```

如果发布说明要求迁移数据库，**先迁移再启动**。升级后打开首页与一份答卷验证。

## 回滚

```bash
sudo systemctl stop xuri-classroom
tar -xzf xuri-classroom-<旧版本>-linux-x64.tar.gz
cd xuri-classroom-<旧版本>-linux-x64
sudo bash install.sh --port 8080
```

数据库迁移通常不可逆：如果新版本已经改过表结构，只能恢复升级前的备份。

## 卸载

```bash
sudo bash uninstall.sh          # 停服务、删 unit，保留安装目录与数据
sudo bash uninstall.sh --purge  # 连安装目录和运行用户一起删
```

## 目录与命令

| 路径 | 内容 |
|---|---|
| `/opt/xuri-classroom/app.jar` | 应用 |
| `/opt/xuri-classroom/app.env` | 配置（`0600`） |
| `/opt/xuri-classroom/files/` | 上传附件（**要备份**） |
| `/opt/xuri-classroom/logs/` | 日志 |
| `/opt/xuri-classroom/runtime/jre8/` | `--download-jre` 时才有 |
| `/etc/systemd/system/xuri-classroom.service` | systemd 单元 |

```bash
sudo systemctl status xuri-classroom
sudo systemctl restart xuri-classroom
journalctl -u xuri-classroom -f          # 看日志
```

## 常见问题

| 现象 | 原因 / 处理 |
|---|---|
| `install.sh: Permission denied` | 忘了 `sudo`，或用了 `sh install.sh`；用 `sudo bash install.sh …`，必要时 `chmod +x install.sh` |
| 提示找不到 java | 装 JRE 8，或加 `--download-jre`（清华 TUNA / 南大镜像的 Temurin JRE 8） |
| 服务起不来（`status` 是 failed） | `journalctl -u xuri-classroom -n 100` 看真实报错；多为数据库连不上或端口被占 |
| 数据库连不上 | 检查 `--db-host/--db-port`、MySQL 是否监听、账号是否有 `surveyking` 库权限；远程连不上时先看 MySQL 的 `bind-address` |
| 8080 被占用 | `ss -lntp \| grep 8080` 找进程；改 `--port` 或停掉占用者 |
| 升级后接口 500（`Unknown column`） | 没跑数据库迁移；按发布说明先迁移 |
| 想让应用只监听本机 | 应用默认监听 `0.0.0.0:8080`；用防火墙只放行 80/443，或用宿主/云安全组限制 8080 的来源 |
| 附件上传失败 | 检查 `/opt/xuri-classroom/files` 所属用户与磁盘空间；单文件默认上限 20MB |

更多共性问题见[部署常见问题](faq.md)。
