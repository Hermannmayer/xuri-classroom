#!/usr/bin/env bash
# =============================================================================
# 旭日云课堂 · NAS 回滚脚本（目标态 xuri-prod: db + app + web）
#
# 用途：把生产切回某个已有镜像，默认切回 release.sh 记录的 <repo>:previous。
#       release.sh 健康检查失败时会自动调用同样的逻辑；本脚本用于人工回滚。
#
# 用法：
#   bash scripts/nas/rollback.sh --list                    # 先看有哪些镜像可回滚
#   CONFIRM=yes bash scripts/nas/rollback.sh                # 回滚到 previous（默认）
#   CONFIRM=yes bash scripts/nas/rollback.sh --to 20261101-0930
#   CONFIRM=yes bash scripts/nas/rollback.sh --image xuri-classroom:20261020-1
#   bash scripts/nas/rollback.sh --dry-run                  # 只看计划
#
# 安全约定：
#   - 只做 docker tag 之外的两件事：docker compose up -d（换回旧镜像）+ 健康检查
#   - 不执行 docker compose down / down -v / docker rm -v，不删除任何镜像或卷
#   - 未确认 CONFIRM=yes（或 --yes）时不做任何改动
#
# 退出码：
#   0  回滚成功，健康检查通过
#   1  参数/环境错误、未确认，或找不到目标镜像（未改动生产）
#   3  docker compose up -d 失败（生产状态不确定，需人工看 ps/logs）
#   4  up -d 成功但健康检查没通过（生产可能不可用，需人工处理）
#
# 首次使用请先：chmod +x scripts/nas/rollback.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

COMPOSE_DIR="$REPO_ROOT/deploy/nas/prod"
PROJECT="xuri-prod"
TO_TAG="previous"
IMAGE_OVERRIDE=""
WEB_IMAGE_OVERRIDE=""
WEB_TO_TAG=""
APP_REPO=""
WEB_REPO=""
HEALTH_URL="${XURI_HEALTH_URL:-http://127.0.0.1:201/api/system}"
HEALTH_TIMEOUT="${XURI_HEALTH_TIMEOUT:-120}"
ASSUME_CONFIRM=0
DRY_RUN=0
LIST_ONLY=0

log()  { printf '[信息] %s\n' "$*"; }
warn() { printf '[警告] %s\n' "$*" >&2; }
err()  { printf '[错误] %s\n' "$*" >&2; }
die()  { err "$1"; exit "${2:-1}"; }

