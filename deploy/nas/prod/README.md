# 旭日云课堂 · NAS 生产 runbook（备份 / 演练 / 切换 / 回滚）

> 适用机器：`<nas-host>`（飞牛 fnOS，x86_64，Ryzen 3 2200G 4C/4T，8GB）
> 本目录里的 compose **不是**当前生产，是「定制分支上生产」时要切过去的目标态。

---

## 0. 先搞清楚现在跑的是什么

| 项目 | 当前生产（旧） | 本目录的目标态（新） |
|---|---|---|
| 启动方式 | 手工 `docker run`，**不属于任何 compose 项目** | `docker compose -p xuri-prod` |
| 容器 | `surveyking` | `xuri-prod-db-1` / `-app-1` / `-web-1` |
| 镜像 | `surveyking/surveyking:latest`（上游 v1.13.2） | `xuri-classroom`（app）+ `xuri-classroom-web`（web）+ `mysql:8.0` |
| 数据库 | **H2 单文件库**（`PROFILE=h2`，容器内 `/app/db`） | **MySQL 8**（容器内 `/var/lib/mysql`） |
| 对外端口 | 宿主机 **201** → 容器 1991 | 宿主机 **201** → nginx 80 → app 7007 |
| 数据位置 | 全部 bind mount 到 `<legacy-data-root>/{db,files,config,logs}` | bind mount 到 `<data-root>/prod/{mysql,files}` |
| 备份工具 | `scripts/nas/backup.sh`（停机拷 H2 + 附件） | `scripts/deploy/backup.sh`（进 db 容器 mysqldump） |

三条必须记住的事实（都已在仓库/机器上核实过）：

1. **应用启动时不做任何建表/迁移**：没有 Flyway / Liquibase。库是空的，应用起不来。
2. `server/rdbms/src/main/resources/scripts/init-mysql.sql` 里有 **22 处 `DROP TABLE IF EXISTS`**：
   **对着有数据的库执行 = 清库**。所以这个文件绝对不能挂在 `docker-entrypoint-initdb.d` 下自动跑
   （根目录 `docker-compose.yml` 是那样做的，那个文件**不能拿来上生产**）。
3. 系统里**没有在线会话表**，没有任何 SQL 能准确回答「此刻有没有人在答题」。
   能做的最强信号见第 5 节，且**未在生产库验证**。

---

## 1. 备份（当前 H2 生产）

```bash
# 默认：停容器 → 拷 H2 目录 → 起容器；附件/配置在恢复生产后再打包
sudo CONFIRM=yes bash scripts/nas/backup.sh

# 保留 14 份（默认）、自定义目录
sudo CONFIRM=yes bash scripts/nas/backup.sh --retention 14 --output <data-root>/backup

# 想先看它打算干什么（不动生产）
bash scripts/nas/backup.sh --dry-run

# 无人值守（cron）：把确认写进 cron 行
# 0 3 * * *  cd <仓库所在绝对路径> && CONFIRM=yes bash scripts/nas/backup.sh --yes >> <data-root>/backup/cron.log 2>&1
```

产物（`<data-root>/backup/`）：

```
backup_20261107-134229.tar.gz            # 归档
backup_20261107-134229.tar.gz.sha256     # 旁挂校验（不解包就能核）
backup_20261107-134229.tar.gz.manifest.txt
   └─ 解包后：db.tar.gz / files.tar.gz / config.tar.gz / manifest.txt / SHA256SUMS
```

核对：

```bash
cd <data-root>/backup && sha256sum -c backup_20261107-134229.tar.gz.sha256
mkdir -p /tmp/chk && tar -xzf backup_20261107-134229.tar.gz -C /tmp/chk
cd /tmp/chk && sha256sum -c SHA256SUMS
```

### ⚠️ H2 运行中不可直接 `cp` / `tar`

H2 单文件库在**应用进程持有文件锁**期间一直有内存里未落盘的页；运行中直接 `cp -a db/` 或
`tar czf db.tar.gz db/` 拷到的是「写了一半的库」——恢复时可能直接报 corrupt，
也可能看着能打开却丢了最近几笔答卷。

正确做法（按优先级）：

1. **停机拷贝**（`backup.sh` 默认）：`docker stop` 让 H2 干净关闭（exit code 0）→ 打包 → `docker start`。
   这是唯一能保证一致性的通用做法，停机窗口只覆盖 `db` 目录（通常几十 MB，秒级）。
2. **`--hot`**：只在「库已经坏了要抢救现有文件」或「已确认无人使用且愿意承担风险」时用。
   脚本会打长篇警告，且这份备份**不能当正式备份**，必须先在演练环境打开验证。
