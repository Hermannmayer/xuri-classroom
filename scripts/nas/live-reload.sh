#!/usr/bin/env bash
# =============================================================================
# 旭日云课堂 · live 后端「改完就生效」脚本
#
# 做的事：在一次性容器里增量编译后端 jar → 覆盖 live 用的 app.jar → 重启 app 容器。
# 不改数据库、不碰前端、不动 compose 里其他服务。
#
# 用法（在 NAS 上，仓库任意目录）：
#   bash scripts/nas/live-reload.sh
#   bash scripts/nas/live-reload.sh --build-only     # 只编译，不重启
#   bash scripts/nas/live-reload.sh --logs           # 重启后追 30 行日志
#
# 耗时：增量编译 5~15 秒 + 容器重启 5~10 秒。
# 为什么必须编译：Java 是编译型语言，.java 不编译成 .class 没有任何办法生效；
# 这和前端 .tsx 的「保存即见」不是一回事。
# =============================================================================
set -euo pipefail

SRC="${XURI_SRC:-/vol2/1000/xuri/src}"
BUILD_DIR="${XURI_BUILD_DIR:-/vol2/1000/xuri/live/build}"
COMPOSE_DIR="${XURI_COMPOSE_DIR:-${SRC}/deploy/nas/live}"
GRADLE_CACHE_VOLUME="${XURI_GRADLE_CACHE_VOLUME:-xuri-live-gradle-cache}"
GRADLE_IMAGE="${XURI_GRADLE_IMAGE:-gradle:7.6-jdk8}"
APP_SERVICE="app"
HEALTH_URL_IN_CONTAINER="http://127.0.0.1:7007/api/system"

BUILD_ONLY=0
SHOW_LOGS=0
for arg in "$@"; do
  case "${arg}" in
    --build-only) BUILD_ONLY=1 ;;
    --logs) SHOW_LOGS=1 ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "未知参数：${arg}（可用 --build-only / --logs / --help）" >&2; exit 1 ;;
  esac
done

say() { printf '[live-reload] %s\n' "$*"; }
die() { printf '\n❌ %s\n\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "找不到 docker 命令"
docker info >/dev/null 2>&1 || die "docker 守护进程不可用（当前用户没权限？试试 sudo）"

[ -d "${SRC}/server" ] || die "找不到源码：${SRC}/server
   检查 .env 或环境变量 XURI_SRC 是否指向仓库根目录。"
[ -f "${COMPOSE_DIR}/docker-compose.yml" ] || die "找不到 compose：${COMPOSE_DIR}/docker-compose.yml"

mkdir -p "${BUILD_DIR}"
say "源码：${SRC}"
say "产物：${BUILD_DIR}/app.jar"

say "开始编译（gradle 7.6 / JDK8，与生产 Dockerfile 对齐）"
docker run --rm -u 0:0 \
  -v "${SRC}/server:/src" \
  -v "${BUILD_DIR}:/out" \
  -v "${GRADLE_CACHE_VOLUME}:/cache" \
  -e GRADLE_USER_HOME=/cache \
  -w /src \
  "${GRADLE_IMAGE}" \
  sh -c '
    set -e
    gradle :api:bootJar -x test --no-daemon --console=plain
    JAR=$(ls -1 api/build/libs/*.jar | grep -v -- "-plain" | head -1)
    [ -n "$JAR" ] || { echo "没有产出 jar" >&2; exit 1; }
    cp -f "$JAR" /out/app.jar
    ls -l /out/app.jar
  ' || die "编译失败。把上面的报错贴出来；常见原因是依赖下载失败（国内网络可先跑 deploy/nas/dev 里的镜像配置）"

[ "${BUILD_ONLY}" = "1" ] && { say "只编译，不重启（--build-only）"; exit 0; }

cd "${COMPOSE_DIR}"
say "重启 ${APP_SERVICE} 容器"
docker compose restart "${APP_SERVICE}"

say "等待后端就绪（最长 120 秒）"
for i in $(seq 1 60); do
  if docker compose exec -T "${APP_SERVICE}" sh -c "wget -q -O /dev/null '${HEALTH_URL_IN_CONTAINER}' 2>/dev/null || curl -fsS -o /dev/null '${HEALTH_URL_IN_CONTAINER}'" >/dev/null 2>&1; then
    say "✅ 后端已就绪（约 $((i*2)) 秒）"
    [ "${SHOW_LOGS}" = "1" ] && docker compose logs --tail=30 "${APP_SERVICE}"
    exit 0
  fi
  sleep 2
done

printf '\n❌ 后端 120 秒内没起来。看日志：\n   cd %s && docker compose logs --tail=80 %s\n\n' "${COMPOSE_DIR}" "${APP_SERVICE}" >&2
exit 1
