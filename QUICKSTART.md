# 快速开始（一屏看完）

> 完整文档在 **<https://hermannmayer.github.io/xuri-classroom/>**。这一页只回答「我现在要怎么跑起来」。

## 1. 选一种装法

| 你手上有什么 | 用哪个包 | 一句话 |
|---|---|---|
| 一台 Windows 电脑（不折腾服务器） | `xuri-classroom-<版本>-windows-x64.zip` | 解压 → 双击 `setup.cmd` → 跟着向导走（首次会下载 JRE 25 + MySQL 8） |
| 一台 Linux 服务器 | `xuri-classroom-<版本>-linux-x64.tar.gz` | `tar -xzf …` → `sudo bash install.sh --port 8080`（装成 systemd 服务） |
| 已有 Docker | `xuri-classroom-<版本>-docker.tar.gz` | `docker compose -f docker-compose.release.yml up -d` |
| 只是想看看代码怎么跑 | 本仓库 | 见下面「本地开发」 |

**运行环境**：需要 **Java 25 运行时**（jar 的字节码目标就是 25，Java 17/21 起不来）。

- Windows 便携包 / Linux 安装包的 `setup`/`install` 都能**自动下载** JRE 25（国内镜像 + SHA256 校验）；
- Docker 镜像**自带** JRE 25，宿主机不用装 Java。

装完打开 `http://<本机IP>:8080`，默认管理员 `admin` / `123456`（首次登录后请立刻改）。

## 2. 升级

| 装法 | 怎么升 |
|---|---|
| Windows 便携包 | 下载新包 → 解压覆盖 → `upgrade.cmd`（会先备份数据库） |
| Linux 安装包 | 下载新包 → `sudo bash upgrade.sh` |
| Docker | 拉新镜像 → `docker compose up -d`（数据库迁移在启动时自动执行） |

**升级前请先备份**：数据库 + 附件。三种装法的备份命令见各部署页的「备份」小节。

## 3. 本地开发（改代码）

前置：**JDK 25**（编译/单测）、**Node ≥ 20.19**（Vite 8 要求）、**Python 3.8+**（发版与结构校验脚本）。

```bash
# 后端（默认 7007，需要本地 MySQL 8）
cd server && ./gradlew :api:bootRun

# 前端（Vite dev server，/api 代理到 7007）
cd client && npm install && npm run dev
```

改完自检：`cd client && npm run check && npm run build`、`cd server && ./gradlew :shared:test :api:test`、`npm run docs:check`。

## 4. 卡住了看哪里

| 问题 | 看这里 |
|---|---|
| 装不上、起不来、端口冲突 | [部署常见问题](https://hermannmayer.github.io/xuri-classroom/deploy/faq) |
| 版本号 / 升级兼容性 | [版本与升级](https://hermannmayer.github.io/xuri-classroom/deploy/versioning) |
| 想知道某块代码在哪 | [模块地图](https://hermannmayer.github.io/xuri-classroom/modules/project) |
| AI 出题/改题/批改用不了 | [AI 与智能体](https://hermannmayer.github.io/xuri-classroom/modules/ai)（先配模型服务） |
| 权限不对、403 | [权限与角色](https://hermannmayer.github.io/xuri-classroom/modules/permissions) |
