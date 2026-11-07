# 在飞牛 NAS 上继续开发这套系统：迁移与发布方案

> 适用对象：192.168.0.2（飞牛 fnOS，x86_64）这台学校在用的 NAS。
> 目标：开发、构建、联调全部搬到 NAS 上，同时**不破坏**正在使用的考试系统，也**不影响**飞牛 OS 后续升级。

---

## 0. 结论先行

三句话：

1. **开发环境搬到 NAS 是可行的，而且推荐搬到容器里**——代码放 `/vol2`，工具链（JDK/Node/Gradle/MySQL）全在容器里，宿主机的飞牛系统**一行 `apt install` 都不要执行**。这样既不影响升级，也不会把系统盘塞满。
2. **但「边用边改」的真正难点不在环境，在数据**：现在生产跑的是**上游官方镜像 `surveyking/surveyking:latest`（v1.13.2、H2 单文件库）**，而本仓库是二次开发分支（v1.13.0、MySQL、权限模型重做过）。两者**不能直接换 jar 上线**，中间必须做一次 H2 → MySQL 的数据迁移，且要演练。
3. **飞牛升级的风险可以精确规避**：飞牛的 OTA 升级是走 apt 的滚动更新（见 §6 引用），凡是"动系统层"的操作都可能让升级失败；只动 Docker 和数据卷则完全无关。**唯一建议在飞牛界面上改的设置是 Docker 的存储位置**（把它从系统盘挪到 `/vol2`），这属于官方支持项，不算改系统。

推荐路径：**先搬开发环境（1～2 天，零风险）→ 再搭演练环境跑真数据副本（1 周）→ 最后挑假期窗口切生产**。

---

## 1. 现场实测（2026-11-07）

### 1.1 硬件与系统

| 项 | 实测值 |
|---|---|
| CPU | AMD Ryzen 3 2200G，4 核 4 线程，最高 3.5GHz |
| 内存 | **8GB 总量**，已用约 3.8GB，可用约 3.3GB；swap 4GB（已用约 0.4GB） |
| 系统盘 | 三星 NVMe 128GB，系统分区约 59GB（`/vol1` 在系统池） |
| 数据盘 | `/vol2` 约 3TB |
| 用户 | uid 1000，路径约定 `/vol1/1000/...`、`/vol2/1000/...` |

### 1.2 正在跑的考试系统（**这是现状，不要动**）

| 项 | 实测值 |
|---|---|
| 容器名 | `surveyking` |
| 镜像 | `surveyking/surveyking:latest`，label 版本 **v1.13.2**（上游官方镜像） |
| 启动方式 | 手工 `docker run`（`Project` 为空，**不属于任何 compose 项目**） |
| 运行参数 | `PROFILE=h2`、`SERVER_PORT=1991`、`JAVA_OPTS=-Xms256M`（**没有 `-Xmx`**） |
| 对外端口 | 宿主机 **201** → 容器 1991 |
| 内存占用 | 实测约 730MB |
| 数据挂载 | 全部 bind mount：`/vol2/1000/surveyking/{db,files,config,logs}` |
| 数据库 | H2 单文件库：`db/surveyking.mv.db`，**47.9MB**（另有 `surveyking.trace.db` 8.8KB，说明跑出过错） |
| 资源限制 | 无 CPU/内存上限；日志 json-file 100MB × 5 |
| 站点信息 | 名称「威海市旭日职业培训学校」，API `/api/system` 返回 200，`dbInitialized: true` |

同机还有：`caddy-siyuan`（Cloudflare 版 caddy，8443）、`siyuan`（思源笔记 6806）、`syncthing`（host 网络）、`fnossshtool`（8000）。

### 1.3 三个必须知道的结论

**① 生产 ≠ 本仓库。**
本仓库是定制分支（前端重写、权限模型从"角色带权限串"改成"权限点 → 角色 → 用户组"），数据层是 MySQL；生产是上游官方镜像，数据层是 H2。而且 `server/rdbms/src/main/resources/scripts/init-mysql.sql` 开头有 **22 处 `DROP TABLE IF EXISTS`**，对着有数据的库执行就是清库。**绝不能把这个脚本喂给生产库。**

