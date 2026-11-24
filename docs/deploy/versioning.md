---
title: "版本与升级"
description: "版本号规则、如何查看当前版本、升级与回滚步骤"
---

# 版本与升级

## 版本号怎么读

版本号使用语义化版本 `MAJOR.MINOR.PATCH`：

| 变化 | 含义 | 升级要注意 |
|---|---|---|
| `PATCH`（2.0.0 → 2.0.1） | 修 bug、性能优化 | 直接换程序，数据库一般不变 |
| `MINOR`（2.0.0 → 2.1.0） | 新功能，行为兼容 | 可能带数据库迁移，按发布说明先迁移再启动 |
| `MAJOR`（2.x → 3.0.0） | 有不兼容变更 | 先读发布说明与迁移指引，务必备份 |

发版由 `vX.Y.Z` 的 git tag 触发 GitHub Actions 构建，产物挂在仓库的 Releases 页面。

## 在哪里看当前版本

| 位置 | 怎么查 |
|---|---|
| 安装目录 | Windows：解压目录根下的 `VERSION`；Linux：安装包解压后根目录的 `VERSION`（与系统里 `app.jar` 同版本） |
| 安装包名 | `xuri-classroom-<版本>-windows-x64.zip`、`-linux-x64.tar.gz` |
| Docker | `docker compose images`（或 `docker compose -f docker-compose.release.yml images`）或 `.env` 里的 `VERSION` |
| 发布说明 | Releases 页面每个版本的 `RELEASE_NOTES.md` |

## 下载与校验

每个 Release 提供：

| 文件 | 用途 |
|---|---|
| `xuri-classroom-<version>-windows-x64.zip` | Windows 便携包 |
| `xuri-classroom-<version>-linux-x64.tar.gz` | Linux 安装包 |
| `xuri-classroom-<version>-docker.tar.gz` | Docker 部署包（compose + `compose-online.yaml` + `.env.example` + README + `Dockerfile.runtime` + jar + 初始化 SQL，**不是镜像 tar**） |
| `xuri-classroom-<version>.jar` | 可独立运行的 jar |
| `SHA256SUMS` | 全部文件的校验和 |
| `RELEASE_NOTES.md` | 本版本说明 |

校验（下载目录下执行）：

```powershell
# Windows
Get-FileHash .\xuri-classroom-<version>-windows-x64.zip -Algorithm SHA256
```

```bash
# Linux / macOS
sha256sum -c SHA256SUMS --ignore-missing
```

## 升级

**升级前一律先备份**（数据库 + 附件），再按各端步骤操作。

从 v2.1.0 起，三端发布包根目录都带一键升级脚本，会**自动备份、自动迁移数据库结构、失败自动回滚**：

- Windows：解压新包到旧目录（覆盖）→ 双击 `upgrade.cmd`
- Linux：`sudo bash upgrade.sh`
- Docker：`sudo bash upgrade.sh`

完整说明见[升级与迁移](upgrade.md)。只想手工换程序的话：

- Windows：[升级](windows.md#升级)
- Linux：[升级](linux.md#升级)
- Docker：[升级](docker.md#升级)

通用原则：

1. 先停服务，避免升级过程中有人正在答题。
2. 保留数据：Windows 的 `data/`、Linux 的 `/opt/xuri-classroom/files/` 与 MySQL 数据目录、Docker 的 `xuri-classroom-db-data` / `xuri-classroom-app-files` 卷。
3. 换程序 → 启动 → 打开首页与一份答卷验证。
4. 如果发布说明里有数据库迁移脚本，**先迁移再启动**，否则会出现 `Unknown column` / 表不存在导致的 500。

## 回滚

| 方式 | 做法 |
|---|---|
| Windows | 停服务 → 换回上一版本的目录（保留 `data/`）→ 启动 |
| Linux | 解压上一版本 tar.gz → `sudo bash install.sh`（保留 `app.env` 与 `SK_JWT_SECRET`）→ 重启服务 |
| Docker | 把 `.env` 的 `VERSION` 改回旧版本 → `docker compose up -d` |

注意：

- **数据库迁移通常不可逆**。回滚程序不会自动回滚表结构；表结构已被升级时，只能恢复升级前的备份。
- 已经初始化过的数据目录不要和新版本混用旧的 `init-mysql.sql`——它只用于空库建表。

## 获知新版本

**系统内提示（默认开启）**

管理员登录后，页面顶部会出现"发现新版本 vX.Y.Z"的横幅，点"打开下载页"直达对应 Release。它只提示，不下载、不升级。

| 项 | 说明 |
|---|---|
| 数据来源 | GitHub Releases API（`update.github-repo`，默认本仓库） |
| 谁能看到 | 只有带 `system:setting:update` 权限的账号（通常就是管理员），学员看不到 |
| 检查频率 | 服务端缓存 24 小时；前端 12 小时内不重复请求；同一版本点过关闭后不再出现 |
| 连不上 GitHub | 静默失败：返回 `error`、不显示横幅、不弹窗、不打扰 |
| 换 API 镜像 | `UPDATE_GITHUB_API_BASE`，需兼容 `/repos/{repo}/releases/latest` |
| 关闭检查 | `UPDATE_GITHUB_REPO=` 留空 |
| 自建清单 | `UPDATE_MANIFEST_URL`（优先于 GitHub），格式 `{"version","notes","url","publishedAt"}` |

> 检查更新只是"提示"：即使 GitHub 完全不可达，也不影响系统运行和升级（升级用发布包 + 应用内自动迁移）。

**其他方式**

- 关注仓库 Releases 页面（每个版本都有 `RELEASE_NOTES.md`）。
- 大版本（MAJOR）升级前，先在测试机装一遍再动生产。
