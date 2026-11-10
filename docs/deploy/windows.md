---
title: "Windows 便携包部署"
description: "解压即用：首次向导下载 JRE 与 MySQL，自动初始化并启动；含向导失败排查、日志与备份升级"
---

# Windows 便携包部署

Windows 包是**绿色解压版**：不写注册表、不装服务，所有东西都在解压目录里。双击 `setup.cmd` 走一次首次向导（下载 JRE 8 与 MySQL 8、初始化数据库、启动），之后用 `start.cmd` / `stop.cmd` 开关。

- 安装包：`xuri-classroom-<version>-windows-x64.zip`（约 73MB，其中 jar 约 78MB；**不含** JRE 与 MySQL）
- 默认地址：`http://<本机IP>:8080`
- 数据目录：解压目录下的 `data/`
- 日志目录：解压目录下的 `logs/`

## 系统要求

| 项 | 要求 |
|---|---|
| 系统 | Windows 10 / 11，64 位 |
| 内存 | 2GB 起，建议 4GB（默认 JVM 上限 `-Xmx1024m`，小内存机器改 `config\app.env` 的 `JAVA_OPTS`） |
| 磁盘 | 安装包约 73MB；首次向导完成后约 300MB（JRE 97MB + MySQL 128MB + jar 78MB），数据与附件另算 |
| 权限 | 普通用户即可；首次启动**可能**请求一次管理员权限用于添加防火墙规则 |
| 网络 | 首次向导需要联网下载 JRE 与 MySQL（约 250MB）；之后离线可用 |

> 建议解压到**可写、非系统目录**，例如 `D:\xuri-classroom`。放在 `C:\Program Files` 下会因为权限问题出现"启动失败但没报错"。

## 安装步骤