**② 没有任何自动迁移机制。**
全仓没有 Flyway / Liquibase / `schema.sql`，应用启动也不建表。现在的建表只发生在 MySQL 数据卷为空的首次启动。也就是说：**"加一个字段"目前没有安全落点**，谁手动改库谁负责记录。

**③ 没有可靠的"考试进行中"信号。**
库里没有在线会话表/心跳表；`t_answer.temp_save` 只覆盖"已登录且已拿到 answerId"的暂存，匿名中途答题零落库。所以**发布前不能靠 SQL 自动判断有没有人在考试**，只能靠"时间窗口 + 人工确认"（可选辅助：查 `t_project` 里 `status=1` 且 `setting.examSetting.startTime/endTime` 覆盖当前时间的记录）。

---

## 2. 目标架构

一台 8GB 的机器上，用 **Compose 项目名 + 端口 + 数据目录** 三重隔离，分四个栈：

```
                         ┌───────────────── NAS 192.168.0.2 ─────────────────┐
  学校师生 ──:201──────▶ │ surveyking（现状，上游 v1.13.2 + H2）              │
                         │   /vol2/1000/surveyking/{db,files,...}            │
                         │                                                    │
  你自己 ──:19080─────▶ │ xuri-dev（devbox + MySQL8）  ← VS Code Remote-SSH  │
                         │   /vol2/1000/xuri/src  (代码)                      │
                         │                                                    │
  验收/老师试用 ─:202─▶ │ xuri-staging（定制分支 + 真数据副本）              │
                         │   /vol2/1000/xuri/staging/{mysql,files}            │
                         │                                                    │
  切换后 ────────────▶ │ xuri-prod（定制分支，接管 201）                    │
                         │   /vol2/1000/xuri/prod/{mysql,files}               │
                         └────────────────────────────────────────────────────┘
```

**端口分配表**（避开飞牛自己占的 80/443/5666/5667/8000/8443/6806）：

| 栈 | 用途 | 宿主端口 | 备注 |
|---|---|---|---|
| 现状生产 | 学校在用的考试系统 | 201 | **在建新栈时一律不碰** |
| xuri-dev | Vite dev server | 19080 | 局域网直接访问，前端改完即刷即见 |
| xuri-dev | 后端（直连调试） | 17007 | 通常只经 Vite 代理，调试时才直连 |
| xuri-dev | MySQL 8 | 13306 | 只给本机/局域网工具连 |
| xuri-staging | 前端 nginx | 202 | 给老师试用、你自己验收 |
| xuri-staging | MySQL 8 | 13307 | |
| xuri-prod | 前端 nginx | 201 | 切换后接管，学校不用改收藏夹 |

> 2026-11-07 实测：除 201 外，202 / 19080 / 17007 / 13306 / 13307 **当前都是空闲的**，可以直接用。

**目录规划**（全部放 `/vol2`，不占系统盘）：

```
/vol2/1000/xuri/
├── src/            # 代码仓库（devbox 挂载为 /workspace）
├── backup/         # 备份包 + manifest + sha256
├── dev/            # 开发环境（compose、.env）
├── staging/        # 演练环境
└── prod/           # 切换后的生产
    ├── mysql/      # MySQL 数据目录（bind mount，飞牛备份能覆盖）
    └── files/      # 附件（bind mount）
```

> 为什么坚持 bind mount 而不是命名卷：飞牛的文件夹备份/快照只认卷上可见的目录，Docker 命名卷在 `/var/lib/docker/volumes` 下，容易被漏掉。生产数据必须"看得见、能打包"。

---

## 3. 第一步：把开发环境搬上去（零风险，先做）

### 3.1 代码怎么放上去

两条路，选一条即可：

- **推荐：在 NAS 上建裸仓库，Windows 直接 push 过去。**
  ```bash
  # NAS 上
  mkdir -p /vol2/1000/xuri/src && cd /vol2/1000/xuri/src
  git init --bare xuri-classroom.git
  # Windows 上
  git remote add nas ssh://<你的账号>@192.168.0.2/vol2/1000/xuri/src/xuri-classroom.git
  git push nas main
  ```
  好处：不依赖 GitHub/Gitee 连通性，历史完整，NAS 上再 `git clone` 出工作副本给 devbox 挂载。
