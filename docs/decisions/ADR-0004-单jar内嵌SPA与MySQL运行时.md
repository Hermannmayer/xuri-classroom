---
title: "ADR-0004 单 jar 内嵌 SPA 与 MySQL 运行时"
description: "为什么安装包只发一个 jar、为什么放弃 H2、为什么 Windows 只出一个包"
---

# ADR-0004 单 jar 内嵌 SPA 与 MySQL 运行时

## 状态

已接受（2026-11，2.0.0 起）。影响范围：发布包形态、安装与升级流程、初始化脚本的取舍。

## 背景

1.x 的运行形态是**三件事分开**：nginx 托管前端静态文件、Java 进程只提供 `/api`、MySQL 单独一个实例。仓库里的 `Dockerfile`（`web` + `app` + `db`）和线上 NAS 的 `xuri-live-web` / `xuri-live-app` / `xuri-live-db` 都是这个形态。

这套形态对"自己会运维的服务器"没问题，但对 2.0.0 要交付的三类用户不合适：

- **Windows 单机用户**（考点、教研室）：让他们装 nginx 配反代不现实。
- **Linux 单机用户**：为一个静态目录再养一个服务和一份配置，没有收益。
- **Docker 用户**：两个容器（前端 + 后端）意味着两份镜像、两个版本、两套健康检查。

同时，仓库里还留着 `server/rdbms/src/main/resources/scripts/init-h2.sql` 和一句"另提供 H2 初始化脚本，便于本地起步"的说法。这条说法在 2.0.0 已经不成立，继续留着会把新环境带进一个跑不起来的分支。

本 ADR 记录三件事的取舍：**发布包单 jar 内嵌 SPA**、**运行时只支持 MySQL 8**、**Windows 只出一个包**。

## 决策一：发布包只发一个 jar，前端打进 classpath

2.0.0 起，发布用的 jar 用 `-PwithSpa` 构建（`./gradlew :api:bootJar -Ppro -PwithSpa`）：`client/dist` 被打进 `BOOT-INF/classes/static/`。运行时由 `SpaWebConfig`（`@ConditionalOnProperty("sk.web.spa.enabled")`，对应环境变量 `SK_WEB_SPA_ENABLED`，默认 `false`）接管：

- `/` 直接返回 `static/index.html`；
- 其余 `/**` 先找静态资源，找不到且路径不带扩展名才回落 `index.html`（前端路由生效）；
- `/api/**`、`/captcha/**`、`/files/**` **不回落**——否则调用方会拿到 200 的 HTML，排查 404 时非常误导；缺失的 `.js` / `.css` 这类带扩展名的文件也直接 404。

三个发布形态都显式打开 `SK_WEB_SPA_ENABLED=true`（Windows `lib/launcher.ps1`、Linux `app.env`、`docker/Dockerfile.runtime` 的 `ENV` 与 compose 环境变量）。

**保留 nginx 形态**：开关关闭时行为与 1.x 完全一致（前端由 nginx 提供）。NAS 线上继续用 nginx 容器 + `vite build --watch` 的开发回路，不受本决策影响。

理由：

1. **安装成本**：单进程只暴露一个端口，不需要再教用户配 `/api`、`/files` 的反代。
2. **端口语义变简单**：不再有"前端 80、后端 7007"两套端口。安装包默认 8080，改端口只改一个值。
3. **前后端同版本**：jar 里的前端与后端来自同一个提交，不会再出现"换了前端没换后端"的错配。
4. **交付物唯一**：一个 jar 就是一个版本，校验和、升级、回滚都只对一个文件。

代价（接受）：

- jar 变大（前端 dist 进 jar，增加数 MB）。
- 改前端必须重打 jar；所以 NAS 生产继续保留 nginx + watch 形态，这也是 `SK_WEB_SPA_ENABLED` 开关存在的理由。
- 静态资源的缓存头与压缩由 Spring 处理（`application-pro.yml` 已开 `server.compression`），可调性不如 nginx。

被否决的替代方案：