3. 不做「在线 H2 `BACKUP TO`」：它必须由持有库连接的那个 JVM 执行，从第二个进程连同一个
   文件库会撞文件锁（这个库没开 `AUTO_SERVER`）。上游镜像里也没有可核实的 H2 工具入口，
   在脚本里硬编一个 `/app/xxx.jar` 路径等于编造。

---

## 2. 恢复演练（**必须在切换前做完，且只在你自己的目录里做**）

演练的目的只有一个：**证明这份备份真能打开、数据真在里面**。别在生产 `db` 目录上试。

```bash
# 1) 建演练目录（不要放在生产的 <legacy-data-root> 下面）
DRILL=<data-root>/drill/20261107
mkdir -p "$DRILL" && cd "$DRILL"

# 2) 解包 + 校验
tar -xzf <data-root>/backup/backup_20261107-134229.tar.gz -C .
sha256sum -c SHA256SUMS

# 3) 把 db.tar.gz 展开成一份独立的 H2 目录
mkdir -p restore-db && tar -xzf db.tar.gz -C restore-db
ls -la restore-db/db        # 应该看到 surveyking.mv.db 之类的库文件

# 4) 用**上游镜像**起一个临时实例（换端口 1201，名字带 drill，绝不碰生产容器）
docker run -d --name h2-drill -p 1201:1991 \
  -e PROFILE=h2 -e SERVER_PORT=1991 \
  -v "$DRILL/restore-db/db:/app/db" \
  surveyking/surveyking:latest

# 5) 等 30 秒再访问 http://<nas-host>:1201
#    要用 admin 登录、翻题库/项目、看一眼最近答卷、下载一个附件
#    —— 数据库能起来只证明「文件没坏」，数据对不对必须人眼抽查

# 6) 收尾（注意：**不要加 -v**。我们用的是 bind mount，没有命名卷要删）
docker stop h2-drill && docker rm h2-drill
```

演练记录请写在这里（谁、什么时候、抽查了什么、附件数量和字节数是否对得上）：

| 日期 | 备份文件 | 演练结果 | 抽查内容 | 执行人 |
|---|---|---|---|---|
| | | | | |

---

## 3. 切换（H2 → 目标态 MySQL 栈）

> 这一步是**单向且有数据风险**的操作。前面两件事没做完不要开始：
> ① 第 2 节演练通过；② 已有当天新鲜备份。

### 3.1 先把迁移方案定下来（脚本不能替你决定）

定制分支用的是 MySQL + `init-mysql.sql` 定义的表结构，旧生产是上游 v1.13.2 的 H2 库。
**两者表结构不一定逐字段一致**，所以不能「把 H2 文件丢给 MySQL」。两条现实路线：

- **路线 A（推荐）应用层导出/导入**：用当前后台自带的项目/题库导出功能导出，
  在新实例里导入；答卷等历史数据是否能一并导出，以当前版本后台为准。
- **路线 B 一次性转换脚本**：把 H2 的表逐表转成 `init-mysql.sql` 的结构。
  这条路**必须先比对两套 schema**（表名、列名、类型、JSON 字段），并在演练环境跑通全量，
  否则就是拿生产数据试错。

无论走哪条，验收标准都一样（第 3.5 节的数字必须对得上）。

### 3.2 准备目录与密钥

```bash
sudo mkdir -p <data-root>/prod/{mysql,files}
sudo chmod 750 <data-root>/prod
cd <仓库>/deploy/nas/prod
cp .env.example .env
vi .env          # 必填 DB_PASSWORD、SK_CRYPTO_KEY；建议 JWT_SECRET 也填
chmod 600 .env
# 密钥生成：
openssl rand -base64 32     # → SK_CRYPTO_KEY
openssl rand -base64 48     # → JWT_SECRET
# ！！！JWT_SECRET 要抄进密码管理器（丢了所有登录态失效，用户重新登录即可，影响可控）
# 注意：SK_CRYPTO_KEY 目前**没有任何代码在用**（Java 里零引用），填随机值不影响数据；
#      等你真正实现字段加密前，不要把它当成"题库已加密"的证据
```

### 3.3 首次建库（受控，别挂 init 脚本自动跑）