- 备选：NAS 直接 `git clone` GitHub/Gitee。国内网络可能很慢，且失败时排查成本高。

### 3.2 devbox 容器

见 `deploy/nas/dev/`（本仓库新增）：一个 devbox 镜像（JDK 8 + Node 20 + Gradle 7.6 + git）+ 一个开发用 MySQL 8，Compose 项目名 `xuri-dev`，资源上限 2 核 / 3GB。

```bash
# NAS 上执行一次
bash deploy/nas/dev/bootstrap.sh
```

| 文件 | 作用 |
|---|---|
| `Dockerfile` | devbox 镜像：`eclipse-temurin:8-jdk-jammy` + Node 20（多阶段 COPY）+ Gradle 7.6（带 sha256 校验），非 root 用户 `dev`(uid 1000) |
| `docker-compose.yml` | `xuri-dev` 项目：devbox + mysql8，端口 19080/17007/13306，资源上限，日志轮转，独立网络 |
| `bootstrap.sh` | 幂等引导：CRLF 自检 → .env → docker/compose 检查 → 目录/源码检查 → 端口检查 → build → 预置卷属主 → up → 打印 VS Code 步骤 |
| `.env.example` | `DEV_SRC` / 三个端口 / 库名 / 密码 模板 |
| `gradle-init.gradle`、`npmrc.example` | 国内镜像加速（可选启用） |
| `README.md` | 使用说明 + 10 条常见故障 + 与仓库 `Dockerfile` 的版本差异说明 |

### 3.3 VS Code 怎么连

1. Windows 上装 **Remote - SSH** 扩展，连 `192.168.0.2`（实测 22 端口已开启；用你的飞牛账号或预置公钥登录，别用密码爆破式的脚本）。
2. 连上后用 **Dev Containers: Attach to Running Container** → 选 `xuri-dev-devbox-1`。
3. 打开 `/workspace`，此时编辑器、终端、构建全在 NAS 容器内，文件在 `/vol2` 上——**单一代码源，Windows 上不再留第二份正在改的代码**。

> 如果 VS Code Server 下载卡住（国内常见），在 Remote-SSH 里预置 `remote.SSH.serverInstallPath`，或先把 VS Code Server 包传到 NAS 上再指定路径。不要为了绕这个去改系统。

### 3.4 跑起来

```bash
# 后端（容器内）
cd /workspace/server && gradle :api:bootJar -x test
java -jar api/build/libs/*.jar --server.port=7007 --spring.profiles.active=dev

# 前端（容器内，另开一个终端）
cd /workspace/client && npm ci && npm run dev
# 浏览器打开 http://192.168.0.2:19080
```

注意：`client/vite.config.ts` 里 dev server **写死 80 端口且 `strictPort: true`**，所以只能靠容器内 80 → 宿主 19080 的映射来换端口；别想着改宿主机 80。

### 3.5 资源纪律（8GB 的机器，这条最容易翻车）

| 项 | 上限 |
|---|---|
| devbox | `cpus: 2`、`mem_limit: 3g` |
| Gradle | 容器内 `gradle.properties` 设 `org.gradle.jvmargs=-Xmx1536m`，别用默认 |
| 开发 MySQL | `mem_limit: 512m`，`innodb_buffer_pool_size=256M` |
| 构建时机 | **考试时段（工作日 8:00–18:00）不要跑全量构建**；晚上/周末随便跑 |
| 三个栈同时开 | 只在你做验收时开 staging，平时只开 dev |

现状生产一个进程就吃掉 730MB，且没有 `-Xmx`；再叠加 Gradle daemon + Node + MySQL，8GB 很容易进 swap。

---

## 4. 第二步：搭"真数据演练"环境（边用边改的关键）

「边用边改」的本质不是"直接在生产的库上改代码"，而是**随时能拿到一份与生产一致的数据副本，在上面改到满意，再用一条可回滚的路径切过去**。

### 4.1 数据副本从哪来

