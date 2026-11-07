#!/usr/bin/env bash
# =============================================================================
# 旭日云课堂 · live 环境一次性引导（在飞牛 NAS 上执行）
#
# 做完这四件事：
#   1. 建数据目录（/vol2/1000/xuri/live/{mysql,files,build}）
#   2. 生成 .env（不覆盖已存在的）
#   3. 构建后端运行时镜像 xuri-runtime:8（只有 curl+JRE，约 1 分钟）
#   4. 编译一次后端 jar，然后 docker compose up -d
#
# 幂等：重复执行不会覆盖 .env，也不会丢数据。
#
# 用法：
#   cd <仓库>/deploy/nas/live
#   bash ../../../scripts/nas/live-bootstrap.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd -P)"

COMPOSE_DIR="${XURI_COMPOSE_DIR:-${REPO_ROOT}/deploy/nas/live}"
SRC="${XURI_SRC:-${REPO_ROOT}}"
DATA_DIR="${XURI_DATA_DIR:-/vol2/1000/xuri/live}"
BUILD_DIR="${XURI_BUILD_DIR:-${DATA_DIR}/build}"
RUNTIME_IMAGE="${XURI_RUNTIME_IMAGE:-xuri-runtime:8}"
APP_PORT="${APP_PORT:-200}"
APP_PORT_ALT="${APP_PORT_ALT:-201}"

say() { printf '\n──── %s ────\n' "$*"; }
die() { printf '\n❌ %s\n\n' "$*" >&2; exit 1; }

say "0/5 自检"
command -v docker >/dev/null 2>&1 || die "找不到 docker 命令"
docker info >/dev/null 2>&1 || die "docker 守护进程不可用（当前用户不在 docker 组？用 sudo 重跑）"
docker compose version >/dev/null 2>&1 || die "需要 Docker Compose v2（命令是 'docker compose'）"
[ -f "${COMPOSE_DIR}/docker-compose.yml" ] || die "找不到 ${COMPOSE_DIR}/docker-compose.yml"
[ -d "${SRC}/client" ] && [ -d "${SRC}/server" ] || die "XURI_SRC=${SRC} 不像仓库根目录（缺 client/ 或 server/）"
echo "  · 仓库：${SRC}"
echo "  · 数据：${DATA_DIR}"

say "1/5 准备目录与配置"
mkdir -p "${DATA_DIR}/mysql" "${DATA_DIR}/files" "${BUILD_DIR}"
if [ ! -f "${COMPOSE_DIR}/.env" ]; then
  cp "${COMPOSE_DIR}/.env.example" "${COMPOSE_DIR}/.env"
  chmod 600 "${COMPOSE_DIR}/.env"
  echo "  · 已从 .env.example 生成 ${COMPOSE_DIR}/.env"
  echo "  · ⚠️ 打开它，至少填 DB_PASSWORD 和 SK_CRYPTO_KEY，然后重跑本脚本"
else
  echo "  · 已存在 .env，沿用"
fi

# .env 里两个必填项还是占位符就停下，别让容器带着占位密码起来
if grep -q '^DB_PASSWORD=change-me' "${COMPOSE_DIR}/.env" 2>/dev/null \
   || grep -q '^SK_CRYPTO_KEY=$' "${COMPOSE_DIR}/.env" 2>/dev/null \
   || ! grep -q '^SK_CRYPTO_KEY=' "${COMPOSE_DIR}/.env" 2>/dev/null; then
  die "请先编辑 ${COMPOSE_DIR}/.env：
     DB_PASSWORD=<强密码>
     SK_CRYPTO_KEY=<openssl rand -base64 32 的输出>
     JWT_SECRET=<openssl rand -base64 48 的输出>
   改完重跑本脚本。"
fi

say "2/5 构建后端运行时镜像 ${RUNTIME_IMAGE}"
if docker image inspect "${RUNTIME_IMAGE}" >/dev/null 2>&1; then
  echo "  · 镜像已存在，跳过"
else
  docker build -f "${COMPOSE_DIR}/Dockerfile.runtime" -t "${RUNTIME_IMAGE}" "${COMPOSE_DIR}"
fi

say "3/5 首次编译后端 jar（约 1~3 分钟，取决于依赖缓存）"
export XURI_SRC="${SRC}" XURI_BUILD_DIR="${BUILD_DIR}" XURI_COMPOSE_DIR="${COMPOSE_DIR}"
bash "${SCRIPT_DIR}/live-reload.sh" --build-only

say "4/5 启动 live 栈"
cd "${COMPOSE_DIR}"
docker compose up -d

say "5/5 等待就绪"
for i in $(seq 1 90); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${APP_PORT_ALT}/api/system" 2>/dev/null \
     || curl -fsS -o /dev/null "http://127.0.0.1:${APP_PORT}/api/system" 2>/dev/null; then
    echo "  · 已就绪（约 $((i*2)) 秒）"
    break
  fi
  sleep 2
done

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
cat <<EOF

================================================================================
✅ live 环境已启动
================================================================================
  访问：http://${LAN_IP:-<NAS_IP>}:${APP_PORT}   （同时也在 ${APP_PORT_ALT} 上监听）
  容器：xuri-live-db / xuri-live-app / xuri-live-web / xuri-live-web-watch

  改前端：改完保存 → web-watch 1~2 秒构建完 → 刷新页面即见
           看构建日志：docker compose logs -f web-watch
  改后端：bash ${SCRIPT_DIR}/live-reload.sh
  看状态：cd ${COMPOSE_DIR} && docker compose ps
  看日志：cd ${COMPOSE_DIR} && docker compose logs --tail=80 app

⚠️ 还没导数据：现在是空库。迁移步骤见 docs/ops/NAS-开发与发布方案.md
================================================================================
EOF
