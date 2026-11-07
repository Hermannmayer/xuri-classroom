#!/usr/bin/env bash
# =============================================================================
# 旭日云课堂 · NAS 发布脚本（目标态 xuri-prod：db(MySQL) + app + web）
#
# 这个脚本只对「定制分支的 xuri-prod compose 栈」发版，不碰当前手工 docker run 的
# surveyking(H2) 容器——那是切换前的旧生产，切换步骤见 deploy/nas/prod/README.md。
#
# 流程（每一步都会中文打印）：
#   0. 前置校验：docker / docker compose v2 / compose 文件 / .env / 目标镜像存在
#   1. preflight.sh 体检（只读）：退出码 0 或 2 继续，1 立即中止（还没动生产）
#   2. 打印完整动作表 + 要求 CONFIRM=yes（--yes 等价）
#   3. 备份：自动选工具——
#        · 目标栈已在跑（有 compose app 容器）→ 走 scripts/deploy/backup.sh（容器内 mysqldump）
#        · 目标栈没在跑（首次切换前）      → 走 scripts/nas/backup.sh（H2 + files 停机拷贝）
#   4. 记录当前版本：docker tag <当前 app 镜像> <repo>:previous（web 同理）
#   5. docker compose up -d（带 XURI_APP_IMAGE / XURI_WEB_IMAGE 指向新镜像）
#   6. 轮询健康检查（默认最长 120s）
#   7. 失败 → 自动回滚到 <repo>:previous，打印 app/web 日志尾部，再轮询一次
#
# 用法：
#   # 发一个新构建的镜像（镜像要先能 docker image inspect 到）
#   CONFIRM=yes bash scripts/nas/release.sh --image xuri-classroom:20261107-1
#   # 只给仓库名时用 --tag 补时间戳（默认就是当前时间）
#   CONFIRM=yes bash scripts/nas/release.sh --image xuri-classroom --web-image xuri-classroom-web
#   # 先看计划不落地
#   bash scripts/nas/release.sh --image xuri-classroom:test --dry-run
#
# 安全约定：
#   - 第 2 步之前没有任何写操作；未确认时直接退出（不动生产）
#   - 不会执行 docker compose down / down -v / docker rm -v 这类会对数据下手的命令
#   - 失败自动回滚，并给出下一步人工指令
#
# 退出码：
#   0  发布成功（新版本健康检查通过）
#   1  参数/环境/前置检查失败，或未确认 —— 生产未被改动
#   2  备份失败 —— 未切镜像
#   3  记录 previous 失败（docker tag）—— 未切镜像
#   4  新版本不健康，已自动回滚到 previous（生产在旧版本上）
#   5  新版本不健康且回滚也失败/回滚后仍不健康 —— 立即人工处理
#
# 首次使用请先：chmod +x scripts/nas/release.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

COMPOSE_DIR="$REPO_ROOT/deploy/nas/prod"
PROJECT="xuri-prod"
IMAGE_INPUT=""
TAG="$(date +%Y%m%d-%H%M%S)"
APP_REPO=""
WEB_IMAGE_INPUT=""
WEB_REPO=""
HEALTH_URL="${XURI_HEALTH_URL:-http://127.0.0.1:201/api/system}"
HEALTH_TIMEOUT="${XURI_HEALTH_TIMEOUT:-120}"
TARGET_PORT="${XURI_APP_PORT:-201}"
BACKUP_DIR="${BACKUP_DIR:-/vol2/1000/xuri/backup}"
BACKUP_MODE="auto"        # auto | compose | legacy | none
BACKUP_RETENTION=14
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"
PREFLIGHT_SCRIPT="$SCRIPT_DIR/preflight.sh"
COMPOSE_BACKUP_SCRIPT="$REPO_ROOT/scripts/deploy/backup.sh"
LEGACY_DATA_DIR="${XURI_LEGACY_DATA_DIR:-}"
ASSUME_CONFIRM=0
DRY_RUN=0

log()  { printf '[信息] %s\n' "$*"; }
warn() { printf '[警告] %s\n' "$*" >&2; }
err()  { printf '[错误] %s\n' "$*" >&2; }
die()  { err "$1"; exit "${2:-1}"; }