- **H2 不能热拷。** 运行中直接 `cp surveyking.mv.db` 可能拿到损坏文件（MVStore 有写缓冲）。正确做法二选一：
  1. 停容器 → 拷 `db/` → 起容器（约 10–20 秒不可用，建议 21:00 后）；
  2. 在线备份：`docker exec` 进容器用 H2 的 `BACKUP TO`（需要 H2 工具类，见 §5）。
- 附件目录 `/vol2/1000/surveyking/files` 和 `db` **必须在同一个时间点**取，否则会出现"答卷里有附件 id、文件里没有文件"的不一致。

对应脚本：`scripts/nas/backup.sh`（见本仓库新增）。

### 4.2 演练环境

`deploy/nas/prod/docker-compose.yml` 可以当模板，把端口改 202、数据目录改 `/vol2/1000/xuri/staging`，就是 staging。

验收清单（每次改动都跑一遍）：

- [ ] 登录、出卷、发布、答题、交卷、判分、导出 Excel 全链路能走通
- [ ] 老数据能打开：历史答卷、成绩单、错题本、附件图片
- [ ] 权限：老师 / 学员 / 超管三种角色看到的入口正确
- [ ] 并发：用 `scripts/dev/verify-load.js` 打一轮（别在生产上打）
- [ ] 数据和生产的差异在可解释范围内（行数对齐、抽样比对）

### 4.3 切换窗口

- 选**假期或周末**，提前通知学校"系统停机 30 分钟"。
- 顺序：停旧容器（**不删，只 stop，保留数据目录**）→ 起 xuri-prod（端口 201）→ 冒烟测试 → 通知恢复。
- 回滚：`docker stop xuri-prod-web` → `docker start surveyking`。旧数据目录一直留着，回滚是秒级的。
- 切换后**至少保留旧环境 2 周**再考虑清理。

---

## 5. H2 → MySQL 迁移评估（上生产的前置条件）

规模很小（库 48MB），技术上完全可行，但要有序做：

1. **拿一份 H2 副本**（停容器拷贝，或 `BACKUP TO`）。
2. **导出数据**：用 H2 的 `Script` 工具导出 SQL，或逐表 `CALL CSVWRITE(...)` 导出 CSV（对 MySQL 更友好）。
   ```bash
   # 从官方镜像里掏出 h2 的 jar（fat jar 内 BOOT-INF/lib 下）
   docker exec surveyking sh -c 'cd /tmp && unzip -o /app/surveyking.jar "BOOT-INF/lib/h2*.jar"'
   docker exec surveyking sh -c 'java -cp /tmp/BOOT-INF/lib/h2-*.jar org.h2.tools.Script \
     -url jdbc:h2:/app/db/surveyking -user sa -script /tmp/dump.sql'
   ```
3. **建目标结构**：用本仓库的 `init-mysql.sql` 在一个**空库**上建表（这个脚本本来就是给空库用的）。
4. **搬数据**：按外键顺序 `LOAD DATA` 或 INSERT；重点处理类型差异（H2 的 `BOOLEAN/CLOB/TIMESTAMP` → MySQL 的 `TINYINT/TEXT/DATETIME`）、自增起始值、`deleted` 逻辑删除字段。
5. **补增量字段**：定制分支新增的表/列（权限模型、审计日志、用户组有效期等）要单独补 DDL——`scripts/dev/*.sql` 里有一部分，但**不是全部，且不幂等**，需要整理成一份可重复执行的迁移清单。
6. **校验**：逐表行数对比、抽样主键对比、关键业务页面点开看。
7. **演练两次**再正式切。

> 备选路线：给分支加一个 `application-h2.yml`，让定制版直接读 H2（仓库里已经有 `init-h2.sql` 的痕迹）。**不推荐**作为生产方案：H2 单文件库的并发和在线备份能力都弱于 MySQL，学校是多人同时考试的场景。

---

## 6. 飞牛 OS 升级：什么会坏，什么不会

**为什么可以放心用 Docker**：飞牛的更新是走 apt 的滚动更新（官方论坛提问帖里，社区版主给的答复就是「不建议自行 apt 更新」「不要修改底层系统的任何服务和依赖包，飞牛升级时 99.99% 不会出问题，不然就很容易导致飞牛升级失败」）。参见：<https://club.fnnas.com/forum.php?mod=viewthread&tid=42131>。

