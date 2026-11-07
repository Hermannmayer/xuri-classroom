# live 环境（学校正在用的那一套）

> 现状：**已上线**。201 端口是它，Lucky 反代在 200 上转发过来。
> 旧的 `surveyking` 容器（上游 v1.13.2 + H2）已 stop 未删除，回滚用。

## 结构

| 容器 | 作用 | 端口 |
|---|---|---|
| `xuri-live-db` | MySQL 8，数据在 `/vol2/1000/xuri/live/mysql` | 内网 3306 |
| `xuri-live-app` | Spring Boot 后端，跑 bind mount 进来的 `app.jar` | 内网 7007 |
| `xuri-live-web` | nginx，托管前端产物 + 反代 `/api` | **201**（+1201 调试） |
| `xuri-live-web-watch` | 常驻 `vite build --watch`，产物写进共享卷 | — |

## 日常操作

```bash
cd /vol2/1000/xuri/src/work/deploy/nas/live

# 改前端：不用做任何事，保存后看这行日志出现 "built in xxx ms" 就刷新页面
docker logs -f xuri-live-web-watch

# 改后端（增量编译 19s + 重启 10s）
bash ../../../scripts/nas/live-reload.sh

# 状态 / 日志 / 重启
docker compose ps
docker compose logs --tail=80 app
docker compose restart app
```

## 回滚到旧系统（考试出问题时）

```bash
cd /vol2/1000/xuri/src/work/deploy/nas/live
docker compose stop web            # 让出 201
docker start surveyking            # 旧容器：数据还是 /vol2/1000/surveyking，一个字节没动
```

## 已知约束

- **JAVA_TOOL_OPTIONS 是 `-Xmx768m`**：这台机器只有 6.8GB 可用内存，别再往上调。
- **DB 连接串带 `useSSL=false`**：JDK8 的 connector 跟 MySQL 8.0.46 握不上 TLS，见 compose 注释。
- **`SK_CRYPTO_KEY` 目前没有代码在用**：全仓只有文档/脚本引用它，Java 里没有加解密实现。现在填的随机值不影响数据。
- **`init-mysql.sql` 会 DROP 表**：绝不要对着有数据的库执行。