usage() {
  cat <<'USAGE'
用法：bash scripts/nas/release.sh --image <镜像> [选项]

  --image <ref>          **必填**，新版本 app 镜像：repo:tag 或纯 repo（纯 repo 时用 --tag 补）
  --web-image <ref>      新版本 web 镜像（不填则沿用 compose 里的默认/当前镜像）
  --tag <tag>            发布标签，默认当前时间 YYYYmmdd-HHMMSS
  --repo <name>          app 镜像仓库名（用于 previous 标记），默认从 --image 推导
  --web-repo <name>      web 镜像仓库名，默认从 --web-image 推导
  --compose-dir <目录>   目标态 compose 目录，默认 <仓库>/deploy/nas/prod
  --project <名称>       compose 项目名，默认 xuri-prod
  --health-url <url>     健康探测地址，默认 http://127.0.0.1:201/api/system
  --health-timeout <秒>  健康轮询超时，默认 120
  --port <端口>          传给 preflight 的目标端口，默认 201
  --backup-mode <mode>   auto（默认，按目标栈是否在跑自动选）| compose | legacy | none
  --backup-dir <目录>    备份输出目录，默认 ${BACKUP_DIR:-/vol2/1000/xuri/backup}
  --backup-retention <n> 备份保留份数，默认 14
  --data-dir <目录>      legacy 备份/体检用的旧生产数据目录，默认 /vol2/1000/surveyking
  --yes                  等价于 CONFIRM=yes
  --dry-run              只打印计划，不做任何改动
  --help                 显示本帮助

退出码：0 成功 / 1 前置检查或确认失败（未改动）/ 2 备份失败 / 3 previous 标记失败 /
        4 已回滚到旧版本 / 5 回滚失败或回滚后仍不健康（人工介入）
USAGE
}

