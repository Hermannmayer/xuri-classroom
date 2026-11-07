#!/usr/bin/env bash
# =============================================================================
# 旭日云课堂 · NAS 发布前体检（只读，安全）
#
# 这个脚本不做任何写操作：不停容器、不写生产目录、不切镜像。它只回答一个
# 问题：**现在能不能发版/做切换**。任何一条「阻塞」都会让 release.sh 停下。
#
# 检查项：
#   1. 环境        docker 命令与守护进程可用
#   2. 目录        生产数据目录存在、备份目录可写
#   3. 磁盘        备份所在文件系统剩余空间（默认门槛 5GB）
#   4. 备份新鲜度  最近一份 backup_*.tar.gz：>24h 警告、>48h 阻塞、没有备份直接阻塞
#   5. 容器健康    当前生产容器是否在跑、/api/system 是否 200
#   6. 端口        目标端口（默认 201）被谁占着：docker 容器占用算警告，其它进程算阻塞
#   7. 发布配置    compose 文件、.env、SK_CRYPTO_KEY / DB_PASSWORD 是否齐
#   8. 回滚能力    <app 镜像>:previous 是否存在（首次发布没有，给警告）
#   9. 日志配置    json-file 是否配了 max-size（没配可能把 /vol2 写满）
#  10. 考试中判定  优先用调用方给的 SQL（--exam-sql / EXAM_CHECK_SQL）；拿不到就降级为
#                  「打印当前时间 + 要求人工确认 CONFIRM=yes」，绝不猜表名、不猜字段
#
# 关于「考试中」：
#   系统里没有在线会话表，没有任何 SQL 能准确回答「此刻有没有人在答题」。能做的最强
#   信号是 t_project 里 status=1 且 setting JSON 中 examSetting.startTime/endTime 覆盖
#   当前时间——但这条查询依赖 JSON 字段格式，**没有在生产库上验证过**，所以本脚本
#   不内置它，只提供入口；建议查询见 deploy/nas/prod/README.md「考试期间能否发版」。
#   拿不到结果时，本脚本降级为人工确认：没有 CONFIRM=yes 就算阻塞。
#
# 用法：
#   bash scripts/nas/preflight.sh
#   bash scripts/nas/preflight.sh --compose-dir deploy/nas/prod --port 201
#   bash scripts/nas/preflight.sh --exam-sql /vol2/1000/xuri/exam-check.sql
#   CONFIRM=yes bash scripts/nas/preflight.sh          # 人工确认「此刻无考试」后放行
#   bash scripts/nas/preflight.sh --force               # 应急：已确认考试中也必须发版
#
# 退出码：
#   0  可以发布（没有阻塞项，也没有警告）
#   1  有阻塞项 —— 不要发布，先按输出处理
#   2  仅警告 —— 可以发布，但请看过每条警告
#
# 首次使用请先：chmod +x scripts/nas/preflight.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ---------------------------------------------------------------- 默认值（NAS 实测路径）
COMPOSE_DIR="$REPO_ROOT/deploy/nas/prod"
CONTAINER="${XURI_CONTAINER:-surveyking}"        # 当前在生产跑的容器（手工 docker run）
HEALTH_URL="${XURI_HEALTH_URL:-http://127.0.0.1:201/api/system}"
BACKUP_DIR="${BACKUP_DIR:-/vol2/1000/xuri/backup}"
DATA_DIR="${XURI_LEGACY_DATA_DIR:-/vol2/1000/surveyking}"
TARGET_PORT="${XURI_APP_PORT:-201}"
MIN_FREE_GB=5
BACKUP_WARN_HOURS=24
BACKUP_BLOCK_HOURS=48
EXAM_SQL_FILE=""
MYSQL_CONTAINER=""
FORCE=0
HEALTH_TIMEOUT="${XURI_HEALTH_TIMEOUT:-10}"
APP_IMAGE_REPO="${XURI_APP_IMAGE_REPO:-xuri-classroom}"

BLOCKERS=0
WARNINGS=0

# ---------------------------------------------------------------- 输出助手
pass()  { printf '[通过] %s\n' "$*"; }
info()  { printf '[信息] %s\n' "$*"; }
warn_check() { WARNINGS=$((WARNINGS + 1)); printf '[警告] %s\n' "$*"; }
block() { BLOCKERS=$((BLOCKERS + 1)); printf '[阻塞] %s\n' "$*"; }