```bash
cd <仓库>/deploy/nas/prod
# 把 .env 读进当前 shell，后面命令用 $DB_PASSWORD（只影响这个终端会话）
set -a; . ./.env; set +a

# 1) 拉 MySQL 镜像（8GB 机器上第一次拉要几分钟）
docker compose pull db

# 2) 确认数据目录是空的（第一次切换必须为空）
ls -A <data-root>/prod/mysql      # 应该没有任何输出

# 3) 只起 db，等 healthy
docker compose up -d db
docker compose ps db

# 4) ★闸门★：确认库里 0 张表。不是 0 就立刻停手——导入 init-mysql.sql 会清库
docker compose exec -T -e MYSQL_PWD="$DB_PASSWORD" db \
  mysql -uroot -N -B -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='surveyking';"
#    期望输出：0

# 5) 上一行为 0 才导入（<仓库> 换成你的实际路径）
docker compose exec -T -e MYSQL_PWD="$DB_PASSWORD" db \
  mysql -uroot surveyking \
  < <仓库>/server/rdbms/src/main/resources/scripts/init-mysql.sql

# 6) 校验表数量（应与 init 脚本里的建表语句数一致），然后起 app 看能不能连上
docker compose exec -T -e MYSQL_PWD="$DB_PASSWORD" db \
  mysql -uroot -N -B -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='surveyking';"
```

### 3.4 切换

```bash
cd <仓库>/deploy/nas/prod

# 0) 体检（会检查备份新鲜度、磁盘、端口、容器健康；考试中判定见第 5 节）
CONFIRM=yes bash scripts/nas/preflight.sh --compose-dir . --port 201
#    退出码 0 或 2 才能继续；1 表示有阻塞项

# 1) 停旧容器（**只 stop，不要 rm**：容器定义、端口映射、数据目录都留着，回滚就靠它）
docker stop surveyking
docker ps -a --filter name=surveyking          # 确认是 Exited，还在

# 2) 起目标栈（此时 201 已腾出）
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:201/api/system

# 3) 迁移数据（按 3.1 选定的路线执行），然后做 3.5 的对账
```

### 3.5 切换后必须对的账

```bash
cd <仓库>/deploy/nas/prod
set -a; . ./.env; set +a

# 表清单：和 init-mysql.sql 里的建表语句逐条对照
docker compose exec -T -e MYSQL_PWD="$DB_PASSWORD" db \
  mysql -uroot -N -B surveyking -e "SHOW TABLES;"

# 关键业务表的行数：表名从 init-mysql.sql 里取（不要凭印象写），
# 旧库/新库各跑一遍同样的 COUNT(*)，逐张对比
docker compose exec -T -e MYSQL_PWD="$DB_PASSWORD" db \
  mysql -uroot -N -B surveyking -e "SELECT COUNT(*) FROM <表名>;"

# 附件：数量 + 总字节数（这两个数字最容易被忽略，但用户最先发现）
find <legacy-data-root>/files -type f | wc -l        # 旧
find <data-root>/prod/files  -type f | wc -l        # 新
du -sb <legacy-data-root>/files
du -sb <data-root>/prod/files
```

对不上就别急着宣布切换成功——**旧数据目录 `<legacy-data-root>` 在观察期内一律不动**。

---

## 4. 回滚

### 4.1 目标栈内部回滚（同形态换镜像，最常见）

```bash
bash scripts/nas/rollback.sh --list                 # 看有哪些镜像可用
bash scripts/nas/rollback.sh --dry-run              # 看计划
CONFIRM=yes bash scripts/nas/rollback.sh            # 回到 previous
CONFIRM=yes bash scripts/nas/rollback.sh --to 20261101-0930
```

`release.sh` 在健康检查失败时会自动走同一套逻辑，并把 app/web 日志尾部打出来。

### 4.2 整体切回旧 H2 生产（切换失败/数据对不上）

```bash
cd <仓库>/deploy/nas/prod

# 1) 停目标栈 —— 用 stop，不要用 down（更不要 down -v）
docker compose stop

# 2) 拉起旧容器（它的数据目录一直原样没动过）
docker start surveyking
docker ps --filter name=surveyking
curl -fsS http://127.0.0.1:201/api/system

# 3) 旧库数据如果被改过（理论上不会），按第 2 节用备份覆盖 <legacy-data-root>/db
```

> 全流程**禁止**：`docker compose down -v`、`docker rm -v`、`rm -rf <legacy-data-root>`。
> 这几种命令会连数据一起带走，而这个系统没有别的地方留着那份数据。

### 4.3 回滚之后

- 把失败的 app 日志（`docker compose logs --tail=200 app`）和这次 `--image` 的 tag 记录下来；
- 目标栈的 MySQL 数据目录 `<data-root>/prod/mysql` **留着**：它可能是排查现场，
  也可能是你唯一一次迁移的结果；确认不再需要之后再人工清理。

---

## 5. 考试期间到底能不能发版？

**没有可靠的自动判断。** 系统没有在线会话表，`status`、`examSetting` 这类字段的含义必须以
当前数据库里的真实数据为准。脚本因此设计成两级：