# ---------------------------------------------------------------- 参数解析
while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) [[ $# -ge 2 ]] || die "$1 需要镜像名"; IMAGE_INPUT="$2"; shift 2 ;;
    --web-image) [[ $# -ge 2 ]] || die "$1 需要镜像名"; WEB_IMAGE_INPUT="$2"; shift 2 ;;
    --tag) [[ $# -ge 2 ]] || die "$1 需要标签"; TAG="$2"; shift 2 ;;
    --repo) [[ $# -ge 2 ]] || die "$1 需要仓库名"; APP_REPO="$2"; shift 2 ;;
    --web-repo) [[ $# -ge 2 ]] || die "$1 需要仓库名"; WEB_REPO="$2"; shift 2 ;;
    --compose-dir) [[ $# -ge 2 ]] || die "$1 需要目录"; COMPOSE_DIR="$2"; shift 2 ;;
    --project) [[ $# -ge 2 ]] || die "$1 需要项目名"; PROJECT="$2"; shift 2 ;;
    --health-url) [[ $# -ge 2 ]] || die "$1 需要 URL"; HEALTH_URL="$2"; shift 2 ;;
    --health-timeout) [[ $# -ge 2 ]] || die "$1 需要秒数"; HEALTH_TIMEOUT="$2"; shift 2 ;;
    --port) [[ $# -ge 2 ]] || die "$1 需要端口"; TARGET_PORT="$2"; shift 2 ;;
    --backup-mode) [[ $# -ge 2 ]] || die "$1 需要模式"; BACKUP_MODE="$2"; shift 2 ;;
    --backup-dir) [[ $# -ge 2 ]] || die "$1 需要目录"; BACKUP_DIR="$2"; shift 2 ;;
    --backup-retention) [[ $# -ge 2 ]] || die "$1 需要数字"; BACKUP_RETENTION="$2"; shift 2 ;;
    --data-dir) [[ $# -ge 2 ]] || die "$1 需要目录"; LEGACY_DATA_DIR="$2"; shift 2 ;;
    --yes|-y) ASSUME_CONFIRM=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) die "未知参数：$1（用 --help 查看用法）" ;;
    *) die "未知位置参数：$1" ;;
  esac
done

[[ -n "$IMAGE_INPUT" ]] || die "缺少 --image（新版本 app 镜像）"
[[ "$HEALTH_TIMEOUT" =~ ^[0-9]+$ ]] || die "健康探测超时必须是非负秒数：$HEALTH_TIMEOUT"
[[ "$BACKUP_RETENTION" =~ ^[1-9][0-9]*$ ]] || die "备份保留份数必须是正整数：$BACKUP_RETENTION"
case "$BACKUP_MODE" in auto|compose|legacy|none) ;; *) die "--backup-mode 只能是 auto|compose|legacy|none" ;; esac

# ---------------------------------------------------------------- 工具函数
image_repo() {   # repo:tag / registry:5000/repo:tag → repo（去掉 tag 部分）
  local img="$1" last="${1##*/}"
  if [[ "$last" == *:* ]]; then printf '%s' "${img%:*}"; else printf '%s' "$img"; fi
}

resolve_image() {   # <输入> <tag> → 完整镜像引用（输入没有 tag 时补 :tag）
  local in="$1" tag="$2" last="${1##*/}"
  if [[ "$last" == *:* ]]; then printf '%s' "$in"; else printf '%s:%s' "$in" "$tag"; fi
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

# ---------------------------------------------------------------- 前置校验
command -v docker >/dev/null 2>&1 || die "找不到 docker 命令"
docker info >/dev/null 2>&1 || die "docker 守护进程不可用：systemctl status docker"
docker compose version >/dev/null 2>&1 || die "需要 docker compose v2（docker compose version 失败）"

COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"
ENV_FILE="$COMPOSE_DIR/.env"
[[ -f "$COMPOSE_FILE" ]] || die "找不到 compose 文件：$COMPOSE_FILE（用 --compose-dir 指定）"
[[ -f "$ENV_FILE" ]] || die "找不到 $ENV_FILE：先 cp $COMPOSE_DIR/.env.example .env 并填 DB_PASSWORD / SK_CRYPTO_KEY"

DC=(docker compose -f "$COMPOSE_FILE" --project-name "$PROJECT" --env-file "$ENV_FILE")
compose_ps_q() { "${DC[@]}" ps -q "$1" 2>/dev/null || true; }

NEW_APP_IMAGE="$(resolve_image "$IMAGE_INPUT" "$TAG")"
APP_REPO="${APP_REPO:-$(image_repo "$NEW_APP_IMAGE")}"
[[ -n "$APP_REPO" ]] || die "无法确定 app 镜像仓库名，请用 --repo 指定"
if ! docker image inspect "$NEW_APP_IMAGE" >/dev/null 2>&1; then
  die "目标镜像不存在：$NEW_APP_IMAGE
  先在构建机 docker build（或 docker load）出这个 tag，再发版。
  查看本机现有镜像：docker image ls | grep '${APP_REPO}'" 1
fi
log "目标 app 镜像：$NEW_APP_IMAGE（仓库 $APP_REPO，标签 $TAG）"

NEW_WEB_IMAGE=""
if [[ -n "$WEB_IMAGE_INPUT" ]]; then
  NEW_WEB_IMAGE="$(resolve_image "$WEB_IMAGE_INPUT" "$TAG")"
  WEB_REPO="${WEB_REPO:-$(image_repo "$NEW_WEB_IMAGE")}"
  if ! docker image inspect "$NEW_WEB_IMAGE" >/dev/null 2>&1; then
    die "目标 web 镜像不存在：$NEW_WEB_IMAGE（先构建/导入，或用 --web-image 指明正确名字）" 1
  fi
  log "目标 web 镜像：$NEW_WEB_IMAGE（仓库 $WEB_REPO）"
else
  log "未指定 --web-image：web 服务沿用 compose 里的默认镜像，不做版本切换"
fi

# 当前版本（可能为空：首次发布）
CUR_APP_IMAGE=""
CUR_WEB_IMAGE=""
APP_CID="$(compose_ps_q app)"
if [[ -n "$APP_CID" ]]; then
  CUR_APP_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$APP_CID" 2>/dev/null || true)"
fi
WEB_CID="$(compose_ps_q web)"
if [[ -n "$WEB_CID" ]]; then
  CUR_WEB_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$WEB_CID" 2>/dev/null || true)"
fi
STACK_RUNNING=0
[[ -n "$APP_CID" ]] && STACK_RUNNING=1

# 备份工具选择
if [[ "$BACKUP_MODE" == "auto" ]]; then
  if [[ "$STACK_RUNNING" -eq 1 ]]; then BACKUP_MODE="compose"; else BACKUP_MODE="legacy"; fi
fi

# ---------------------------------------------------------------- 计划打印
echo
log "================ 发布计划 ================"
log "compose 项目  : $PROJECT（$COMPOSE_DIR）"
log "新 app 镜像   : $NEW_APP_IMAGE"
log "当前 app 镜像 : ${CUR_APP_IMAGE:-（栈未运行/首次发布）}"
log "previous 标记 : ${APP_REPO}:previous"
if [[ -n "$NEW_WEB_IMAGE" ]]; then
  log "新 web 镜像   : $NEW_WEB_IMAGE"
  log "当前 web 镜像 : ${CUR_WEB_IMAGE:-（未运行）}"
fi
log "健康探测      : $HEALTH_URL（超时 ${HEALTH_TIMEOUT}s）"
case "$BACKUP_MODE" in
  compose) log "发布前备份    : scripts/deploy/backup.sh（目标栈在跑，进 db 容器 mysqldump）" ;;
  legacy)  log "发布前备份    : scripts/nas/backup.sh（目标栈未运行，按当前 H2 生产备份）" ;;
  none)    log "发布前备份    : **跳过（--backup-mode none）**" ;;
esac
log "备份目录      : $BACKUP_DIR（保留 $BACKUP_RETENTION 份）"
log "=========================================="
echo

if [[ "$DRY_RUN" -eq 1 ]]; then
  log "--dry-run：以下是完整流程，本次不会真的执行"
  log "  1) bash ${PREFLIGHT_SCRIPT#$REPO_ROOT/} --compose-dir $COMPOSE_DIR --port $TARGET_PORT --health-url $HEALTH_URL"
  case "$BACKUP_MODE" in
    compose) log "  2) bash scripts/deploy/backup.sh --compose-dir $COMPOSE_DIR --output $BACKUP_DIR --retention $BACKUP_RETENTION" ;;
    legacy)  log "  2) CONFIRM=yes bash scripts/nas/backup.sh --output $BACKUP_DIR --retention $BACKUP_RETENTION --yes" ;;
    none)    log "  2) （跳过备份）" ;;
  esac
  [[ -n "$CUR_APP_IMAGE" ]] && log "  3) docker tag $CUR_APP_IMAGE ${APP_REPO}:previous"
  [[ -n "$NEW_WEB_IMAGE" && -n "$CUR_WEB_IMAGE" ]] && log "  3) docker tag $CUR_WEB_IMAGE ${WEB_REPO}:previous"
  log "  4) XURI_APP_IMAGE=$NEW_APP_IMAGE ${NEW_WEB_IMAGE:+XURI_WEB_IMAGE=$NEW_WEB_IMAGE }docker compose -f $COMPOSE_FILE --project-name $PROJECT up -d"
  log "  5) 轮询 $HEALTH_URL（最长 ${HEALTH_TIMEOUT}s）；失败则回滚到 ${APP_REPO}:previous 并打印日志尾部"
  exit 0
fi

# ---------------------------------------------------------------- 1. preflight
echo
log "---- 步骤 1/5：preflight 体检（只读） ----"
PREFLIGHT_ARGS=(--compose-dir "$COMPOSE_DIR" --port "$TARGET_PORT" --health-url "$HEALTH_URL" --backup-dir "$BACKUP_DIR")
[[ -n "$LEGACY_DATA_DIR" ]] && PREFLIGHT_ARGS+=(--data-dir "$LEGACY_DATA_DIR")
if [[ "$STACK_RUNNING" -eq 0 ]]; then
  warn "目标栈当前未运行：preflight 会检查旧生产容器 surveyking 的健康状态（切换前的正确检查对象）"
fi
# 本脚本已经做过确认（CONFIRM=yes 或 --yes）时，把确认透传给 preflight，
# 否则 preflight 会因为「无法自动判断是否在考试中」而阻塞整个发布流程。
set +e
if [[ "$ASSUME_CONFIRM" -eq 1 || "${CONFIRM:-}" == "yes" ]]; then
  CONFIRM=yes bash "$PREFLIGHT_SCRIPT" "${PREFLIGHT_ARGS[@]}"
else
  bash "$PREFLIGHT_SCRIPT" "${PREFLIGHT_ARGS[@]}"
fi
PREFLIGHT_RC=$?
set -e
case "$PREFLIGHT_RC" in
  0) log "preflight 通过" ;;
  2) warn "preflight 只有警告，继续（请回看上面的 [警告]）" ;;
  *)
    err "preflight 未通过（退出码 $PREFLIGHT_RC），发布中止。生产没有被改动。"
    err "按上面 [阻塞] 处理完毕后重跑；应急场景见 deploy/nas/prod/README.md"
    exit 1
    ;;
esac

# ---------------------------------------------------------------- 2. 确认
echo
log "---- 步骤 2/5：确认 ----"
cat >&2 <<EOF
即将执行（会切换生产镜像）：
  1) 备份到 ${BACKUP_DIR}（模式：${BACKUP_MODE}）
  2) docker tag ${CUR_APP_IMAGE:-（无当前镜像，跳过）} ${APP_REPO}:previous