**并且飞牛是"存算分离"的**：系统分区和存储池是两个东西，**系统升级/重装只覆盖系统分区，存储池里的数据完整保留**（这一点在飞牛官方 2026 年 2 月的安全事件处置说明里被明确写出来：「重装过程仅覆盖系统分区，原有存储池中的全部数据将完整保留」）。参见：<https://m.zol.com.cn/article/11294221.html>。

这条对我们的方案是决定性的：**代码放 `/vol2`（存储池），工具链放容器（镜像层也在存储池的 Docker 数据目录里），系统层一点不碰**。哪怕最坏情况要重装飞牛系统，`/vol2/1000/xuri` 里的代码和备份都还在，重建 devbox 只需要重新 `docker compose up -d --build`。

所以判断标准很简单：**你改的东西如果进了系统分区/系统包/系统服务，就有风险；只在 Docker 和数据卷里，就没风险。**

### 6.1 红线（会破坏升级，一律不要做）

| 操作 | 为什么危险 |
|---|---|
| `apt install` / `apt upgrade` 装 JDK、Node、MySQL、Maven | 升级时 apt 状态冲突，最经典的升级失败原因 |
| 改 `/etc/apt/sources.list*`、加第三方源 | 同上，且会污染依赖解析 |
| 装内核/驱动、改 grub、改 `/etc/fstab` | 直接导致起不来 |
| 改飞牛自带的 nginx/Web 服务配置 | 升级覆盖或冲突，管理界面打不开 |
| 手动改 systemd 单元、往 `/usr/lib/systemd` 塞东西 | 升级后行为不可预期 |
| 把 Docker 数据根目录留在系统盘 | 镜像/容器日志把系统分区塞满 → **升级时没空间，直接失败** |
| 用「应用中心」装开发工具类套件 | 套件升级路径与系统绑定，包袱更重 |

### 6.2 要做的三件事

1. **确认 Docker 根目录在 `/vol2`。**
   ```bash
   docker info | grep -i "docker root dir"
   # 期望：/vol2/... 而不是 /var/lib/docker（系统盘）
   ```
   如果还在系统盘：飞牛「Docker 应用 → 设置」里有存储位置选项，改之前先停容器、备份，属于**唯一建议在飞牛界面上做的改动**。
2. **生产容器加内存上限**（现状没有 `-Xmx`，8GB 机器上很危险）：给 `JAVA_OPTS` 补 `-Xmx1024m`，容器 `mem_limit: 1.5g`。这需要重启一次容器，安排在非考试时段。
3. **把自动升级改成手动，固定假期窗口升级。**
   飞牛曾经出现过 OTA 相关的安全问题（2025 年高危漏洞 + OTA 对抗事件，参见 <https://m.zol.com.cn/article/11294221.html>），所以**不能长期不升级**；但也不该让它在考试日自动重启。折中：关闭自动更新，每学期初升级一次，升级前跑一遍 `scripts/nas/backup.sh`，升级后验证 201 端口。

### 6.3 你需要接受的现实

飞牛 OTA 升级会重启整机，**所有容器都会停**。学校在用这台机器，所以升级时间本身就是一次"计划内停机"——把它当成发布动作来管理，而不是随手点。

---

## 7. 立即要做的 5 件事（按顺序）

1. **[今天]** 在 NAS 上确认 `docker info | grep "Docker Root Dir"`，不在 `/vol2` 就先规划迁移。
2. **[今天]** 跑一次 `bash scripts/nas/backup.sh`，先把现状数据备份出来（这是所有后续操作的安全带）。
3. **[1～2 天]** 拉起 `xuri-dev`，VS Code 连上去，把前后端在容器里跑通。
4. **[1 周]** 用备份搭 `xuri-staging`，跑一遍验收清单，记录所有"打不开/报错"的点。
5. **[假期]** 做 H2 → MySQL 迁移演练 → 切生产。

---

## 8. 附：常用命令速查