1. **下载** `xuri-classroom-<version>-windows-x64.zip`，并按 [版本与升级](versioning.md#下载与校验) 校验 SHA256。
2. **解压**到可写目录（例如 `D:\xuri-classroom`）。解压后应能看到 `setup.cmd`、`start.cmd`、`stop.cmd`、`app\`、`lib\`、`config\`。
3. **双击 `setup.cmd`**（首次用它；直接双击 `start.cmd` 也会自动进入同一引导），完成环境准备并启动服务。
4. 等向导跑完。窗口按 4 步显示：**1/4 环境检查**（系统版本、位数、磁盘、8080/3307 端口、写权限）→ **2/4 JRE** → **3/4 MySQL**（下载、校验、解压裁剪、初始化数据目录、建库导入）→ **4/4 启动应用**，最后打印访问地址。
5. 浏览器会自动打开 `http://<本机IP>:8080`。没有自动打开就手输地址。
6. 用 `admin / 123456` 登录，**立即修改密码**（见[初始化](#初始化)）。

### 首次向导到底做了什么

| 步 | 内容 | 落到哪里 |
|---|---|---|
| 1/4 | 环境检查：系统版本、位数、磁盘、8080 与 3307 端口、写权限；生成配置（随机数据库口令、随机 JWT 密钥、`PORT=8080`），已存在则保留 | `config/app.env` |
| 2/4 | 下载 **JRE 8u512b09**（清华 TUNA 的 Adoptium 构建，约 38MB；失败自动换南京大学镜像），校验 SHA256 后解压 | `cache/\` → `runtime/jre8/\` |
| 3/4 | 下载 **MySQL 8**：优先华为/阿里镜像的 **8.0.28**（约 212MB），失败回退官方 **8.0.44**（约 233MB）；校验、解压裁剪，并初始化数据目录 | `cache/\` → `mysql/\`、`data/mysql/\` |
| 4/4 | 启动内置 MySQL（`127.0.0.1:3307`）→ 建库 `surveyking`、建用户 `xuri`、导入 `app/init-mysql.sql`、核对 `t_user` → 启动应用 → 轮询 `/api/system` → 尝试添加防火墙规则 | `data/mysql/\`、`logs/\`、`run/\`、系统防火墙 |

内置 MySQL **只监听 `127.0.0.1:3307`**，不对外；从外部连 3307 是连不上的，这是有意的设计。

## 首次向导失败怎么办

先别删目录，按这个顺序看：

1. **看向导窗口的最后几行**：通常是"下载失败""校验失败""端口被占用""初始化失败"几类。
2. **跑 `doctor.cmd`**：它就在**解压目录根，和 `setup.cmd` 同级**，双击运行。它会自检 Java、MySQL、端口、目录权限，并把日志与配置的完整路径打印出来。把它的输出提供给技术支持，基本能定位。
3. **看日志**：在**解压目录下的 `logs\`**（例如 `D:\xuri-classroom\logs\`），启动器日志与应用日志都在里面；初始化和启动失败的细节看这里。
4. **重试**：再次双击 `setup.cmd`。已下载好的包在 `cache/` 里不会重下。

常见原因与处理：

| 现象 | 原因 | 处理 |
|---|---|---|
| 下载卡住 / 超时 | 公司网络或代理拦截 | 换网络；或按下面的"离线安装"把压缩包放进 `cache/` |
| 下载完成但"校验失败" | 镜像返回了错误文件 / 被代理替换 | 删掉 `cache/` 里对应文件重试；或手工下载官方包放进 `cache/` |
| 提示端口 8080 被占用 | 上一个实例没停，或别的软件占了 | 先 `stop.cmd`；仍冲突就改 `config/app.env` 的 `PORT`；`netstat -ano \| findstr :8080` 查占用进程 |
| 提示 3307 被占用 | 另一个 MySQL 在跑 | 停掉那个 MySQL；或按 `config/app.env` 注释调整内置 MySQL 端口 |
| 初始化失败，日志里是权限错误 | 解压到了 `C:\Program Files` 或只读目录 | 挪到 `D:\xuri-classroom` 之类可写目录重来 |
| 应用起了但局域网打不开 | 防火墙规则没加成功（拒绝过提权） | 手动放行 8080：Windows 安全中心 → 防火墙 → 高级设置 → 入站规则 → 新建端口规则 |
| 双击 `setup.cmd` 窗口一闪而过 | 启动脚本报错太快 | 打开 PowerShell，进解压目录执行 `powershell -NoProfile -ExecutionPolicy Bypass -File lib\launcher.ps1 status`，看真实报错 |
| 杀毒软件报警/隔离 | `launcher` 会下载并解压可执行文件 | 给解压目录加白名单；确认下载源是本文列出的镜像/官方地址 |

### 离线安装

适合考点断网、或下载总是失败的环境：

1. 在能上网的机器上下载 JRE 8（Adoptium 8u512b09）与 MySQL 8 压缩包（8.0.28 或 8.0.44）。
2. 把它们按 `config/runtime.env` 里写的**文件名**放进解压目录的 `cache/`。
3. 再双击 `setup.cmd`：向导会优先使用缓存，只做校验、解压与初始化。

也可以把 `config/runtime.env` 里的下载地址改成内网镜像，再重跑向导。文件名与地址以该文件内注释为准。

## 目录结构

包内（解压后就有）：

```text
setup.cmd  start.cmd  stop.cmd  status.cmd  doctor.cmd
README.txt  VERSION
app/xuri-classroom-<version>.jar     应用（前端已内嵌，不需要 nginx）
app/init-mysql.sql                   空库初始化脚本
config/app.env.example               应用配置模板
config/runtime.env.example           运行时下载地址模板（JRE / MySQL）
lib/launcher.ps1                     启动器
```

运行期目录（首次向导后出现）：

| 目录 / 文件 | 内容 | 要不要备份 |
|---|---|---|
| `data/mysql/` | 内置 MySQL 数据 | **要** |
| `data/files/` | 上传的附件 | **要** |
| `config/app.env` | 端口、数据库密码、JWT 密钥 | **要**（丢了就换新密钥/新密码） |
| `logs/` | 应用与启动器日志 | 不用 |
| `run/` | PID 文件 | 不用 |
| `cache/` | 下载的 JRE / MySQL 压缩包 | 不用（删了会重下） |
| `runtime/jre8/`、`mysql/` | 解压后的运行时 | 不用（删了会重解压） |

## 初始化

- 首次向导自动建库、建表、写入种子数据（角色、用户组、系统参数）与管理员 `admin / 123456`。
- **程序不会强制改密**：请登录后到"账号设置"改掉默认密码。生产环境还要把 `config/app.env` 里的 `DB_PASSWORD`、`DB_ROOT_PASSWORD` 改成自己的值，并确认 `SK_JWT_SECRET` 已生成（丢了每次重启都会随机生成，所有人掉线）。
- `config/app.env` 里和部署相关的键：`PORT`（网站端口）、`DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD/DB_ROOT_PASSWORD`、`SK_JWT_SECRET`、`JAVA_OPTS`（默认 `-Xmx1024m`）、`FILE_STORAGE_ROOT`（默认 `data\files`）。下载源在 `config/runtime.env`（`JRE_URLS`、`MYSQL_MIRRORS`、`MYSQL_PORT`）。
- `app/init-mysql.sql` 只用于空库；`data/mysql/` 里已经有数据时**不要**再跑它（开头 25 处 `DROP TABLE IF EXISTS`，等于清库）。

## 访问

| 场景 | 地址 |
|---|---|
| 本机 | `http://127.0.0.1:8080` |
| 同局域网其他电脑 / 手机 | `http://<本机IP>:8080`（向导结束会打印这个地址） |

- 查本机 IP：`ipconfig`，看"IPv4 地址"。
- 改端口：编辑 `config/app.env` 的 `PORT`，然后 `stop.cmd` → `start.cmd`。
- 局域网打不开：先确认防火墙放行了端口，再确认两台机器在同一网段。

## 命令速查

| 命令 | 作用 |
|---|---|
| `setup.cmd` | 引导安装：环境检查 → JRE → MySQL → 启动。可重复执行，已完成的步骤会秒过 |
| `setup.cmd --whatif` | 只预演，不联网、不改文件 |
| `setup.cmd --step env\|jre\|mysql\|db\|app` | 只做某一步（例如 `--step db` 重建库/补导数据） |
| `setup.cmd --offline` | 只用 `cache\` 里已有的压缩包（断网环境） |
| `start.cmd` | 日常启动；未安装时会自动进入引导 |
| `stop.cmd` | 停止应用，再让 MySQL 正常 shutdown |
| `status.cmd` | 打印端口、PID、访问地址 |
| `doctor.cmd` | 体检；`doctor.cmd --fix` 尝试自动修复（重启 MySQL、重建数据库账号、补防火墙等） |

> 关机前请用 `stop.cmd` 正常停止，不要直接断电或强杀 `mysqld`——虽然 MySQL 下次能做崩溃恢复，但会慢很多。

## 备份

停服务后，整目录复制最省事：

```text
stop.cmd
# 复制整个解压目录（至少 data/ 与 config/）到备份盘
start.cmd
```

只想备数据库和附件时，复制 `data/mysql/` + `data/files/` + `config/app.env` 即可。建议每周一次，升级前必须一次。

## 升级

1. `stop.cmd`，然后备份 `data/`、`config/`。
2. 把新版本的 zip 解压到一个**新目录**。
3. 把旧目录的 `data/`、`config/`、`mysql/`、`runtime/` 复制到新目录（保留运行时与数据，避免重新下载）。
4. 在新目录 `start.cmd`（或 `setup.cmd`，如果发布说明要求迁移数据库）。
5. 打开首页、抽一份答卷验证；确认无误后再删旧目录。

## 回滚

停服务 → 用旧目录启动（`start.cmd`）即可。数据仍在旧目录的 `data/` 里，没被新版本动过。

如果新版本已经跑过数据库迁移，回滚程序不会回滚表结构：只能用升级前的备份恢复 `data/` 后再启动旧版本。

## 常见问题

| 问题 | 处理 |
|---|---|
| 忘了 admin 密码 | 用 MySQL 客户端连 `127.0.0.1:3307`（账号密码在 `config/app.env`），把 `t_account.auth_secret` 改成已知密码的 BCrypt 串；或恢复备份 |
| 页面能开但接口 500 | 多为数据库结构没跟上：看 `logs/` 里的 `Unknown column`，按发布说明跑迁移；不要用旧库跑 `init-mysql.sql` |
| 上传附件失败 | 检查 `data/files/` 所在磁盘空间；单文件上限默认 20MB |
| 时间不对 | 系统时区应为中国标准时间；数据库与应用同机一般无碍 |
| 换电脑搬迁 | 整目录复制过去（含 `data/`、`config/`、`mysql/`、`runtime/`）后 `start.cmd` |

更多共性问题见[部署常见问题](faq.md)。