usage() {
  cat <<'USAGE'
用法：bash scripts/nas/rollback.sh [选项]

  --to <tag>            回滚到 <repo>:<tag>，默认 previous（release.sh 记录的上一版）
  --image <ref>         直接指定完整镜像引用（优先于 --to）
  --repo <name>         app 镜像仓库名，默认从当前运行容器推导
  --web-to <tag>        web 一起回滚到这个 tag（默认与 --to 相同，前提是有 web 镜像）
  --web-image <ref>     直接指定 web 完整镜像引用
  --web-repo <name>     web 镜像仓库名，默认从当前 web 容器推导
  --compose-dir <目录>  compose 目录，默认 <仓库>/deploy/nas/prod
  --project <名称>      项目名，默认 xuri-prod
  --health-url <url>    健康探测地址，默认 http://127.0.0.1:201/api/system
  --health-timeout <秒> 健康轮询超时，默认 120
  --list                列出可回滚的镜像后退出（只读）
  --yes                 等价于 CONFIRM=yes
  --dry-run             只打印计划，不做任何改动
  --help                显示本帮助

退出码：0 成功 / 1 参数或目标镜像缺失（未改动）/ 3 up -d 失败 / 4 健康检查未通过
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --to) [[ $# -ge 2 ]] || die "$1 需要 tag"; TO_TAG="$2"; shift 2 ;;
    --image) [[ $# -ge 2 ]] || die "$1 需要镜像引用"; IMAGE_OVERRIDE="$2"; shift 2 ;;
    --repo) [[ $# -ge 2 ]] || die "$1 需要仓库名"; APP_REPO="$2"; shift 2 ;;
    --web-to) [[ $# -ge 2 ]] || die "$1 需要 tag"; WEB_TO_TAG="$2"; shift 2 ;;
    --web-image) [[ $# -ge 2 ]] || die "$1 需要镜像引用"; WEB_IMAGE_OVERRIDE="$2"; shift 2 ;;
    --web-repo) [[ $# -ge 2 ]] || die "$1 需要仓库名"; WEB_REPO="$2"; shift 2 ;;
    --compose-dir) [[ $# -ge 2 ]] || die "$1 需要目录"; COMPOSE_DIR="$2"; shift 2 ;;
    --project) [[ $# -ge 2 ]] || die "$1 需要项目名"; PROJECT="$2"; shift 2 ;;
    --health-url) [[ $# -ge 2 ]] || die "$1 需要 URL"; HEALTH_URL="$2"; shift 2 ;;
    --health-timeout) [[ $# -ge 2 ]] || die "$1 需要秒数"; HEALTH_TIMEOUT="$2"; shift 2 ;;
    --list) LIST_ONLY=1; shift ;;
    --yes|-y) ASSUME_CONFIRM=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) die "未知参数：$1（用 --help 查看用法）" ;;
    *) die "未知位置参数：$1" ;;
  esac
done

[[ "$HEALTH_TIMEOUT" =~ ^[0-9]+$ ]] || die "健康探测超时必须是非负秒数：$HEALTH_TIMEOUT"

image_repo() {
  local img="$1" last="${1##*/}"
  if [[ "$last" == *:* ]]; then printf '%s' "${img%:*}"; else printf '%s' "$img"; fi
}

health_once() {
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then return 0; fi
    return 1
  fi
  if command -v wget >/dev/null 2>&1; then
    if wget -q -T 5 -O /dev/null "$HEALTH_URL" >/dev/null 2>&1; then return 0; fi
    return 1
  fi
  return 0
}

wait_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT))
  if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
    warn "宿主机没有 curl/wget，跳过健康探测（请手工确认：$HEALTH_URL）"
    return 0
  fi
  log "轮询健康检查（最长 ${HEALTH_TIMEOUT}s）：$HEALTH_URL"
  while ((SECONDS < deadline)); do
    if health_once; then return 0; fi
    sleep 3
  done
  return 1
}

command -v docker >/dev/null 2>&1 || die "找不到 docker 命令"
docker info >/dev/null 2>&1 || die "docker 守护进程不可用：systemctl status docker"
docker compose version >/dev/null 2>&1 || die "需要 docker compose v2"

COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"
ENV_FILE="$COMPOSE_DIR/.env"
[[ -f "$COMPOSE_FILE" ]] || die "找不到 compose 文件：$COMPOSE_FILE（用 --compose-dir 指定）"
[[ -f "$ENV_FILE" ]] || die "找不到 $ENV_FILE（compose 变量需要它）"
DC=(docker compose -f "$COMPOSE_FILE" --project-name "$PROJECT" --env-file "$ENV_FILE")
compose_ps_q() { "${DC[@]}" ps -q "$1" 2>/dev/null || true; }

# ---- --list：只读列出候选镜像 ----
if [[ "$LIST_ONLY" -eq 1 ]]; then
  echo "本机镜像（app 仓库：${APP_REPO:-自动推导}）："
  docker image ls --format '{{.Repository}}:{{.Tag}}\t{{.CreatedSince}}\t{{.Size}}' 2>/dev/null \
    | { grep -v '<none>' || true; } | head -n 60
  exit 0
fi

# ---- 当前运行的镜像（用于推导仓库名 / 记录回滚前版本）----
CUR_APP_IMAGE=""
CUR_WEB_IMAGE=""
APP_CID="$(compose_ps_q app)"
[[ -n "$APP_CID" ]] && CUR_APP_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$APP_CID" 2>/dev/null || true)"
WEB_CID="$(compose_ps_q web)"
[[ -n "$WEB_CID" ]] && CUR_WEB_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$WEB_CID" 2>/dev/null || true)"

[[ -n "$APP_REPO" ]] || APP_REPO="$( [[ -n "$CUR_APP_IMAGE" ]] && image_repo "$CUR_APP_IMAGE" || echo xuri-classroom )"
if [[ -z "$WEB_REPO" ]]; then
  if [[ -n "$CUR_WEB_IMAGE" ]]; then
    WEB_REPO="$(image_repo "$CUR_WEB_IMAGE")"
  else
    WEB_REPO="xuri-classroom-web"
  fi
fi

TARGET_APP="${IMAGE_OVERRIDE:-${APP_REPO}:${TO_TAG}}"
TARGET_WEB=""
if [[ -n "$WEB_IMAGE_OVERRIDE" ]]; then
  TARGET_WEB="$WEB_IMAGE_OVERRIDE"
elif [[ -n "$WEB_TO_TAG" ]]; then
  TARGET_WEB="${WEB_REPO}:${WEB_TO_TAG}"
elif [[ -n "$CUR_WEB_IMAGE" ]]; then
  # 默认：web 跟着同一个 tag 回滚；若该 tag 不存在就不动 web
  if docker image inspect "${WEB_REPO}:${TO_TAG}" >/dev/null 2>&1; then
    TARGET_WEB="${WEB_REPO}:${TO_TAG}"
  else
    warn "没有 ${WEB_REPO}:${TO_TAG}，web 服务保持当前镜像不动"
  fi
fi

# ---- 目标镜像必须存在，否则只报告、不改生产 ----
if ! docker image inspect "$TARGET_APP" >/dev/null 2>&1; then
  err "目标 app 镜像不存在：$TARGET_APP"
  err "本机现有 app 镜像："
  docker image ls --format '  {{.Repository}}:{{.Tag}}\t{{.CreatedSince}}\t{{.Size}}' 2>/dev/null \
    | { grep -F "  ${APP_REPO}:" || true; } | head -n 20
  err "用法：bash scripts/nas/rollback.sh --to <上面列出的 tag>"
  exit 1
fi
if [[ -n "$TARGET_WEB" ]] && ! docker image inspect "$TARGET_WEB" >/dev/null 2>&1; then
  err "目标 web 镜像不存在：$TARGET_WEB（用 --web-image/--web-to 指定，或去掉 --web-to 让 web 不动）"
  exit 1
fi

echo
log "================ 回滚计划 ================"
log "compose 项目    : $PROJECT（$COMPOSE_DIR）"
log "当前 app 镜像   : ${CUR_APP_IMAGE:-（栈未运行）}"
log "回滚到 app 镜像 : $TARGET_APP"
if [[ -n "$TARGET_WEB" ]]; then
  log "当前 web 镜像   : ${CUR_WEB_IMAGE:-（未运行）}"
  log "回滚到 web 镜像 : $TARGET_WEB"
else
  log "web 服务        : 保持不动"
fi
log "健康探测        : $HEALTH_URL（超时 ${HEALTH_TIMEOUT}s）"
log "=========================================="
echo

if [[ "$DRY_RUN" -eq 1 ]]; then
  log "--dry-run：以下是将执行的动作，本次不会真的执行"
  log "  XURI_APP_IMAGE=$TARGET_APP ${TARGET_WEB:+XURI_WEB_IMAGE=$TARGET_WEB }docker compose -f $COMPOSE_FILE --project-name $PROJECT up -d"
  log "  轮询 $HEALTH_URL（最长 ${HEALTH_TIMEOUT}s）"
  exit 0
fi

log "即将执行（回滚会切换生产镜像）："
log "  XURI_APP_IMAGE=$TARGET_APP ${TARGET_WEB:+XURI_WEB_IMAGE=$TARGET_WEB }docker compose up -d"
log "  然后健康检查 $HEALTH_URL"
if [[ "$ASSUME_CONFIRM" -eq 1 || "${CONFIRM:-}" == "yes" ]]; then
  log "已确认（CONFIRM=yes / --yes），继续"
else
  err "未确认，回滚中止（生产没有被改动）。确认后重跑："
  err "  CONFIRM=yes bash scripts/nas/rollback.sh --to $TO_TAG"
  exit 1
fi

log "[动作] docker compose up -d（回滚）"
set +e
if [[ -n "$TARGET_WEB" ]]; then
  env XURI_APP_IMAGE="$TARGET_APP" XURI_WEB_IMAGE="$TARGET_WEB" "${DC[@]}" up -d
else
  env XURI_APP_IMAGE="$TARGET_APP" "${DC[@]}" up -d
fi
UP_RC=$?
set -e
if [[ "$UP_RC" -ne 0 ]]; then
  err "docker compose up -d 失败（退出码 $UP_RC），生产状态不确定。立刻人工检查："
  err "  docker compose -f $COMPOSE_FILE --project-name $PROJECT ps"
  err "  docker compose -f $COMPOSE_FILE --project-name $PROJECT logs --tail=100 app"
  exit 3
fi

if wait_health; then
  echo
  log "================ 回滚成功 ================"
  log "app 镜像 : $TARGET_APP"
  [[ -n "$TARGET_WEB" ]] && log "web 镜像 : $TARGET_WEB"
  log "服务状态："
  "${DC[@]}" ps || true
  log "=========================================="
  exit 0
fi

err "回滚后健康检查仍未通过：${HEALTH_TIMEOUT}s 内 $HEALTH_URL 没返回成功。生产可能不可用，立刻人工处理："
err "  docker compose -f $COMPOSE_FILE --project-name $PROJECT ps"
err "  docker compose -f $COMPOSE_FILE --project-name $PROJECT logs --tail=200 app"
err "  docker compose -f $COMPOSE_FILE --project-name $PROJECT logs --tail=100 db"
err "  curl -v $HEALTH_URL"
exit 4
