# syntax=docker/dockerfile:1
# =============================================================================
# 旭日云课堂 · 飞牛 NAS「开发环境」镜像（devbox）
#
# 设计原则：NAS 宿主机上什么都不装。JDK / Node / Gradle 全在这个镜像里，
# 这样系统盘升级、重装飞牛都不会破坏开发环境，也绝不会污染生产考试系统。
#
# 版本对齐（与仓库根目录 Dockerfile 保持一致，别随手升级）：
#   JDK    8    ← 生产 Dockerfile 用 eclipse-temurin:8-jre-alpine（SQL 与字节码都是 8）
#   Node   20   ← 生产 Dockerfile 前端阶段用 node:20-alpine
#   Gradle 7.6  ← 生产 Dockerfile 后端阶段用 gradle:7.6-jdk8
#
# 注意：仓库自带的 gradle wrapper 是 7.1（server/gradle/wrapper/gradle-wrapper.properties），
# 与这里的 7.6 有一个小版本差。用 `./gradlew` 会去下载 7.1，用 `gradle` 则直接用镜像里的 7.6。
# 想和 CI / 生产完全一致就用 `gradle`；两种都能构建，README「与仓库 Dockerfile 的差异」有说明。
#
# 构建（一般由 bootstrap.sh 或 docker compose 触发，不需要手动跑）：
#   docker compose -f deploy/nas/dev/docker-compose.yml build devbox
# =============================================================================

# -----------------------------------------------------------------------------
# 阶段 1：只为了拿 Node 20 官方二进制
#
# 为什么走多阶段 COPY 而不是 apt install nodejs：
#   - Ubuntu 仓库里的 nodejs 版本太旧（16/18），与生产的 20 不一致；
#   - 用 NodeSource 之类要多配一个外部源，失败点更多。
# 为什么选 bookworm-slim 而不是 alpine（生产前端阶段用的是 node:20-alpine）：
#   运行环境是 Debian/Ubuntu（glibc），把 musl 的 node 拷进 glibc 环境会踩动态库的坑；
#   bookworm-slim 与目标环境同为 glibc，只拷 node/npm/npx 三个入口，干净。
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS node20

# -----------------------------------------------------------------------------
# 阶段 2：真正的 devbox
# jammy = Ubuntu 22.04，apt 生态最省事；VS Code 的 Remote server 也优先照顾 glibc 环境。
# -----------------------------------------------------------------------------
FROM eclipse-temurin:8-jdk-jammy

# TZ 先设好，后面 tzdata 装完直接按它落地，避免容器里时间差 8 小时导致日志/考试截止时间错乱
ENV TZ=Asia/Shanghai \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    DEBIAN_FRONTEND=noninteractive

# -----------------------------------------------------------------------------
# 基础工具链
#   git          —— 拉代码、看 diff
#   curl         —— 健康检查 / 下载 Gradle / 调后端接口
#   unzip        —— 解 Gradle 发行包
#   ca-certificates —— https 必需（不加 curl 会报证书错误）
#   procps       —— ps/pgrep/free，排障用（8GB 内存的机器经常要看内存）
#   tzdata       —— Asia/Shanghai
#   bash         —— 基础镜像自带，这里显式写上，保证脚本 `#!/usr/bin/env bash` 一定有
#   libstdc++6   —— 从 node 官方镜像拷进来的二进制依赖它
# -----------------------------------------------------------------------------
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        git \
        libstdc++6 \
        procps \
        tzdata \
        unzip; \
    ln -snf "/usr/share/zoneinfo/${TZ}" /etc/localtime; \
    echo "${TZ}" > /etc/timezone; \
    rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Node 20（从阶段 1 拷过来）
# npm / npx 用软链指到 /usr/local/lib/node_modules 里的 cli.js：
# 这两个脚本首行是 `#!/usr/bin/env node`，所以软链可用，不需要再拷整个 bin 目录。
# -----------------------------------------------------------------------------
COPY --from=node20 /usr/local/bin/node /usr/local/bin/node
COPY --from=node20 /usr/local/lib/node_modules/ /usr/local/lib/node_modules/

