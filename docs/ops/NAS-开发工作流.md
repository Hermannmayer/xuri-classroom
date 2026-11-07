# 在 NAS 上开发这套系统：工作流

> 面向人读的版本（给 AI 看的那份在仓库根目录 `AGENTS.md`，内容一致、更简短）。
> 目标：**任何一次改动，从"改代码"到"线上生效并验证"是固定的一条命令，不靠记忆。**

---

## 1. 角色分工

| 角色 | 在哪 | 干什么 |
|---|---|---|
| 编辑区 | Windows 上的这个仓库 | 改代码、跑 git、发起发布 |
| 同步中枢 | NAS `/vol2/1000/xuri/src/repo.git`（裸仓库） | 只是中转，不检出工作区 |
| 运行区 | NAS `/vol2/1000/xuri/src/work` | **线上跑的就是这份**，由脚本 `reset --hard` 对齐 |
| 数据区 | NAS `/vol2/1000/xuri/live/` | MySQL 数据、附件、编译产物 app.jar |

```
┌──────────── Windows ────────────┐        ┌─────────────────── NAS ───────────────────┐
│  仓库（唯一编辑源）              │        │  裸仓库 repo.git                            │
│      │ git push nas main       │───────▶│      │ git fetch + reset --hard            │
│      │                          │        │      ▼                                      │
│  改代码 / 提交                    │        │  运行副本 work/  ──▶ 容器 xuri-live-*        │
│                                  │        │      │                    │                 │
│  .\scripts\nas\Deploy-Nas.ps1    │───────▶│      ├ client/** → web-watch（~9s）          │
│      └ 触发、等待、验证、报告       │        │      ├ server/** → live-reload（19s+10s）    │
└──────────────────────────────────┘        │      └ live/**   → compose up -d            │
                                            └─────────────────────────────────────────────┘
```

**为什么不让 NAS 上也编辑？** 两个可写副本一定会分叉。分叉之后"线上到底是什么代码"就没人说得清。
所以定死：**Windows 编辑 → NAS 只运行**。

---

## 2. 一次改动的完整流程

```powershell
# 1) 改代码（VS Code 里改）
# 2) 发布 + 验证，一条命令
.\scripts\nas\Deploy-Nas.ps1 -Message "fix: 修了导出的表头"
```

脚本内部的 6 步（任何一步失败立刻停，不会带病上线）：

| 步骤 | 做什么 | 失败时 |
|---|---|---|
| 0 | 检查仓库、分支 main、远端 nas | 提示缺哪一项 |
| 1 | 有改动就必须给 `-Message`，然后本地 commit | 提示加 `-Message` |
| 2 | `git push nas main` | 报 push 错误 |
| 3 | NAS 上 `fetch` + `reset --hard origin/main`，算出改了什么文件 | 报远端输出 |
| 4 | 按文件类型重启对应服务（见下表） | 报远端输出 |
| 5 | 等前端构建 / 后端健康 | 超时告警并给出日志命令 |
| 6 | 冒烟测试 | **直接判失败**，提示先别继续 |

### 改动类型 → 生效方式

| 改了什么 | 谁负责生效 | 实测耗时 |
|---|---|---|
| `client/**` 普通文件 | `xuri-live-web-watch` 常驻 `vite build --watch` | ~9 秒 |
| `client/package*.json` | web-watch 比对锁文件哈希后 `npm ci` | 1~3 分钟 |
| `server/**` | `scripts/nas/live-reload.sh`：增量编译 → 覆盖 `app.jar` → 重启 `app` | 16~19 秒 + 10 秒 |
| `deploy/nas/live/**` | `docker compose up -d` | 秒级 |
| 只改文档/脚本 | 无需重启 | — |

> **Java 不存在"保存即见"**：`.java` 必须编译成 `.class`。16 秒已经是这台 4 核机器的增量编译水平，
> 想更快只能减少后端改动面。前端之所以快，是因为 Vite 按需转换 + watch 只重建变化的 chunk。

---

## 3. 验证：冒烟测试

```powershell
python scripts/nas/smoke-test.py                              # 内网
python scripts/nas/smoke-test.py --base https://ks.1618030.xyz:200  # 连公网入口一起
```