${NEW_WEB_IMAGE:+
  3) docker tag ${CUR_WEB_IMAGE:-（无当前 web 镜像，跳过）} ${WEB_REPO}:previous
}  4) XURI_APP_IMAGE=${NEW_APP_IMAGE} docker compose -f ${COMPOSE_FILE} --project-name ${PROJECT} up -d
  5) 健康检查 ${HEALTH_URL}（最长 ${HEALTH_TIMEOUT}s），失败自动回滚到 ${APP_REPO}:previous

不会执行：docker compose down / down -v / docker rm -v（任何删数据动作都没有）
EOF
if [[ "$ASSUME_CONFIRM" -eq 1 || "${CONFIRM:-}" == "yes" ]]; then
  log "已确认（CONFIRM=yes / --yes），继续"
else
  err "未确认，发布中止（生产没有被改动）。确认后重跑："
  err "  CONFIRM=yes bash scripts/nas/release.sh --image $NEW_APP_IMAGE $( [[ -n "$NEW_WEB_IMAGE" ]] && echo "--web-image $NEW_WEB_IMAGE" )"
  exit 1
fi

# ---------------------------------------------------------------- 3. 备份
echo
log "---- 步骤 3/5：发布前备份（模式 ${BACKUP_MODE}） ----"
if [[ "$BACKUP_MODE" == "none" ]]; then
  warn "按 --backup-mode none 跳过备份；出事时没有这次发布前的还原点，风险自负"