RUN set -eux; \
    ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm; \
    ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx; \
    node --version; \
    npm --version

# -----------------------------------------------------------------------------
# Gradle 7.6
#
# 校验和来自官方分发地址 gradle-7.6-bin.zip.sha256（2026-11 核对）：
#   https://services.gradle.org/distributions/gradle-7.6-bin.zip.sha256
# 校验是防「网络中间人塞了个坏包 / 半截包」导致后面构建出现莫名其妙的
# "Could not resolve" 报错 —— 一次 sha256 只要 1 秒。
#
# ┌─ 国内下载太慢怎么办 ────────────────────────────────────────────────┐
# │ 换成腾讯云 / 阿里云的 Gradle 发行包镜像（字节与官方一致，校验和不变）： │
# │   docker compose build --build-arg GRADLE_URL=\                        │
# │     https://mirrors.cloud.tencent.com/gradle/gradle-7.6-bin.zip devbox │
# │ 如果镜像站自己重新打包过（校验和对不上），显式清空校验跳过：            │
# │   --build-arg GRADLE_SHA256=                                          │
# │ 但请优先找一个字节一致的镜像，别养成关闭校验的习惯。                    │
# └──────────────────────────────────────────────────────────────────────┘
# -----------------------------------------------------------------------------
ARG GRADLE_VERSION=7.6
ARG GRADLE_SHA256=7ba68c54029790ab444b39d7e293d3236b2632631fb5f2e012bb28b4ff669e4b
ARG GRADLE_URL=https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip

RUN set -eux; \
    curl -fsSL --retry 3 --retry-delay 2 -o /tmp/gradle.zip "${GRADLE_URL}"; \
    if [ -n "${GRADLE_SHA256}" ]; then \
        echo "${GRADLE_SHA256}  /tmp/gradle.zip" | sha256sum -c -; \
    else \
        echo "⚠️  已跳过 Gradle 发行包 sha256 校验（构建参数 GRADLE_SHA256 为空）"; \
    fi; \
    unzip -q /tmp/gradle.zip -d /opt; \
    mv "/opt/gradle-${GRADLE_VERSION}" /opt/gradle; \
    ln -sf /opt/gradle/bin/gradle /usr/local/bin/gradle; \
    rm -f /tmp/gradle.zip; \
    gradle --version

# -----------------------------------------------------------------------------
# 非 root 用户 dev（uid/gid 固定 1000，与飞牛 NAS 的登录用户对齐）
#
# 为什么必须是 1000：源码目录是以 bind mount 方式从宿主机挂进 /workspace 的，
# 宿主机上这些文件属主是 uid=1000。容器里如果跑 root，容器里 git/npm 新建的文件
# 到了宿主机就变成 root 所有，之后在飞牛「文件管理」或 SSH 里都改不动，非常难受。
#
# getent 判断是为了幂等：万一基础镜像将来自带 uid 1000 的用户，也不会让 build 失败。
# -----------------------------------------------------------------------------
RUN set -eux; \
    if ! getent group 1000 >/dev/null; then groupadd --gid 1000 dev; fi; \
    if ! getent passwd 1000 >/dev/null; then \
        useradd --uid 1000 --gid 1000 --create-home --home-dir /home/dev --shell /bin/bash dev; \
    fi; \
    mkdir -p /workspace/client/node_modules /home/dev/.gradle; \
    chown -R 1000:1000 /workspace /home/dev

# 以 bind mount 挂进来的源码，git 目录属主可能和容器内用户不完全一致，
# 不放开这一条会满屏 "detected dubious ownership"；容器是隔离的开发环境，可以放开。
RUN git config --system --add safe.directory '*'

# 工作目录 = 源码挂载点
WORKDIR /workspace

USER dev

# 入口用 CMD 而不是 ENTRYPOINT：这样既能 `docker compose up -d` 保持常驻等你 attach，
# 也能 `docker compose run --rm devbox bash` 一次性进去干活（CMD 可被命令行覆盖）。
# 容器里不跑任何业务进程 —— VS Code「Attach to Running Container」只需要一个活着的容器。
CMD ["sleep", "infinity"]
