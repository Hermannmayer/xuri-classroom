---
title: "升级与迁移"
description: "三端一键升级、数据库结构自动迁移、失败回滚与数据安全边界"
---

# 升级与迁移

从 v2.1.0 起，三端发布包根目录都带 **upgrade**（升级）和 **migrate**（单独迁移）两个入口。
**全新安装不受影响**：新装仍然用 setup.cmd / install.sh / docker compose，升级脚本会自己识别并让路。

## 一句话版本

| 端 | 升级命令 |
|---|---|
| Windows | 把新 zip **解压到旧安装目录（覆盖）**，双击 `upgrade.cmd` |
| Linux | `tar -xzf 新包.tar.gz && cd 新包目录 && sudo bash upgrade.sh` |
| Docker | `tar -xzf 新包.tar.gz && cd 新包目录 && sudo bash upgrade.sh` |

升级脚本会自己找到已安装的实例；找不到就打印"这是全新安装，请用 setup/install/compose"并**零改动退出**。

## v2.3.1（补丁）

只包含一个**数据权限**迁移：给内置 `teacher` 角色补题库维护权限（幂等 UPDATE，不动表结构、不动业务数据）。
升级前按惯例备份即可；已部署库启动时自动执行 `V2.3.1__teacher_repo_permissions.sql`。
自定义角色不会自动获得这些权限，需要管理员在「权限」页手动勾选。
## v2.3.0 升级须知（数据层变化较大）

这一版跨了 6 个数据库迁移（V2.2.1 ~ V2.2.6），同时把运行时换到 Java 25 / Spring Boot 4.1。
**升级前请先按下面清单备份**；升级脚本自身也会备份并校验，但备份多一份不亏。

| 备份对象 | 命令 / 位置 | 说明 |
|---|---|---|
| 数据库 | `mysqldump --single-transaction --routines --triggers <库名> \| gzip > db_$(date +%F).sql.gz` | 升级脚本会在停应用后自动 dump；手工再存一份更稳 |
| 附件目录 | 打包 `files/`（或部署时挂载的文件目录） | 答卷签名、上传图片、题目图片都在这里 |
| 配置 | `application.yml` / `.env` | 含 `JWT_SECRET`、数据库密码、导出密码 |
| 旧程序 | 升级包会把旧 jar 存成 `app.jar.bak.<版本>`（Docker 打 `:previous` 镜像） | 回滚用 |

本次自动执行的迁移（只增量、幂等，失败可重跑）：

- `V2.2.1` 答卷批改字段（`answerer_name` / `grade_status` / `graded_by` / `graded_at` / 批改索引 / `t_answer_grade`）
- `V2.2.2` 通知公告（`t_notice` / `t_notice_read`）
- `V2.2.3` 审计明细（`before_json` / `after_json` / `source` / `request_id` / 目标索引）
- `V2.2.4` AI 用量（`t_ai_usage`）
- `V2.2.5` API 令牌与写操作幂等（`t_api_token` / `t_api_idempotency`）
- `V2.2.6` 审计清理索引（`idx_audit_create_at`）

升级后建议的验收顺序：`/api/system/version` 返回 `2.3.0` → 管理员登录 → 打开首页（统计不为 0）→ 建一场考试并交一份卷 → 导出一次（Excel 与 PDF ZIP）→ 打开「系统设置 → AI」确认模型可选。

行为变化（会影响老师与外部脚本，升级后同步通知）：

- 导出 ZIP 按 `成绩单/`、`答题卷/`、`长图/`、`确认单/` 分子目录；签名/上传图片总是包含；成绩确认单改为整班一张表。
- 题库/试卷导入模板升级为 13 题型（旧 5 类模板仍可导入）；题库导出的 xlsx 现在能被重新导入。
- 权限点数量变化，自定义角色需在「权限」页手动补 `ai:use` 等新权限。


## 升级做了什么（顺序固定）

```
停应用 → 备份并校验 → 换程序 → 启动（此时自动迁移数据库） → 校验 → 失败回滚
```

1. **停应用**：Windows 停 java 进程、Linux `systemctl stop`、Docker `compose stop app`。数据库保持运行（备份要用）。
2. **备份**：数据库 dump + 附件目录 + 配置（含 `JWT_SECRET` 等密钥）+ 旧程序。备份**校验不通过就中止**，并把服务恢复启动。
3. **换程序**：Windows 移除旧 jar、保留新 jar；Linux 把旧 jar 存成 `app.jar.bak.<版本>`；Docker 构建本地镜像并把旧镜像打上 `:previous`。
4. **启动**：应用启动时检查数据库结构（见下节），必要时执行迁移。
5. **校验**：轮询 `GET /api/system/version`，必须同时满足「版本 == 新版本」和「返回了 schemaStatus」（说明迁移已跑完）。
6. **失败回滚**：停 → 换回旧程序 → 重启 → 再校验一次。回滚只回滚**程序**，不回滚数据。

## 数据库迁移是怎么发生的

应用每次启动都会做一次**结构探测**：

```
读取 information_schema（有哪些表/列/索引）
  → 对照 jar 内 db/schema.json，从高到低匹配，判断库结构走到哪个版本
  → 若低于程序版本，按版本升序执行 db/migration/V<版本>__*.sql
  → 若高于程序版本（回滚过程序），只告警，不降级
```

