---
title: "ADR-0004 启用虚拟线程（附压测实测：当前规模下没有收益）"
description: "钉住 2026-11 的压测数据与虚拟线程的取舍，避免后人重复论证或盲目调参"
---

# ADR-0004 虚拟线程与容量实测

## 状态

已接受（2026-11-17）。虚拟线程**默认开启**，可用环境变量 `SK_VIRTUAL_THREADS=false` 关闭；下面记录的实测结论是这次决策的依据。

## 背景

学校部署是一台 4 核 / 约 6.8GB 的飞牛 NAS（Ryzen 3 2200G），同时承载 MySQL、nginx、Vite 构建容器和本系统。真实峰值是「一个班同时开考」——约 40~60 人几乎同时打开试卷。

为了知道这套系统的实际容量、以及虚拟线程值不值得开，做了一轮对**生产**的压测（120 并发，短时，客户端内置「错误率 >5% 或 p95 >5s 自动中止」）。

## 压测结果（生产，120 并发）

| 场景 | 指标 | 未开虚拟线程 | 已开虚拟线程 |
|---|---|---|---|
| 登录 `POST /api/public/login`（CPU 密集：RSA + BCrypt） | 吞吐 / p50 / p95 | **44.5 rps** / 2547ms / 3844ms | 35.6 rps / 2371ms / 6283ms |
| 开考 `POST /api/public/projectOutline`（I/O 密集：DB + JSON） | 吞吐 / p50 / p95 | 36.4 rps / 666ms / 1446ms | 35.4 rps / **633ms** / 2376ms |
| 静态资源（856KB 入口包，nginx） | p95 | 5506ms | 5937ms |

三轮压测（20 / 120 并发）**全部 0 错误**，没有 5xx、没有超时。

## 决策与理由

1. **虚拟线程默认开启**，但要知道它在这台机器上没有带来收益：登录与开考两条链路的 p95 都略微变差（+60% / +64%），吞吐持平。原因很直接——瓶颈是 **CPU（BCrypt 每次约 100ms × 4 核）** 和 **带宽（首次加载 856KB，gzip 后 320KB）**，不是线程等待。虚拟线程解决的是"线程被 I/O 占满"，这台机器的线程从来没被占满过。
2. 保留开关（`spring.threads.virtual.enabled: ${SK_VIRTUAL_THREADS:true}`），因为：并发一旦远超 Tomcat 默认 200 线程（比如接入大量 AI 长请求、或学生端从几十涨到几百），收益才会出现；那时不用改代码，只改环境变量。
3. **真正的容量上限在 BCrypt 和首屏包大小上**，不在线程模型。要提升，优先考虑：登录限流与失败锁定已经存在（不必再省 CPU）；首屏继续拆分；开考瞬间的 40 人不需要更多线程。

## 前置条件（改异步代码时必须遵守）

代码里有 4 处 `new Thread(...)`（AI 任务 / 答卷导出 / 试卷导出 / PDF 导出）和 2 处 `@Async`，它们**依赖 `SecurityContextHolder.MODE_INHERITABLETHREADLOCAL`** 把安全上下文继承给子线程，用来写审计归属（`t_audit_log.create_by`）和任务归属。

虚拟线程同样支持 inheritable thread-local 继承，所以这条链路可用（已用 MCP 调用实测：`source=mcp` 的审计行 `create_by` 正常写入）。

**但后续改这些异步代码时，请显式传递上下文（`DelegatingSecurityContextRunnable` 或把 userId 作为参数传入），不要继续依赖继承**——一旦有人把策略改成默认的 `MODE_THREADLOCAL`，继承会静默失效，表现为审计里操作人变成空，而不是报错。

## 怎么复现这组数据

> 2026-11 起 `scripts/dev/loadtest.mjs` 已按“禁止开发验证工具”的规则移除；以下命令保留为当时的数据复现记录。

```bash
node scripts/dev/loadtest.mjs --conns 120 --seconds 25 --scenario login
node scripts/dev/loadtest.mjs --conns 120 --seconds 30 --scenario exam
node scripts/dev/loadtest.mjs --conns 120 --seconds 30 --scenario list   # 会被反爬限流打成 429，属正常
```

`list` 场景的 429 是设计如此：`/api/repo`、`/api/template`、`/api/project` 有「单用户 60 次/分钟」的反爬限流（`RateLimitFilter`）。用同一个账号高并发打这些前缀必然 429，**这不是服务器扛不住**。