elif [[ "$BACKUP_MODE" == "compose" ]]; then
  [[ -f "$COMPOSE_BACKUP_SCRIPT" ]] || { err "找不到 $COMPOSE_BACKUP_SCRIPT"; exit 2; }
  set +e
  bash "$COMPOSE_BACKUP_SCRIPT" --compose-dir "$COMPOSE_DIR" --output "$BACKUP_DIR" --retention "$BACKUP_RETENTION"
  BK_RC=$?
  set -e
  if [[ "$BK_RC" -ne 0 ]]; then
    err "备份失败（退出码 $BK_RC），未切镜像。生产没有被改动。"
    err "处理完备份问题后重跑，或临时用 --backup-mode legacy / none（不推荐）"
    exit 2
  fi
  log "备份完成"
else
  [[ -f "$BACKUP_SCRIPT" ]] || { err "找不到 $BACKUP_SCRIPT"; exit 2; }
  BK_ARGS=(--output "$BACKUP_DIR" --retention "$BACKUP_RETENTION" --yes)
  [[ -n "$LEGACY_DATA_DIR" ]] && BK_ARGS+=(--data-dir "$LEGACY_DATA_DIR")
  set +e
  CONFIRM=yes bash "$BACKUP_SCRIPT" "${BK_ARGS[@]}"
  BK_RC=$?
  set -e
  if [[ "$BK_RC" -ne 0 ]]; then
    err "备份失败（退出码 $BK_RC），未切镜像。生产没有被改动。"
    err "若是退出码 3：容器恢复失败，先 docker start surveyking 再说"
    exit 2
  fi
  log "备份完成"
fi

# ---------------------------------------------------------------- 4. 记录 previous
echo
log "---- 步骤 4/5：记录当前版本为 previous ----"
PREV_APP="${APP_REPO}:previous"
if [[ -n "$CUR_APP_IMAGE" ]]; then
  log "[动作] docker tag $CUR_APP_IMAGE $PREV_APP"
  if ! docker tag "$CUR_APP_IMAGE" "$PREV_APP"; then
    err "docker tag 失败，未切镜像。检查磁盘空间与镜像名：docker image ls"
    exit 3
  fi
  log "已记录：$PREV_APP → $CUR_APP_IMAGE"
else
  warn "目标栈未运行，没有当前 app 镜像可记录；本次失败将无法自动回滚（首次发布属正常）"
fi
PREV_WEB=""
if [[ -n "$NEW_WEB_IMAGE" ]]; then
  if [[ -n "$CUR_WEB_IMAGE" ]]; then
    PREV_WEB="${WEB_REPO}:previous"
    log "[动作] docker tag $CUR_WEB_IMAGE $PREV_WEB"
    if ! docker tag "$CUR_WEB_IMAGE" "$PREV_WEB"; then
      err "docker tag（web）失败，未切镜像"
      exit 3
    fi
    log "已记录：$PREV_WEB → $CUR_WEB_IMAGE"
  else
    warn "没有当前 web 镜像可记录（首次发布）"
  fi