```bash
# 现状生产（只读观察，别乱动）
docker ps --filter name=surveyking
docker stats --no-stream surveyking
docker inspect surveyking --format '{{json .Mounts}}'

# 备份
bash scripts/nas/backup.sh --retention 14

# 发布前体检（只读）
bash scripts/nas/preflight.sh

# 发布 / 回滚
CONFIRM=yes bash scripts/nas/release.sh --tag 2026-11-08
bash scripts/nas/rollback.sh

# 看端口占用（发布前必查）
ss -lntp | grep -E ':(201|202|19080|17007|13306|13307)\b'
```

---

## 9. 本方案的验收标准

- [ ] 开发环境：Windows 上不改代码，全部改动发生在 `/vol2/1000/xuri/src`，VS Code 连着 NAS 容器
- [ ] 隔离：`docker ps` 里 `surveyking` 与 `xuri-dev-*` 同时存在，互不影响；201 端口始终是学校在用的那套
- [ ] 可回滚：任意一次发布都能在 5 分钟内回退到上一版本
- [ ] 可恢复：备份包能在一台干净机器上还原出可用系统（每学期演练一次）
- [ ] 不碰系统：`dpkg -l` 里没有你手动装的包；飞牛能正常检查到更新

---

## 10. 本次新增的文件（都已写入仓库，尚未提交）

### 开发环境 `deploy/nas/dev/`

| 文件 | 作用 |
|---|---|
| `Dockerfile` | devbox 镜像：JDK 8 + Node 20 + Gradle 7.6，非 root 用户 `dev`(uid 1000) |
| `docker-compose.yml` | Compose 项目 `xuri-dev`：devbox + MySQL 8，19080/17007/13306，资源上限 2C/3G + 512M |
| `bootstrap.sh` | 幂等引导脚本（CRLF 检查、.env、端口占用、构建、卷属主、启动、打印 VS Code 步骤） |
| `.env.example` | `DEV_SRC` / 端口 / 库名 / 密码 模板 |
| `gradle-init.gradle`、`npmrc.example` | 国内镜像加速（可选） |
| `README.md` | 使用说明、10 条常见故障、与仓库 `Dockerfile` 的版本差异 |

### 生产安全网 `scripts/nas/` + `deploy/nas/prod/`

| 文件 | 作用 | 退出码 |
|---|---|---|
| `scripts/nas/backup.sh` | 备份现状生产：**停容器 → 拷 H2 → 立刻起容器** + 附件/配置 + manifest + sha256 + 保留策略 | 0 成功 / 1 参数或未确认 / 2 备份失败（容器已恢复）/ 3 容器恢复失败（需人工） |
| `scripts/nas/preflight.sh` | 发布前只读体检：磁盘、备份新鲜度、容器健康、端口；考试中判定靠注入 SQL 或人工确认 | 0 可发布 / 1 阻塞 / 2 仅警告 |
| `scripts/nas/release.sh` | 体检 → 备份 → 打 `previous` 标记 → `up -d` → 健康轮询 → 失败自动回滚 | 0 成功 / 4 已自动回滚 / 5 回滚也失败 |
| `scripts/nas/rollback.sh` | 回滚到 `previous` 或指定 tag | 0 成功 / 4 回滚后不健康 |
| `deploy/nas/prod/docker-compose.yml` | **目标态**（定制分支上生产）：`xuri-prod`，bind mount，端口 201，资源上限，**刻意不挂 init 脚本** | — |
| `deploy/nas/prod/.env.example`、`README.md` | 密钥模板 + runbook（备份 → 恢复演练 → 切换 → 回滚 + 考试期判定） | — |

> 所有脚本都用 `bash scripts/nas/xxx.sh` 方式调用（Windows checkout 下没有执行位），不要依赖 `./xxx.sh`。

### 还没做、但必须做的事

1. **恢复演练**：拿一份真实备份，解包 → `sha256sum -c` → 起 `h2-drill` 容器（端口 1201）→ 登录 → 人工抽查题库/答卷/附件数量。没演练过的备份不算备份。
2. **H2 → MySQL 迁移方案定稿并全量演练**：见 §5，先用副本跑通，用「表清单 + 关键表行数 + 附件数量/字节数」对账。
3. **回填 `.gitattributes`**：仓库现在没有 `*.sh text eol=lf` 规则，建议补一条，避免以后在 Windows 上编辑脚本时引入 CRLF。