几个刻意的设计：

- **不用"迁移记录表"判断跳过**。存量库没有版本记录，任何 baseline 方案都可能在"结构其实落后、但记账表说有"的库上静默漏迁。结构探测没有这个盲区。
- **迁移脚本必须幂等**：每条 DDL 先查 `information_schema`，已存在就跳过。失败后重跑安全。
- **只允许增量**：`db/migration/*.sql` 里出现 `DROP TABLE`、`DROP COLUMN`、`TRUNCATE`、`DELETE FROM`、无 `WHERE` 的 `UPDATE`，`scripts/release/check_schema.py` 会直接让流水线变红。这样程序回滚时旧版本仍能跑。
- `t_schema_version` 表只用于排查（哪天、哪个脚本动过库），不参与判断。

## 数据安全边界

| 风险 | 防线 |
|---|---|
| 升级中途失败 | 程序自动回滚到旧版本；数据库只做了增量变更，旧程序能继续用 |
| 备份没做成功 | 备份校验（非空、gzip 可解、表数可查）不通过 → 不换程序、立即恢复启动 |
| 迁移脚本写错 | 只允许增量 + 幂等；真出问题时用升级前备份恢复（脚本会打印路径） |
| 误删数据卷 | 升级脚本**从不执行** `docker compose down -v`，不删任何卷 |
| 升级时有人在答题 | 脚本会先停应用；建议在无考试时段升级 |

**备份位置**：

| 端 | 路径 |
|---|---|
| Windows | `<安装目录>\backup\upgrade-<时间>\`（db.sql、config/、old-jars/、可选 files/） |
| Linux | `<安装目录>/backup/upgrade-<时间>/`（db.sql.gz、files.tar.gz、app.env、app.jar） |
| Docker | `<安装目录>/backup/upgrade-<时间>/`（db.sql.gz、files.tar.gz、app.env） |

> 备份里的 `app.env` / `.env` 含数据库口令与 JWT 密钥，权限已设为 600，**不要发群、不要提交仓库**。

## 单独执行迁移（排障用）

正常升级**不需要**它。只有"应用起不来、日志里是 `Unknown column` / 表不存在"时才用：

```bash
# Docker / Linux：在发布包目录
sudo bash migrate.sh

# Windows：没有单独入口，直接 start.cmd（启动即迁移）或 setup.cmd --step db
```

`migrate.sh` 会把包内 `migrations/*.sql` 全部幂等执行一遍，然后打印 `t_schema_version` 最近几条记录。

## 怎么确认升级成功

```bash
curl -fsS http://127.0.0.1:<端口>/api/system/version
```

正常返回类似：

```json
{"version":"2.1.0","schemaVersion":"2.1.0","schemaStatus":"UPGRADED"}
```

`schemaStatus` 取值：

| 值 | 含义 |
|---|---|
| `OK` | 结构本来就是最新的，没动数据库 |
| `UPGRADED` | 执行了迁移，已到最新 |
| `AHEAD` | 库比程序新（回滚过程序），不降级，继续跑 |
| `DISABLED` | 显式关了自动升级（`SK_SCHEMA_AUTO_UPGRADE=false`） |

## 手动升级（不用脚本）

三端都仍然支持手工升级，语义与脚本一致：

| 端 | 手工步骤 |
|---|---|
| Windows | 停 → 覆盖 `app\` + `VERSION` → 启动 |
| Linux | `systemctl stop` → 换 `app.jar` → `systemctl start` |
| Docker | 改 `.env` 的 `VERSION` → `docker compose up -d app` |

手工升级**不会自动备份**，请自己先备份数据库。

## 回滚

| 端 | 做法 |
|---|---|
| Windows | 把 `backup\upgrade-<时间>\old-jars\` 里的 jar 复制回 `app\`，`start.cmd` |
| Linux | `sudo cp app.jar.bak.<旧版本> app.jar && sudo systemctl restart xuri-classroom` |
| Docker | 把 `.env` 的 `VERSION` 改回旧版本，`docker compose up -d app`（或 `docker tag <repo>:previous <repo>:<旧版本>`） |

数据库结构**不会**跟着回滚：迁移是增量的，旧程序能正常读写；只有当迁移脚本本身出错、需要恢复数据时，才用升级前备份。

## 常见问题

**Q：双击 upgrade.cmd 一闪而过？**
在文件夹地址栏输入 `cmd` 回车，再运行 `upgrade.cmd`，就能看到具体错误；也可以看 `logs\upgrade-*.log`。

**Q：提示"没有在 /opt/xuri-classroom 找到已安装的实例"？**
说明路径不对。加 `--dir <实际安装目录>`；如果确实是第一次装，用 setup / install / compose。

**Q：提示"发布包版本低于已安装版本"？**
这是防误降级。确实要降级加 `--force`，但降级前务必确认数据库备份可用。

**Q：升级后页面 500，日志是 Unknown column？**
说明迁移没跑完或被手工改过库。先 `bash migrate.sh` 补结构；仍不行就看 `t_schema_version` 和 `db/schema.json` 的差异，必要时用备份恢复。

**Q：能不能不停服升级？**
不建议。迁移会改表结构，在线执行会锁表、和老进程写入打架；先停再升是刻意的。