- **发两份包（nginx 版 + 单 jar 版）**：CI 与文档都要维护两条路径，用户还要先判断自己属于哪类。
- **jar 只带 API，前端靠安装脚本拉 nginx**：把复杂度推给最不该承担的 Windows 用户。
- **前端放 CDN**：内网考点无法访问，且版本更难对齐。

## 决策二：运行时只支持 MySQL 8，不再提供 H2

对比 `init-h2.sql`（H2，表头写的是 `SET MODE MySQL`）与 `init-mysql.sql`（MySQL 8），2026-11 实测差距如下。

**表：H2 24 张，MySQL 29 张，H2 缺 5 张**

| 缺失表 | 对应功能 |
|---|---|
| `t_anonymous_subject` | 匿名答卷主体（匿名 cookie token 的 SHA-256 与过期时间） |
| `t_answer_item` | 逐题答卷明细（选项值、得分，用于单题正确率与选项分布） |
| `t_class_partner` | 班级分配老师（只读 / 可管理） |
| `t_class_resource` | 班级资源分配与班级考试窗口 |
| `t_repo_category` | 题库分类 / 空文件夹（`path` 唯一） |

**列：共有表里 H2 缺 15 个列，分布在 8 张表**

| 表 | H2 缺的列 | 影响 |
|---|---|---|
| `t_answer` | `items_synced`、`attempt_no`、`class_id`、`anonymous_subject_id`、`is_anonymous` | 逐题明细同步、再考次数、按班级统计、匿名答卷 |
| `t_user` | `user_type`、`ui_zoom`、`ui_theme` | 学员/教工分型、字号与主题偏好 |
| `t_repo` | `open_start_at`、`open_end_at` | 题库开放时间窗 |
| `t_project` | `category` | 考试/问卷分类 |
| `t_dept` | `dept_type` | 用户组（org）与班级（class）拆分 |
| `t_project_partner` | `access_level` | 考试三级授权（查看/编辑/授权） |
| `t_repo_partner` | `access_level` | 题库三级授权 |
| `t_dashboard` | `key` | 首页看板布局键 |

这些列不是可选装饰：`t_dept.dept_type`、`t_project.category`、`t_project_partner.access_level`、`t_repo_partner.access_level`、`t_answer.class_id` 都被查询条件或索引使用，缺一个就是 `Unknown column` → 接口 500，页面直接打不开。

**种子数据同样漂移**：H2 脚本里超级管理员的 `authority` 还是 1.x 的 `answer,answer:list,…`，MySQL 脚本已经是 `project:list,project:detail,…`。也就是说，就算表结构补齐，用 H2 初始化出来的库也没有 2.0 的权限点。

**init-mysql.sql 用了 H2 吃不下（或难以维持）的 MySQL 专用写法**：

- 表选项 `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`（29 处），列级 `CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`。
- `COMMENT '…'` 243 处、`ON UPDATE CURRENT_TIMESTAMP` 22 处、`CURRENT_TIMESTAMP` 49 处。
- 生成列：`t_account.oauth_identity_key … GENERATED ALWAYS AS ((case when … then concat(…)) …) STORED`，其中 `_utf8mb3'GOOGLE'` / `_utf8mb3'WECHAT'` 是 MySQL 专有的字符集引导符。
- `SET NAMES utf8mb4`、`SET FOREIGN_KEY_CHECKS = 0`、25 处 `DROP TABLE IF EXISTS`。

**连接层也已经只剩 MySQL**：`server/rdbms/build.gradle` 里 `com.h2database:h2` 是注释状态，只留 `mysql:mysql-connector-java`；`application-pro.yml` 用 `com.mysql.cj.jdbc.Driver`。H2 连 classpath 都不在，`init-h2.sql` 实际是历史文件。

**结论**：新装一律 MySQL 8；`init-h2.sql` 保留但标注"不再维护、不作为安装路径"。要恢复 H2 需要补 5 张表 + 15 个列、改写生成列、重做权限种子，成本远高于收益。

**MySQL 从哪来**（三端各自的答案）：

- Windows：`lib/launcher.ps1` 首次启动下载 MySQL 8 压缩包，校验 SHA256、解压裁剪到 `mysql/`，数据在 `data/mysql/`，只监听 `127.0.0.1:3307`。
- Linux：`install.sh --init-db` 用本机 MySQL 客户端建库导入，或直接用外部 MySQL。
- Docker：compose 里的 `mysql:8.0` 服务，数据卷 `db-data`。