fi

# ---------------------------------------------------------------- 5. 切换 + 健康
echo
log "---- 步骤 5/5：切换镜像并等健康检查 ----"
up_with() {   # up_with <app_image> [web_image]
  local app="$1" web="${2:-}"
  if [[ -n "$web" ]]; then
    env XURI_APP_IMAGE="$app" XURI_WEB_IMAGE="$web" "${DC[@]}" up -d
  else
    env XURI_APP_IMAGE="$app" "${DC[@]}" up -d
  fi
}

dump_logs() {
  log "---- 容器日志尾部（app / web） ----"
  set +e
  "${DC[@]}" logs --tail=80 --no-color app 2>&1 | tail -n 80
  if [[ -n "$(compose_ps_q web)" ]]; then
    "${DC[@]}" logs --tail=40 --no-color web 2>&1 | tail -n 40
  fi
  set -e
  log "---- 日志结束 ----"
}

log "[动作] XURI_APP_IMAGE=$NEW_APP_IMAGE ${NEW_WEB_IMAGE:+XURI_WEB_IMAGE=$NEW_WEB_IMAGE }docker compose up -d"
set +e
up_with "$NEW_APP_IMAGE" "$NEW_WEB_IMAGE"
UP_RC=$?
set -e
if [[ "$UP_RC" -ne 0 ]]; then
  err "docker compose up -d 失败（退出码 $UP_RC）"
  dump_logs
  # 走自动回滚路径
else
  if wait_health; then
    echo
    log "================ 发布成功 ================"
    log "新版本 app 镜像 : $NEW_APP_IMAGE"
    [[ -n "$NEW_WEB_IMAGE" ]] && log "新版本 web 镜像 : $NEW_WEB_IMAGE"
    log "上一版标记      : ${PREV_APP}（→ ${CUR_APP_IMAGE:-无，首次发布，失败时无法自动回滚}）"
    log "服务状态："
    "${DC[@]}" ps || true
    log "=========================================="
    exit 0
  fi
  err "健康检查失败：${HEALTH_TIMEOUT}s 内 $HEALTH_URL 未返回成功"
  dump_logs
fi

# ---------------------------------------------------------------- 自动回滚
echo
warn "开始自动回滚到上一版"
if [[ -z "$PREV_APP" ]] || ! docker image inspect "$PREV_APP" >/dev/null 2>&1; then
  err "没有可用的 ${APP_REPO}:previous 镜像，无法自动回滚。"
  err "立刻人工处理（二选一）："
  err "  · 修好新版本后：CONFIRM=yes bash scripts/nas/release.sh --image $NEW_APP_IMAGE"
  err "  · 回到你确定可用的镜像：CONFIRM=yes bash scripts/nas/rollback.sh --to <tag>"
  exit 5
fi
log "[动作] 回滚：XURI_APP_IMAGE=$PREV_APP ${PREV_WEB:+XURI_WEB_IMAGE=$PREV_WEB }docker compose up -d"
set +e
up_with "$PREV_APP" "$PREV_WEB"
RB_UP_RC=$?
set -e
if [[ "$RB_UP_RC" -ne 0 ]]; then
  err "回滚命令本身失败（退出码 $RB_UP_RC）。生产状态不确定，立刻人工处理："
  err "  docker compose -f $COMPOSE_FILE --project-name $PROJECT ps"
  err "  docker compose -f $COMPOSE_FILE --project-name $PROJECT logs --tail=100 app"
  err "  CONFIRM=yes bash scripts/nas/rollback.sh --to previous"
  exit 5
fi
if wait_health; then
  warn "已自动回滚到 ${PREV_APP}，健康检查通过。本次发布失败，生产回到旧版本。"
  err "下一步：把 ${NEW_APP_IMAGE} 的 app 日志（见上）拿去定位问题，修好后重新构建再发。"
  exit 4
fi
err "回滚后健康检查仍失败！生产可能不可用，立即人工处理："
err "  docker compose -f $COMPOSE_FILE --project-name $PROJECT ps"
err "  docker compose -f $COMPOSE_FILE --project-name $PROJECT logs --tail=200 app"
err "  docker compose -f $COMPOSE_FILE --project-name $PROJECT logs --tail=100 db"
err "必要时按 deploy/nas/prod/README.md「回滚」一节的应急步骤操作。"
exit 5