五项检查（全过才算数）：

1. 首页 200 且 `<title>` 是「考试与学习平台」
2. 首页引用的 `/assets/index-*.js` 能取到（证明构建产物已就位）
3. `/api/system` 200，站点名含「旭日」
4. `admin/123456` 能登录 —— **走的是 RSA 加密**，和浏览器完全同一条路径
5. 能列出试卷，且第一份能打开（证明迁移过来的 JSON 没坏）

第 4、5 项是关键：它们覆盖了"后端能起"之外的真实业务路径，之前 `t_project_partner.is_deleted`
那个 bug 就是被第 5 项抓出来的。

---

## 4. 常见故障对照表

| 现象 | 多半是 | 怎么查 |
|---|---|---|
| 前端页面还是旧的 | web-watch 没构建完 / 构建失败 | `docker logs -f xuri-live-web-watch` |
| 后端 500 | 看日志里的 `Caused by` | `docker logs --tail=100 xuri-live-app` |
| 500 且提到 SQL 列不存在 | schema 漂移（开发库手工改过、`init-mysql.sql` 没同步） | 对比实体类与 `init-mysql.sql` |
| app 起不来，`SSLHandshakeException` | 连接串丢了 `useSSL=false` | 看 compose 的 `SPRING_DATASOURCE_URL` |
| db 容器反复重启 | 数据目录属主不是 999 | `sudo chown -R 999:999 /vol2/1000/xuri/live/mysql` |
| 拉镜像超时 | Docker Hub 不通 | `docker pull docker.m.daocloud.io/library/<img>` 再 `docker tag` |
| 冒烟第 4 项失败 | 密码不是 123456，或账号被禁用 | 用浏览器登一次确认 |
| 构建脚本报 `$'\r'` | 脚本被 Windows 改成 CRLF | `sed -i 's/\r$//' 脚本`，并给 `.gitattributes` 补 `*.sh text eol=lf` |

---

## 5. 回滚

```bash
# 只回滚代码（最常用）
git revert <坏提交>
.\scripts\nas\Deploy-Nas.ps1

# 整体退回旧系统（迁移前的上游版本，数据原封不动）
cd /vol2/1000/xuri/src/work/deploy/nas/live
docker compose stop web      # 让出 201
docker start surveyking
```

旧容器 `surveyking` 和它的 `/vol2/1000/surveyking/` 数据是最后的底牌，**不要删**。

---

## 6. 设计取舍（为什么不是别的做法）

| 选择 | 理由 | 被否掉的方案 |
|---|---|---|
| git 推送 + reset，而非 rsync | 有提交历史、可 revert、天然幂等；rsync 会把"改了什么"糊掉 | rsync / scp 覆盖 |
| 运行副本 `reset --hard`，而非 `pull` | 保证运行副本永远等于裸仓库，不会被 NAS 上的手改卡住 | `git pull`（会因本地改动失败） |
| 远端脚本走 scp 落盘，而非 `ssh 'bash -s'` 管道 | Windows 的 PowerShell 管道给原生进程会**自动追加 `\r\n`**，远端最后一行变成 `\r` 命令（实测踩了 5 次） | here-string / base64 内联 / `-replace` CR |
| 前端用 watch 构建而非 dev server | dev server 无压缩无缓存、出错白屏；watch 产物是生产形态，速度几乎一样 | `vite dev` 直接对外 |
| 后端重启而非热替换 | 没有引入 devtools/JRebel，避免为省 10 秒引入额外依赖 | spring-boot-devtools |
| compose 内网关 SSL | JDK8 connector 与 MySQL 8.0.46 TLS 握手失败，内网无中间人风险 | 升级 MySQL / 换 connector / 配证书 |

---

## 7. 变更记录

| 日期 | 变更 |
|---|---|
| 2026-11-07 | 从上游官方镜像（H2）整体迁移到定制分支（MySQL），上线 `xuri-live`；201 端口；Lucky 200 反代 |
| 2026-11-07 | 固化发布流程：`Deploy-Nas.ps1` + `smoke-test.py` + 本文件 + `AGENTS.md` |