1. **给了 SQL**（`--exam-sql` 或 `EXAM_CHECK_SQL`）：`preflight.sh` 会进 MySQL 容器执行，
   把结果当「进行中的考试数」：`>0` 判为考试中（阻塞），`0` 判为没有。
2. **没给 SQL / 拿不到结果**（当前 H2 形态属于这种）：降级为**人工确认**——
   打印当前时间并要求 `CONFIRM=yes`，否则按阻塞处理。

下面这条查询只是**候选**，用来评估 `t_project.setting` 的 JSON 结构：

```sql
-- ⚠️ 未在生产库验证过：字段路径与时间格式都要先在只读副本上核对
SELECT COUNT(*) AS ongoing
FROM t_project
WHERE status = 1
  AND JSON_EXTRACT(setting, '$.examSetting.startTime') IS NOT NULL
  AND STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(setting, '$.examSetting.startTime')), '%Y-%m-%d %H:%i:%s') <= NOW()
  AND STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(setting, '$.examSetting.endTime')),   '%Y-%m-%d %H:%i:%s') >= NOW();
```

用法：

```bash
# 先把查询在只读副本/演练库上跑通，确认字段路径与时间格式
CONFIRM=yes bash scripts/nas/preflight.sh --exam-sql <data-root>/exam-check.sql
```

任何情况下，**教师正在收卷的时间点不要发版**；预约考试的空档、午休、晚上更安全。

---

## 6. 环境变量（本目录 compose）

| 变量 | 默认 | 说明 |
|---|---|---|
| `DB_NAME` | `surveyking` | 库名 |
| `DB_PASSWORD` | 无（**必填**） | MySQL root 密码；compose 缺失会拒绝启动 |
| `SK_CRYPTO_KEY` | 无（compose 必填） | **当前未实现加密**：Java 里零引用，仅占位；填随机值不影响数据 |
| `JWT_SECRET` | 空 | JWT 签名密钥；不填则每次重启所有人掉线 |
| `APP_PORT` | `201` | 宿主机对外端口（沿用学校现端口） |
| `XURI_DATA_DIR` | `<data-root>/prod` | 数据根目录（`mysql/`、`files/` 落在它下面） |
| `XURI_APP_IMAGE` | `xuri-classroom:latest` | app 镜像（`release.sh` 会覆盖） |
| `XURI_WEB_IMAGE` | `xuri-classroom-web:latest` | web 镜像（`release.sh` 会覆盖） |
| `JAVA_OPTS` | `-Xmx768m` | JVM 上限；同时写入 `JAVA_OPTS` 与 `JAVA_TOOL_OPTIONS` |

资源上限：app `mem_limit 1g`、db `512m`、web `128m`；日志统一 `json-file` `10m × 3`。
（这台 8GB 机器上旧 H2 进程还要占约 1.4GB，别把上限加起来超过内存。）

---

## 7. 上线前检查清单

**必须先做完的两件事：**

- [ ] **用真实备份做一次完整恢复演练**（第 2 节），并且人眼抽查过题库/答卷/附件。
      没演练过的备份不算备份。
- [ ] **确定 H2 → MySQL 的迁移方案**（第 3.1 节路线 A 或 B），在演练环境把全量数据跑通一遍，
      第 3.5 节的数字对得上。

其余：

- [ ] `SK_CRYPTO_KEY` / `JWT_SECRET` / `DB_PASSWORD` 已存进密码管理器（不是只存在 NAS 上）
- [ ] 飞牛的「文件夹备份 / 快照」已覆盖 `<data-root>/prod` 与 `<legacy-data-root>`
- [ ] 备份 cron 已配（第 1 节），且 `preflight.sh` 能读到 24h 内的新备份
- [ ] NAS 磁盘剩余 > 5GB（`preflight.sh` 会卡这条）
- [ ] 演练环境（另起端口，如 1201）在切换后保留 1–2 周，别急着删

---

## 8. 已知未验证项（写清楚，别当已测）

1. 目标态 compose 从未在这台 NAS 上真正 `up -d` 过（当前无 Docker 的开发机只做了语法与变量校验）。
2. H2 → MySQL 的 schema 差异没有逐字段比对；第 3.1 节两条路线都还没在真实数据上跑过。
3. 第 5 节的考试中查询依赖 `t_project.setting` 的 JSON 结构，**未在生产库验证**。
4. `preflight.sh` 的端口占用检测依赖宿主机有 `ss` 或 `netstat`；飞牛若都没有，会降级为警告。
5. `release.sh` 自动回滚只在「镜像层面」验证过（测试桩），真实容器层面的回滚演练还没做过。