die() { printf '[错误] %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'USAGE'
用法：bash scripts/nas/preflight.sh [选项]（只读，不会改动任何东西）

  --compose-dir <目录>   目标态 compose 目录，默认 <仓库>/deploy/nas/prod
  --container <名称>     当前生产容器名，默认 surveyking
  --health-url <url>     健康探测地址，默认 http://127.0.0.1:201/api/system
  --backup-dir <目录>    备份目录，默认 ${BACKUP_DIR:-/vol2/1000/xuri/backup}
  --data-dir <目录>      生产数据目录，默认 /vol2/1000/surveyking
  --port <端口>          目标对外端口，默认 201
  --min-free-gb <GB>     磁盘剩余空间门槛，默认 5
  --exam-sql <文件|->    可选：返回「进行中考试数」的 SQL（- 表示从 stdin 读）
  --mysql-container <c>  可选：指定 MySQL 容器名（默认按 compose 标签自动找 db 服务）
  --force                应急：把「考试进行中」从阻塞降级为警告
  --help                 显示本帮助

环境变量：CONFIRM=yes 表示「已人工确认此刻无考试」，用于无法自动判定时放行。
退出码：0 可发布 / 1 有阻塞项 / 2 仅警告
USAGE
}

# ---------------------------------------------------------------- 参数解析
while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose-dir) [[ $# -ge 2 ]] || die "$1 需要目录参数"; COMPOSE_DIR="$2"; shift 2 ;;
    --container) [[ $# -ge 2 ]] || die "$1 需要容器名"; CONTAINER="$2"; shift 2 ;;
    --health-url) [[ $# -ge 2 ]] || die "$1 需要 URL"; HEALTH_URL="$2"; shift 2 ;;
    --backup-dir) [[ $# -ge 2 ]] || die "$1 需要目录参数"; BACKUP_DIR="$2"; shift 2 ;;
    --data-dir) [[ $# -ge 2 ]] || die "$1 需要目录参数"; DATA_DIR="$2"; shift 2 ;;
    --port) [[ $# -ge 2 ]] || die "$1 需要端口号"; TARGET_PORT="$2"; shift 2 ;;
    --min-free-gb) [[ $# -ge 2 ]] || die "$1 需要数字"; MIN_FREE_GB="$2"; shift 2 ;;
    --exam-sql) [[ $# -ge 2 ]] || die "$1 需要文件路径或 -"; EXAM_SQL_FILE="$2"; shift 2 ;;
    --mysql-container) [[ $# -ge 2 ]] || die "$1 需要容器名"; MYSQL_CONTAINER="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) die "未知参数：$1（用 --help 查看用法）" ;;
    *) die "未知位置参数：$1" ;;
  esac
done

[[ "$TARGET_PORT" =~ ^[0-9]+$ ]] || die "端口必须是数字：$TARGET_PORT"
[[ "$MIN_FREE_GB" =~ ^[0-9]+$ ]] || die "磁盘门槛必须是整数 GB：$MIN_FREE_GB"

# ---------------------------------------------------------------- 工具
human_kb() { awk -v k="${1:-0}" 'BEGIN{ if (k>1048576) printf "%.1f GB", k/1048576; else if (k>1024) printf "%.1f MB", k/1024; else printf "%d KB", k }'; }

http_ok() {
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS --max-time "$HEALTH_TIMEOUT" "$1" >/dev/null 2>&1; then return 0; fi
    return 1
  fi
  if command -v wget >/dev/null 2>&1; then
    if wget -q -T "$HEALTH_TIMEOUT" -O /dev/null "$1" >/dev/null 2>&1; then return 0; fi
    return 1
  fi
  return 2   # 2 = 没有探测工具
}

env_value() {   # env_value <file> <KEY>
  local file="$1" key="$2" line
  [[ -f "$file" ]] || return 0
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$file" 2>/dev/null | tail -n 1 || true)"
  printf '%s' "${line#*=}" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

DOCKER_OK=0
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then DOCKER_OK=1; fi
fi

# ---------------------------------------------------------------- banner
NOW_HUMAN="$(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="
echo " 旭日云课堂 · 发布前体检（只读）"
echo " 时间        : $NOW_HUMAN"
echo " 主机        : $(hostname 2>/dev/null || echo unknown)"
echo " 生产容器    : $CONTAINER"
echo " 数据目录    : $DATA_DIR"
echo " 备份目录    : $BACKUP_DIR"
echo " 目标端口    : $TARGET_PORT"
echo " 健康探测    : $HEALTH_URL"
echo " compose 目录: $COMPOSE_DIR"
echo "=================================================================="
echo

# ---------------------------------------------------------------- 1. 环境
echo "---- 1. 环境 ----"
if command -v docker >/dev/null 2>&1; then
  if [[ "$DOCKER_OK" -eq 1 ]]; then
    pass "docker 可用（$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo 版本未知)）"
  else
    block "docker 命令存在但守护进程不可用：systemctl status docker 看一下"
  fi
else
  block "找不到 docker 命令：本脚本必须在 NAS 宿主机上执行"
fi
if command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1; then
  pass "有可用的 HTTP 探测工具"
else
  warn_check "宿主机既没有 curl 也没有 wget，健康探测会被跳过"
fi
echo

# ---------------------------------------------------------------- 2. 目录
echo "---- 2. 目录 ----"
if [[ -d "$DATA_DIR" ]]; then
  pass "生产数据目录存在：$DATA_DIR"
  for sub in db files config; do
    if [[ -d "$DATA_DIR/$sub" ]]; then
      pass "  $DATA_DIR/$sub 存在"
    else
      warn_check "  $DATA_DIR/$sub 不存在（当前生产形态下应该有；换过路径？）"
    fi
  done
else
  block "生产数据目录不存在：$DATA_DIR（路径对不对？用 --data-dir 改）"
fi
if [[ -d "$BACKUP_DIR" ]]; then
  if [[ -w "$BACKUP_DIR" ]]; then
    pass "备份目录存在且可写：$BACKUP_DIR"
  else
    block "备份目录不可写：$BACKUP_DIR（检查权限，或用 --backup-dir 换目录）"
  fi
else
  block "备份目录不存在：$BACKUP_DIR（先跑一次 scripts/nas/backup.sh）"
fi
echo

# ---------------------------------------------------------------- 3. 磁盘
echo "---- 3. 磁盘空间 ----"
for probe_dir in "$BACKUP_DIR" "$DATA_DIR"; do
  [[ -d "$probe_dir" ]] || continue
  avail_kb="$(df -Pk "$probe_dir" 2>/dev/null | awk 'NR==2 {print $4}')"
  if [[ "$avail_kb" =~ ^[0-9]+$ ]]; then
    avail_human="$(human_kb "$avail_kb")"
    if (( avail_kb < MIN_FREE_GB * 1024 * 1024 )); then
      block "$probe_dir 剩余 ${avail_human}，低于门槛 ${MIN_FREE_GB}GB —— 备份和升级都可能写满磁盘"
    else
      pass "$probe_dir 剩余 ${avail_human}（门槛 ${MIN_FREE_GB}GB）"
    fi
  else
    warn_check "无法读取 $probe_dir 的剩余空间（df 失败）"
  fi
done
echo

# ---------------------------------------------------------------- 4. 备份新鲜度
echo "---- 4. 备份新鲜度 ----"
if [[ -d "$BACKUP_DIR" ]]; then
  LATEST_BACKUP="$(ls -1t -- "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | head -n 1 || true)"
  if [[ -n "$LATEST_BACKUP" && -f "$LATEST_BACKUP" ]]; then
    if MTIME="$(stat -c %Y "$LATEST_BACKUP" 2>/dev/null)" && [[ "$MTIME" =~ ^[0-9]+$ ]]; then
      AGE_SECONDS=$(( $(date +%s) - MTIME ))
      (( AGE_SECONDS < 0 )) && AGE_SECONDS=0
      AGE_HOURS=$(( AGE_SECONDS / 3600 ))
      AGE_TEXT="$(( AGE_SECONDS / 60 )) 分钟"
      (( AGE_HOURS >= 1 )) && AGE_TEXT="${AGE_HOURS} 小时"
      if (( AGE_HOURS >= BACKUP_BLOCK_HOURS )); then
        block "最近一份备份是 $(basename "$LATEST_BACKUP")，已 ${AGE_TEXT} 前（>=${BACKUP_BLOCK_HOURS}h）—— 先跑 scripts/nas/backup.sh"
      elif (( AGE_HOURS >= BACKUP_WARN_HOURS )); then
        warn_check "最近一份备份是 $(basename "$LATEST_BACKUP")，已 ${AGE_TEXT} 前（>=${BACKUP_WARN_HOURS}h）—— 建议先补一份"
      else
        pass "最近一份备份 $(basename "$LATEST_BACKUP") 是 ${AGE_TEXT} 前（门槛 ${BACKUP_WARN_HOURS}h/${BACKUP_BLOCK_HOURS}h）"
      fi
      if [[ -f "$LATEST_BACKUP.sha256" ]]; then
        pass "  该备份有 .sha256 旁挂校验文件"
      else
        warn_check "  该备份没有 .sha256 旁挂文件，无法快速确认完整性"
      fi
    else
      warn_check "无法读取 $LATEST_BACKUP 的修改时间"
    fi
  else
    block "在 $BACKUP_DIR 下找不到任何 backup_*.tar.gz —— 没有备份就不许发版"
  fi
else
  block "备份目录不存在，无法判断备份新鲜度"
fi
echo

# ---------------------------------------------------------------- 5. 容器健康
echo "---- 5. 当前生产容器 ----"
CONTAINER_EXISTS=0
if [[ "$DOCKER_OK" -eq 1 ]]; then
  if docker inspect "$CONTAINER" >/dev/null 2>&1; then
    CONTAINER_EXISTS=1
  fi
fi
if [[ "$CONTAINER_EXISTS" -eq 1 ]]; then
  STATE="$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo unknown)"
  RESTARTS="$(docker inspect -f '{{.RestartCount}}' "$CONTAINER" 2>/dev/null || echo 0)"
  # 防御：docker inspect 可能返回空/怪值，别让算术展开把整个体检脚本带走
  [[ "$RESTARTS" =~ ^[0-9]+$ ]] || RESTARTS=0
  IMG="$(docker inspect -f '{{.Config.Image}}' "$CONTAINER" 2>/dev/null || echo unknown)"
  info "容器 $CONTAINER：status=$STATE，restartCount=$RESTARTS，image=$IMG"
  if [[ "$STATE" == "running" ]]; then
    pass "容器在运行"
    HEALTH_STATUS="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER" 2>/dev/null || echo none)"
    case "$HEALTH_STATUS" in
      healthy) pass "docker 健康检查状态 healthy" ;;
      unhealthy) block "docker 健康检查状态 unhealthy —— 先看日志：docker logs --tail 100 $CONTAINER" ;;
      starting) warn_check "docker 健康检查仍在 starting" ;;
      none) info "该容器没有定义 docker 健康检查，改用 HTTP 探测" ;;
      *) warn_check "docker 健康检查状态未知：$HEALTH_STATUS" ;;
    esac
    PROBE_RC=0
    http_ok "$HEALTH_URL" || PROBE_RC=$?
    if [[ "$PROBE_RC" -eq 0 ]]; then
      pass "HTTP 探测通过：$HEALTH_URL"
    elif [[ "$PROBE_RC" -eq 2 ]]; then
      warn_check "没有 curl/wget，HTTP 探测被跳过（容器在跑，但没验证接口）"
    else
      warn_check "HTTP 探测失败：$HEALTH_URL（容器在跑，但 /api/system 没返回成功；可能仍在启动或已半死）"
    fi
    if (( RESTARTS > 3 )); then
      warn_check "容器重启过 ${RESTARTS} 次，可能有反复崩溃"
    fi
  else
    block "容器状态是 $STATE，不是 running —— 生产现在是坏的，先修它再发版（docker logs --tail 100 $CONTAINER）"
  fi
else
  if [[ "$DOCKER_OK" -eq 1 ]]; then
    warn_check "找不到容器 $CONTAINER（首次切换？确认容器名，或用 --container 指定）"
  fi
fi
echo

# ---------------------------------------------------------------- 6. 端口
echo "---- 6. 目标端口 ${TARGET_PORT} ----"
if [[ "$DOCKER_OK" -eq 1 ]]; then
  PORT_OWNERS="$(docker ps --filter "publish=${TARGET_PORT}" --format '{{.Names}}' 2>/dev/null | tr '\n' ' ' || true)"
  PORT_OWNERS="${PORT_OWNERS% }"
  SS_LINE=""
  if command -v ss >/dev/null 2>&1; then
    SS_LINE="$(ss -ltnp 2>/dev/null | grep -E "[:.]${TARGET_PORT}[[:space:]]" || true)"
  elif command -v netstat >/dev/null 2>&1; then
    SS_LINE="$(netstat -ltnp 2>/dev/null | grep -E "[:.]${TARGET_PORT}[[:space:]]" || true)"
  fi
  if [[ -n "$PORT_OWNERS" ]]; then
    warn_check "端口 ${TARGET_PORT} 已被 docker 容器占用：${PORT_OWNERS} —— 若是当前生产容器，切换时必须先停它（这是切换步骤，不是错误）"
  elif [[ -n "$SS_LINE" ]]; then
    block "端口 ${TARGET_PORT} 被非 docker 进程占用：$(printf '%s' "$SS_LINE" | head -n 1)"
  else
    pass "端口 ${TARGET_PORT} 空闲"
  fi
else
  warn_check "docker 不可用，跳过端口检查"
fi
echo

# ---------------------------------------------------------------- 7. 发布配置
echo "---- 7. 发布配置 ----"
COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"
ENV_FILE="$COMPOSE_DIR/.env"
if [[ -f "$COMPOSE_FILE" ]]; then
  pass "找到 compose 文件：$COMPOSE_FILE"
  if [[ -f "$ENV_FILE" ]]; then
    pass "找到 env 文件：$ENV_FILE"
    SK="$(env_value "$ENV_FILE" SK_CRYPTO_KEY)"
    DBP="$(env_value "$ENV_FILE" DB_PASSWORD)"
    if [[ -n "$SK" ]]; then
      pass "  SK_CRYPTO_KEY 已设置（长度 ${#SK}）"
    else
      block "  .env 里没有 SK_CRYPTO_KEY：compose 会因为必填变量缺失拒绝启动（且丢了它已加密题库解不开）"
    fi
    if [[ -n "$DBP" ]]; then
      pass "  DB_PASSWORD 已设置"
    else
      block "  .env 里没有 DB_PASSWORD"
    fi
    if [[ -n "$(env_value "$ENV_FILE" JWT_SECRET)" ]]; then
      pass "  JWT_SECRET 已设置（重启不会踢人下线）"
    else
      warn_check "  .env 里没有 JWT_SECRET：每次重启所有人要重新登录"
    fi
  else
    block "缺少 $ENV_FILE：复制 $COMPOSE_DIR/.env.example 为 .env 并填好再发版"
  fi
else
  warn_check "找不到 $COMPOSE_FILE（目标态还没落到这台机器上？用 --compose-dir 指定）"
fi
if [[ "$DOCKER_OK" -eq 1 ]]; then
  if docker image inspect "${APP_IMAGE_REPO}:previous" >/dev/null 2>&1; then
    pass "存在上一版镜像 ${APP_IMAGE_REPO}:previous（失败可自动回滚）"
  else
    warn_check "没有 ${APP_IMAGE_REPO}:previous 镜像 —— 本次发布失败将无法自动回滚（首次发布属正常）"
  fi
fi
echo

# ---------------------------------------------------------------- 8. 日志配置
echo "---- 8. 容器日志配置 ----"
if [[ "$CONTAINER_EXISTS" -eq 1 && "$DOCKER_OK" -eq 1 ]]; then
  LOG_TYPE="$(docker inspect -f '{{.HostConfig.LogConfig.Type}}' "$CONTAINER" 2>/dev/null || echo unknown)"
  LOG_MAX="$(docker inspect -f '{{index .HostConfig.LogConfig.Config "max-size"}}' "$CONTAINER" 2>/dev/null || echo '')"
  if [[ "$LOG_TYPE" == "json-file" ]]; then
    if [[ -n "$LOG_MAX" && "$LOG_MAX" != "<no value>" ]]; then
      pass "json-file 已限制 max-size=${LOG_MAX}"
    else
      warn_check "json-file 没配 max-size：日志可能把 /vol2 写满（目标态 compose 已设 10m×3）"
    fi
  else
    info "日志驱动是 ${LOG_TYPE}，不受 json-file 上限影响"
  fi
else
  info "跳过（容器不存在或 docker 不可用）"
fi
echo

# ---------------------------------------------------------------- 9. 考试中判定
echo "---- 9. 是否在考试中 ----"
EXAM_VERDICT="unknown"   # unknown | clear | busy
EXAM_DETAIL=""

find_db_container() {
  if [[ -n "$MYSQL_CONTAINER" ]]; then printf '%s' "$MYSQL_CONTAINER"; return 0; fi
  docker ps --filter "label=com.docker.compose.service=db" --format '{{.Names}}' 2>/dev/null | head -n 1
}

read_exam_sql() {
  if [[ -n "${EXAM_CHECK_SQL:-}" ]]; then printf '%s' "$EXAM_CHECK_SQL"; return 0; fi
  [[ -n "$EXAM_SQL_FILE" ]] || return 1
  if [[ "$EXAM_SQL_FILE" == "-" ]]; then cat; else cat "$EXAM_SQL_FILE"; fi
}

if [[ "$DOCKER_OK" -eq 1 ]] && SQL_TEXT="$(read_exam_sql 2>/dev/null)" && [[ -n "$SQL_TEXT" ]]; then
  DB_CONTAINER="$(find_db_container)"
  if [[ -n "$DB_CONTAINER" ]]; then
    DB_USER="$(env_value "$ENV_FILE" DB_USER)"; DB_USER="${DB_USER:-root}"
    DB_NAME="$(env_value "$ENV_FILE" DB_NAME)"; DB_NAME="${DB_NAME:-surveyking}"
    DB_PASSWORD="$(env_value "$ENV_FILE" DB_PASSWORD)"
    if [[ -z "$DB_PASSWORD" ]]; then
      DB_PASSWORD="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$DB_CONTAINER" 2>/dev/null \
        | grep -E '^MYSQL_ROOT_PASSWORD=' | head -n 1 | cut -d= -f2- || true)"
    fi
    SQL_OUT=""
    if SQL_OUT="$(docker exec -e MYSQL_PWD="$DB_PASSWORD" "$DB_CONTAINER" \
                    mysql -N -B -u"$DB_USER" "$DB_NAME" -e "$SQL_TEXT" 2>/dev/null)"; then
      EXAM_COUNT="$(printf '%s' "$SQL_OUT" | awk 'NF {v=$1} END {print v}' || true)"
      if [[ "$EXAM_COUNT" =~ ^[0-9]+$ ]]; then
        if (( EXAM_COUNT > 0 )); then
          EXAM_VERDICT="busy"; EXAM_DETAIL="查询结果 ${EXAM_COUNT}（>0）"
        else
          EXAM_VERDICT="clear"; EXAM_DETAIL="查询结果 0"
        fi
      else
        EXAM_DETAIL="SQL 返回内容不是数字：$(printf '%s' "$SQL_OUT" | head -n 3 | tr '\n' ' ')"
      fi
    else
      EXAM_DETAIL="在容器 $DB_CONTAINER 里执行选中 SQL 失败（MySQL 没跑？密码不对？SQL 有错？）"
    fi
  else
    EXAM_DETAIL="找不到 MySQL 容器（当前生产是 H2 形态，这条通道本来就不可用）"
  fi
else
  [[ -z "$EXAM_SQL_FILE" && -z "${EXAM_CHECK_SQL:-}" ]] && EXAM_DETAIL="没有提供 --exam-sql / EXAM_CHECK_SQL"
fi

case "$EXAM_VERDICT" in
  busy)
    if [[ "$FORCE" -eq 1 ]]; then
      warn_check "考试中判定为「有考试进行中」（$EXAM_DETAIL），但已用 --force 强制放行 —— 学生会掉线，请确认这是你想要的"
    else
      block "考试中判定为「有考试进行中」（$EXAM_DETAIL）—— 不要发版；确属应急请加 --force 并承担后果"
    fi
    ;;
  clear)
    pass "考试中判定为「没有进行中的考试」（$EXAM_DETAIL）"
    ;;
  *)
    printf '[信息] 无法自动判定是否在考试中：%s\n' "${EXAM_DETAIL:-未提供查询}"
    printf '[信息] 现在时间：%s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
    printf '[信息] 请人工确认：此刻没有班级在答题、没有老师在开考试。\n'
    if [[ "${CONFIRM:-}" == "yes" ]]; then
      pass "已收到 CONFIRM=yes：按「人工确认无考试」继续"
    else
      block "未拿到考试状态且没有人工确认 —— 确认后重新执行：CONFIRM=yes bash scripts/nas/preflight.sh <同样的参数>"
    fi
    ;;
esac
echo

# ---------------------------------------------------------------- 结论
echo "=================================================================="
if (( BLOCKERS > 0 )); then
  printf '[结论] 不可发布：%d 个阻塞项，%d 个警告\n' "$BLOCKERS" "$WARNINGS"
  echo "       按上面的 [阻塞] 逐条处理，然后重跑本脚本。"
  echo "=================================================================="
  exit 1
elif (( WARNINGS > 0 )); then
  printf '[结论] 可以发布，但有 %d 个警告，请先看完\n' "$WARNINGS"
  echo "=================================================================="
  exit 2
else
  echo "[结论] 检查全部通过，可以发布"
  echo "=================================================================="
  exit 0
fi
