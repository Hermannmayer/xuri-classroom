# live 环境（学校正在用的那一套）

> 现状：**已上线**。201 端口是它，Lucky 反代在 200 上转发过来。
> 旧的 `surveyking` 容器（上游 v1.13.2 + H2）已 stop 未删除，回滚用。

## 结构

| 容器 | 作用 | 端口 |
|---|---|---|
| `xuri-live-db` | MySQL 8，数据在 `<data-root>/live/mysql` | 内网 3306 |
| `xuri-live-app` | Spring Boot 后端，跑 bind mount 进来的 `app.jar` | 内网 7007 |
| `xuri-live-web` | nginx，托管前端产物 + 反代 `/api` | **201**（+1201 调试） |
| `xuri-live-web-watch` | 常驻 `vite build --watch`，产物写进共享卷 | — |

## 日常操作

```bash
cd <data-root>/src/work/deploy/nas/live

# 改前端：不用做任何事，保存后看这行日志出现 "built in xxx ms" 就刷新页面
docker logs -f xuri-live-web-watch

# 改后端（增量编译 19s + 重启 10s）
bash ../../../scripts/nas/live-reload.sh

# 状态 / 日志 / 重启
docker compose ps
docker compose logs --tail=80 app
docker compose restart app
```

## 运行时镜像（验证码依赖，改 Dockerfile 后必须重建）

`xuri-runtime:25` 是 `Dockerfile.runtime` 构建的 JRE 底座。2026-11 起它必须带
`libgcc`（以及 fontconfig/freetype/ttf-dejavu）：anji-captcha 的滑块图用 Java AWT 绘制，
Alpine 的 temurin JRE 缺 `libgcc_s.so.1` 时 `/captcha/get` 会返回 500，
前端显示「服务出了点问题」。

```bash
cd <data-root>/src/work
docker build -f deploy/nas/live/Dockerfile.runtime -t xuri-runtime:25 .
cd deploy/nas/live && docker compose up -d --force-recreate app
```

只改 `app.jar`（普通后端发布）不需要重建镜像；改了 `Dockerfile.runtime` 就必须重建，
否则容器还是旧底座。

## 从旧版本（Java 8 / 2.2.0）升级到 2.2.6 的检查清单

升级脚本（`scripts/nas/Deploy-Nas.ps1`）现在会自己校验运行时镜像的 **java 大版本**，
并把 `.env` 里过期的 `XURI_RUNTIME_IMAGE` 自动改写成与 `Dockerfile.runtime` 一致的值。
但下面三件事仍然要人工确认，否则照样会炸：

1. **`.env` 里的 `XURI_RUNTIME_IMAGE` 必须是 `xuri-runtime:25`**
   旧部署生成的是 `xuri-runtime:8`，而旧的 JRE 8 镜像通常还在，于是「镜像存在」的检查会放行 →
   compose 用 JRE 8 去跑 Java 25 编出来的 jar →
   `UnsupportedClassVersionError: ... class file version 61.0` → 容器 crash-loop，**站点宕机**。
   脚本现在会自动改写（输出 `ENV_RUNTIME_IMAGE_FIXED` 就是救回来了）；看到
   `RUNTIME_IMAGE_STALE` 说明镜像被重建了。
2. **打包机 / 本地必须有 JDK 25**：本地单测是发布前唯一的编译门禁，没有它错误只会在 NAS
   `reset --hard` 之后才暴露。脚本找不到 JDK 25 会直接拒绝（要跳过必须显式 `-SkipTests`）。
3. **失败了不要原样重跑**：重跑时 `git diff` 为空，大部分步骤会被当成「无变化」跳过。
   先定位原因，然后 `Deploy-Nas.ps1 -ReloadOnly`。前端依赖的判定现在改成比对
   「容器里实际装的锁文件哈希 vs 仓库里的」，所以重跑也能自愈。

升级前还要注意：

- **先备份**：`docker exec xuri-live-backup sh /opt/backup/backup-live.sh`。
- V2.2.6 会给 `t_audit_log` 加一个索引。几十万行的大表建议低峰期升，或先手工执行
  `ALTER TABLE t_audit_log ADD KEY idx_audit_create_at (create_at), ALGORITHM=INPLACE, LOCK=NONE`。
- **回滚只回代码（`git revert`），不要只改 VERSION**：仓库里留着比 VERSION 高的迁移脚本时，
  应用启动会 fail-fast 拒绝启动（`SchemaUpgradeException: 发现版本高于当前程序的迁移脚本`）。

## 回滚到旧系统（考试出问题时）

```bash
cd <data-root>/src/work/deploy/nas/live
docker compose stop web            # 让出 201
docker start surveyking            # 旧容器：数据还是 <legacy-data-root>，一个字节没动
```

## 已知约束

- **JAVA_TOOL_OPTIONS 是 `-Xmx768m`**：这台机器只有 6.8GB 可用内存，别再往上调。
- **DB 连接串带 `useSSL=false`**：这是 JDK 8 时代定下的默认（当年 connector 跟 MySQL 8.0.46 握不上 TLS）；
  现在跑在 Java 25 + connector 9.x 上，要开加密得另配证书，别直接改成 `useSSL=true`。
- **`SK_CRYPTO_KEY` 目前没有代码在用**：全仓只有文档/脚本引用它，Java 里没有加解密实现。现在填的随机值不影响数据。
- **`init-mysql.sql` 会 DROP 表**：绝不要对着有数据的库执行。