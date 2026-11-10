# 旭日云课堂 · 考试与学习平台

面向职业技能培训场景的一体化考评系统：**出卷 → 组卷 → 答题 → 判分 → 数据分析 → 练习巩固**，覆盖考试、问卷、题库、错题本全链路。

## 🚀 部署安装

**想直接装上用？看 [部署文档（在线）](https://hermannmayer.github.io/xuri-classroom/deploy/)，或仓库内 [docs/deploy/index.md](docs/deploy/index.md)**，三种方式任选：

| 场景 | 安装方式 | 一句话 |
|---|---|---|
| 一台 Windows 电脑 | [Windows 便携包](docs/deploy/windows.md) | 解压 → 双击 `setup.cmd`，首次向导自动下载 JRE 8 + MySQL 8 并初始化 |
| Linux 服务器 | [Linux 安装包](docs/deploy/linux.md) | `tar -xzf …` → `sudo bash install.sh --port 8080`，装成 systemd 服务 |
| 已有 Docker | [Docker](docs/deploy/docker.md) | 一行脚本，或 `docker compose -f docker-compose.release.yml up -d` |

- 默认地址 `http://<本机IP>:8080`；默认管理员 `admin / 123456`，**首次登录立即修改**（程序不强制，属运维要求）。
- 数据库固定 **MySQL 8**（2.0.0 起不再支持 H2，见 [ADR-0004](docs/decisions/ADR-0004-单jar内嵌SPA与MySQL运行时.md)）。
- 装不上、起不来、打不开：[部署常见问题](docs/deploy/faq.md)；版本与升级：[版本与升级](docs/deploy/versioning.md)。

> 开发/维护文档：[docs/index.md](docs/index.md)；模块索引、生成参考和 AI 工作流见 [docs/README.md](docs/README.md)。本地预览：`npm run docs:dev`。

界面采用蓝图/工程制图风格（0 圆角、无渐变、`--bp-*` 变量），深浅两套主题，并提供 90%～175% 六档字号缩放，照顾年长学员与投影场景。

---

## 界面预览

**考试与试卷管理** —— 一条主线看清「谁在考、考了多少、还差什么」：

![考试与试卷管理](docs/screenshots/01-project.png)

**在线答题** —— 一页一题 / 瀑布流自动切换，答题卡、标记、字号调节、倒计时与切屏限制齐备：

![在线答题](docs/screenshots/02-answer.png)

**可视化出卷** —— 拖拽题型面板，题干选项直接编辑，右侧实时手机预览：

![可视化出卷](docs/screenshots/03-designer.png)

**答卷数据与统计** —— 逐份查看、按条件筛选、导出 Excel、批量评分：

![答卷数据](docs/screenshots/04-data.png)

**发布设置** —— 显示、考试控制、回收限制、投放分享集中一页：

![发布设置](docs/screenshots/05-settings.png)

**权限配置** —— 权限点按功能分组，按角色勾选，超级管理员只读保护：

![权限配置](docs/screenshots/06-permissions.png)

---

## 功能

### 考试

- 新建考试时可从题库组卷，也可在设计器里直接出题；支持单选题、多选题、下拉、NPS、矩阵单选/多选、级联、判断、填空、多空填空、多行文本、矩阵填空、地址、评分、题组、说明、分割线共 18 种题型。
- 发布设置集中在一页：答题显示、考试控制、回收限制、投放分享、协作者，不再多层跳转。
- 考试控制项**均由服务端裁决**：开始/结束时间、最短/最长交卷时长、最大切屏次数（超限自动交卷）、闯关模式（每题限时、到点锁题）、随机题目顺序、排名与成绩单可见性。
- 「再考一次」生成的是一份**全新答卷**，历次成绩全部保留，学员可查看「最高 X 分 · 共 N 次」并逐次打开成绩单与解析。

### 问卷

- 匿名收集、需要登录、凭密码、白名单、回收上限、每 IP 限次、每台设备限次、回收截止时间。
- 答题页按题型自动选择「一页一题」或「瀑布流」；题目**逐题下发**，一次请求拿不到整卷。
- 交卷后立即出成绩单；主观题标注「待人工评分」，不假装已经判过。

### 题库

- 题库分组、题目增删改、Excel 导入导出、组卷抽题。
- 题库导出需要**导出密码**（系统设置里配置，可留空关闭），且每次导出写审计日志。
- 题库可按用户组授权，也能单独授权给个人；授权现状可查看、可撤销。

### 练习与错题

- 题库练习支持顺序/随机、继续上次进度、一页一题或瀑布流，题目**懒加载**（首屏 10 题，滚到底追加）。
- 答错自动进错题本，按「搜索期考试」维度归档；支持批量删除、重点标记、按错误次数/时间筛选、一键「继续练习」。
- 考试交卷后可「只练本场错题」。

### 数据与统计

- 答卷列表、逐份查看、按条件筛选、导出 Excel、批量评分。
- 每日收集趋势、单题正确率与选项分布，分析并入数据页，不再单独开一个入口。

### 账号与权限

- 权限模型：**权限点 → 角色 → 用户组/用户**。组只负责「成员 + 绑定角色 + 有效期」，不再承载权限串。
- 用户可同时属于多个组（主组决定数据可见范围，附加组用于权限与有效期继承）。
- 角色可自定义：内置超级管理员/老师/学员，其余角色可自由新建、改名、删改权限；超级管理员始终全权限且不可修改。
- 用户组支持**有效期**，过期后组内成员无法登录并提示具体组名与到期日。
- 权限判定统一在服务端（`@PreAuthorize` + 数据权限切面），前端按钮隐藏只是体验优化。

### 内容保护与审计

- 全站水印（姓名 + 手机号，中间四位打码，可配置）；防复制（右键/复制/剪切/拖拽，粘贴始终放行）。
- 导出需一次性令牌或导出密码，密码不出现在下载 URL；操作日志页可查谁在何时导出了哪个题库或答卷。

### 使用体验

- 蓝图/工程制图风格，深浅主题切换。
- 字号 90%～175% 六档调节，全局生效。
- 答题页支持题目标记、答题卡跳题、进度显示、自动暂存与草稿恢复。

---

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vite 5 + React 18 + TypeScript + Ant Design 5；开发时由 Vite 提供，发布包内嵌进 jar |
| 后端 | Spring Boot 2.7.7 + MyBatis-Plus 3.5 + Undertow，端口默认 **7007**（发布包由 `SERVER_PORT` 覆盖为 **8080**） |
| 数据库 | **MySQL 8**（2.0.0 起唯一支持；H2 初始化脚本已废弃，见 [ADR-0004](docs/decisions/ADR-0004-单jar内嵌SPA与MySQL运行时.md)） |
| 认证 | JWT + HttpOnly Cookie，权限串 + 数据权限切面 |
| 部署 | 单 jar 内嵌 SPA（前端不需要 nginx）；Windows 便携包 / Linux systemd / Docker compose 三种安装包 |

开发时前端通过 Vite 代理把 `/api`、`/captcha`、`/files` 转发到后端 7007；发布包把前端打进 jar，只暴露一个端口。

---

## 部署安装（简版）

> 系统要求、初始化、备份、升级、回滚与排查都在文档站：**[部署总览](docs/deploy/index.md)**。

### Windows 便携包

1. 下载 `xuri-classroom-<版本>-windows-x64.zip`（约 73MB，不含 JRE / MySQL）。
2. 解压到可写目录，例如 `D:\xuri-classroom`（不要放 `C:\Program Files`）。
3. 双击 `setup.cmd`：首次向导从国内镜像下载 JRE 8（约 38MB）与 MySQL 8（约 212MB，失败回退官方源），校验后自动初始化数据库并启动。
4. 浏览器打开 `http://<本机IP>:8080`。数据在 `data/`、日志在 `logs/`、停止用 `stop.cmd`。
5. 向导失败先跑 `doctor.cmd`，详见 [Windows 部署](docs/deploy/windows.md)。

### Linux 服务器

```bash
tar -xzf xuri-classroom-<版本>-linux-x64.tar.gz
cd xuri-classroom-<版本>-linux-x64
sudo bash install.sh --port 8080 --db-password '改成强密码'   # 没有 Java 加 --download-jre；自动建库加 --init-db
```

- 装成 systemd 服务 `xuri-classroom`；配置 `/opt/xuri-classroom/app.env`；卸载 `sudo ./uninstall.sh`。
- 连接已有 MySQL：`--db-host / --db-port / --db-name / --db-user / --db-password`。
- 详见 [Linux 部署](docs/deploy/linux.md)。

### Docker

```bash
# 方式一：一行脚本（国内可加 ghproxy 前缀，第三方代理有风险）
curl -fsSL https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/scripts/deploy/docker-one-line.sh | sudo bash

# 方式二：compose（Release 的 docker.tar.gz 部署包里就是这些文件）
cp .env.example .env      # 改 DB_PASSWORD / JWT_SECRET / APP_PORT
docker compose -f docker-compose.release.yml up -d
```

- 镜像 `ghcr.io/hermannmayer/xuri-classroom:<版本>` + `mysql:8.0`；端口 `APP_PORT`（默认 8080）；数据卷 `xuri-classroom-db-data`、`xuri-classroom-app-files`；`.env` 里 `DB_PASSWORD`、`JWT_SECRET` 必填。
- 离线：`docker pull` → `docker save` → 拷到目标机 `docker load`（或直接用部署包里的 `Dockerfile.runtime` 本地构建）。详见 [Docker 部署](docs/deploy/docker.md)。

### 从源码构建

开发环境、构建与检查命令见 [本地开发环境](docs/start/dev-setup.md)。仓库根目录的 `docker-compose.yml`（nginx + app + db 三容器）是维护者的源码构建形态，不面向最终用户。

---

## 版本与发版

- 版本从 **2.0.0** 起遵循语义化版本：`feat` 升 MINOR，`fix` / `perf` 升 PATCH，`BREAKING CHANGE` 升 MAJOR。
- 根目录 `VERSION` 是唯一版本源，`CHANGELOG.md` 由脚本生成，git tag 形如 `v2.0.0`。
- tag `v*` 触发 GitHub Actions 构建，产物挂在仓库 **Releases**：

  | 产物 | 说明 |
  |---|---|
  | `xuri-classroom-<version>-windows-x64.zip` | Windows 便携包 |
  | `xuri-classroom-<version>-linux-x64.tar.gz` | Linux 安装包 |
  | `xuri-classroom-<version>-docker.tar.gz` | Docker 部署包（compose / env / README / Dockerfile / jar / 初始化 SQL，不是镜像 tar） |
  | `xuri-classroom-<version>.jar` | 可独立运行的 jar |
  | `SHA256SUMS` / `RELEASE_NOTES.md` | 校验和与版本说明 |

- **发版在云端完成，本地不产出安装包**。维护者本地只做准备：`.\scripts\release\Release.ps1 -Bump auto`（加 `-Push` 才推 GitHub 触发构建）。
- 用户升级、回滚与版本查看：[版本与升级](docs/deploy/versioning.md)；维护者完整流程见内部文档 `docs/ops/版本与发版.md`。

---

## 数据与备份

- **数据只有两样：数据库 + 附件目录。**

  | 安装方式 | 数据库 | 附件 |
  |---|---|---|
  | Windows 便携包 | `data/mysql/` | `data/files/` |
  | Linux 安装包 | 你的 MySQL 数据目录 | `/opt/xuri-classroom/files/` |
  | Docker | 卷 `xuri-classroom-db-data` | 卷 `xuri-classroom-app-files` |

- **备份**：`mysqldump --single-transaction` 导出库 + 打包附件目录（Windows 也可直接停服务后整目录复制）。**升级前必须备份，并且定期演练一次恢复**。
- **初始化脚本只对空库执行**：`init-mysql.sql` 开头有 25 处 `DROP TABLE IF EXISTS`，对已有数据的库执行等于清库；升级只能跑迁移脚本。
- 恢复顺序：停服务 → 空库导入 `db.sql.gz` → 解开附件 → 启动 → 抽查列表与答卷。
- 各端详细命令见 [Windows](docs/deploy/windows.md#备份)、[Linux](docs/deploy/linux.md#备份)、[Docker](docs/deploy/docker.md#备份)。

## 数据与隐私

- 仓库**不包含任何业务数据**：题库存放在你的 MySQL 中，初始化脚本只建表与必要种子（角色、部门、系统参数）。
- 上传附件落在附件目录（Windows `data/files/`、Linux `/opt/xuri-classroom/files/`、Docker 卷 `xuri-classroom-app-files`）。
- 导出受密码与审计双重约束，水印可用于截图溯源。

---

## 常见问题

| 问题 | 处理 |
|---|---|
| 端口 8080 被占用 | 停掉占用进程，或改端口：Windows `config/app.env` 的 `PORT`、Linux `--port`、Docker `.env` 的 `APP_PORT` |
| Windows 首次向导下载失败 | 检查网络/代理，或把 JRE / MySQL 压缩包放进 `cache/` 离线安装；先跑 `doctor.cmd` 自检 |
| 页面白屏 / 404 | 发布包应设 `SK_WEB_SPA_ENABLED=true`；自己拼部署时不要只转发 `/api`，单端口应用要整体反代 |
| 登录报「账号或密码错误」但密码没错 | 登录密码走 RSA 加密，脚本发明文必然失败；用浏览器或先取 `/api/system` 的 `publicKey` |
| 重启后所有人掉线 | 没配 `SK_JWT_SECRET`，每次启动随机生成；在配置里固定一个 |
| 升级后接口 500（`Unknown column`） | 数据库没迁移：按发布说明先跑迁移 SQL 再启动 |
| 忘了 admin 密码 | 用 MySQL 客户端改 `t_account.auth_secret`（BCrypt），或恢复备份 |
| 能用 H2 吗 | 不能。H2 脚本缺 5 张表 + 8 张表上的 15 个列，见 [ADR-0004](docs/decisions/ADR-0004-单jar内嵌SPA与MySQL运行时.md) |
| 局域网打不开 | 防火墙没放行端口（Windows 入站规则 / Linux `ufw` 或 `firewall-cmd`） |

更多按现象排查：[部署常见问题](docs/deploy/faq.md)。

---

## 许可

本项目采用 MIT 协议，详见 [LICENSE](LICENSE)。