## 决策三：Windows 只发一个包，首次启动向导按需下载

2.0.0 只发 `xuri-classroom-<version>-windows-x64.zip` 一个包，包里不带 JRE 也不带 MySQL：

```text
start.cmd  stop.cmd  status.cmd  setup.cmd  doctor.cmd  README.txt  VERSION
app/xuri-classroom-<version>.jar   app/init-mysql.sql
config/app.env.example   config/runtime.env.example
lib/launcher.ps1
```

运行期在包目录下创建 `data/mysql/`、`data/files/`、`logs/`、`run/`、`cache/`、`runtime/jre8/`、`mysql/`。首次向导（`setup.cmd` → `lib/launcher.ps1`）下载 JRE 8u512b09（Adoptium 构建，清华 TUNA 镜像、回退南大，约 38MB）与 MySQL 8（优先华为/阿里镜像的 8.0.28，约 212MB；失败回退官方 8.0.44，约 233MB），校验后解压、裁剪。包本身约 80MB（jar 约 78MB），向导完成后约 320MB。

为什么不出 full 包（历史上曾计划 lite/full 双包，本决策作废该方案）：

1. **体积与带宽**：full 包要背 200MB+ 的 MySQL 压缩包，每个版本 Release 都要多传一份、CI 时间翻倍，而真正需要离线安装的机器是少数。
2. **版本可换**：把 MySQL 二进制塞进包后，换版本只能重发整包；下载向导读 `config/runtime.env`，换 URL / 版本号即可，包本身不动。
3. **校验与重试**：下载走 SHA256 校验，失败可重试、可换镜像；包内二进制同样要校验，但更新成本更高。
4. **排障只有一条路**：单包只有一个初始化流程，不需要先问"这是 lite 还是 full"。

**离线场景**：把 JRE / MySQL 压缩包放进 `cache/`（launcher 优先用缓存），或在内网自建镜像后改 `config/runtime.env` 的 URL。

## 后果

- 发布产物：`xuri-classroom-<version>-windows-x64.zip`、`-linux-x64.tar.gz`、`-docker.tar.gz`（Docker 部署包：compose / env / README / `Dockerfile.runtime` / jar / 初始化 SQL，**不是**镜像 tar）、`xuri-classroom-<version>.jar`，外加 `SHA256SUMS` 与 `RELEASE_NOTES.md`，全部由 GitHub Actions 在 tag `v*` 时构建；同一 workflow 把镜像推到 GHCR（`ghcr.io/hermannmayer/xuri-classroom`）。
- 版本只有一个来源：根目录 `VERSION`；jar、包名、镜像 tag 都从它派生。
- NAS 生产形态不变：nginx + app + db 三容器，`SK_WEB_SPA_ENABLED` 不打开。
- 文档里凡出现"H2 初始化脚本便于本地起步"的说法，以本 ADR 为准作废。

## 不变量

- 发布包里的 jar 必须能 `java -jar xuri-classroom-<version>.jar` 独立启动并直接打开页面，不依赖外部 nginx。打包脚本 `scripts/release/package.py` 会检查 jar 里存在 `BOOT-INF/classes/static/index.html`、且 `application.yml` 的 `version` 等于 `VERSION`，否则拒绝出包。
- `init-mysql.sql` 只对空库执行（开头 25 处 `DROP TABLE IF EXISTS`）；有数据的库升级走 `scripts/nas/migrate/**`。
- Windows 包不依赖系统已装的 Java / MySQL；Linux 包允许 `--no-jre` 改用系统 Java。

## 相关

- 发版流程与产物清单：`docs/ops/版本与发版.md`（内部文档，不在公开站）
- 环境变量：`docs/reference/env.md`
- 本地开发：`docs/start/dev-setup.md`
- [ADR-0001 权限模型](ADR-0001-rbac.md)、[ADR-0002 管理员权限全集](ADR-0002-admin-catalog.md)、[ADR-0003 老师考试与题库边界](ADR-0003-teacher-exam-vs-repo.md)
