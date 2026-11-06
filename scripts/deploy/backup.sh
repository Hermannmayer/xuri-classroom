#!/usr/bin/env bash
# =============================================================================
# Linux 备份脚本（Docker Compose 形态）
#
# 用途：备份 MySQL 全库 + 上传附件目录 + 脱敏后的 .env，生成带时间戳的 tar.gz，
#       并按保留份数清理旧备份。
#
# 为什么是这个形态：
#   docker-compose.yml 里数据库是容器（服务名 db）、MySQL 端口不对外发布、附件在命名卷
#   app-files 里。所以**不能在宿主机直接跑 mysqldump**，必须进容器执行。
#
# 用法：
#   ./scripts/deploy/backup.sh
#   ./scripts/deploy/backup.sh --output /data/backups --retention 14
#   ./scripts/deploy/backup.sh --compose-dir /opt/xuri-classroom
#
# 参数：
#   --compose-dir <dir>  含 docker-compose.yml 与 .env 的目录，默认：脚本上两级（仓库根）
#   --output <dir>       备份输出目录，默认 <compose-dir>/backups
#   --retention <n>      保留份数，默认 7
#   --db-service <name>  数据库服务名，默认 db
#   --app-service <name> 应用服务名，默认 app（附件从它的 /app/files 打包）
#   --env-file <file>    读取连接信息用的 env 文件，默认 <compose-dir>/.env
#   --help               显示帮助
#
# 说明：
#   - 归档内容：db.sql、files.tar.gz、app.env（密码打码）、manifest.txt
#   - 归档里的 app.env 只作参考，恢复时请使用线上 .env
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR=""
RETENTION=7
DB_SERVICE="db"
APP_SERVICE="app"
ENV_FILE=""

usage() {
  sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'
}

die() {
  echo "[错误] $*" >&2
  exit 1
}

log() {
  echo "[信息] $*"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose-dir) [[ $# -ge 2 ]] || die "$1 需要目录参数"; COMPOSE_DIR="$2"; shift 2 ;;
    --output|--output-dir) [[ $# -ge 2 ]] || die "$1 需要目录参数"; OUTPUT_DIR="$2"; shift 2 ;;
    --retention) [[ $# -ge 2 ]] || die "$1 需要数字"; RETENTION="$2"; shift 2 ;;
    --db-service) [[ $# -ge 2 ]] || die "$1 需要服务名"; DB_SERVICE="$2"; shift 2 ;;
    --app-service) [[ $# -ge 2 ]] || die "$1 需要服务名"; APP_SERVICE="$2"; shift 2 ;;
    --env-file) [[ $# -ge 2 ]] || die "$1 需要文件路径"; ENV_FILE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    -*) die "未知参数：$1（用 --help 查看用法）" ;;
    *) die "未知位置参数：$1" ;;
  esac
done

[[ "$RETENTION" =~ ^[1-9][0-9]*$ ]] || die "保留份数必须是正整数：$RETENTION"

# ---------------------------------------------------------------- 前置检查
command -v docker >/dev/null 2>&1 || die "找不到 docker 命令，请先安装 Docker Engine / Docker Desktop"

COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"
[[ -f "$COMPOSE_FILE" ]] || die "在 $COMPOSE_DIR 下找不到 docker-compose.yml（可用 --compose-dir 指定）"
ENV_FILE="${ENV_FILE:-$COMPOSE_DIR/.env}"
[[ -f "$ENV_FILE" ]] || die "找不到 env 文件：$ENV_FILE（从 .env.example 复制一份并填好 DB_PASSWORD / SK_CRYPTO_KEY）"
OUTPUT_DIR="${OUTPUT_DIR:-$COMPOSE_DIR/backups}"

# docker compose（v2）优先，退回到 docker-compose（v1）
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
else
  die "找不到 docker compose（v2）或 docker-compose（v1）"
fi

# 数据库服务必须在运行
RUNNING="$("${DC[@]}" ps --services --filter status=running 2>/dev/null || true)"
echo "$RUNNING" | grep -qx "$DB_SERVICE" \
  || die "服务 $DB_SERVICE 未运行。先在 $COMPOSE_DIR 执行：docker compose up -d"

# ---------------------------------------------------------------- 读取连接信息
# 不 source：.env 里的密码可能含 shell 特殊字符
env_value() {
  local key="$1" line
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE" | tail -n 1 || true)"
  printf '%s' "${line#*=}" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

DB_NAME="$(env_value DB_NAME)"; DB_NAME="${DB_NAME:-surveyking}"
DB_USER="$(env_value DB_USER)"; DB_USER="${DB_USER:-root}"
DB_PASSWORD="$(env_value DB_PASSWORD)"

mkdir -p "$OUTPUT_DIR" || die "无法创建输出目录：$OUTPUT_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ARCHIVE="$OUTPUT_DIR/backup_${TIMESTAMP}.tar.gz"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/xuri_backup.XXXXXX")"

cleanup() { rm -rf -- "$TMP_DIR"; }
trap cleanup EXIT

# ---------------------------------------------------------------- 1. 数据库
log "从容器 $DB_SERVICE 导出数据库 $DB_NAME（mysqldump 在容器内执行）"
# --no-tablespaces：非 root 账号没有 PROCESS 权限时 mysqldump 会报错，加它可避开
# --single-transaction + --quick：大表导出不锁表、不把整表读进内存
if ! "${DC[@]}" exec -T -e MYSQL_PWD="$DB_PASSWORD" "$DB_SERVICE" \
      mysqldump -u"$DB_USER" \
        --single-transaction --quick --routines --events --triggers \
        --no-tablespaces --default-character-set=utf8mb4 \
        --databases "$DB_NAME" \
      > "$TMP_DIR/db.sql"; then
  die "mysqldump 失败（检查 .env 里的 DB_PASSWORD 是否与容器实际密码一致）"
fi
[[ -s "$TMP_DIR/db.sql" ]] || die "db.sql 是空文件，备份中止"

# ---------------------------------------------------------------- 2. 附件
log "从容器 $APP_SERVICE 打包 /app/files 上传目录"
if "${DC[@]}" exec -T "$APP_SERVICE" tar -czf - -C /app files > "$TMP_DIR/files.tar.gz" 2>/dev/null; then
  [[ -s "$TMP_DIR/files.tar.gz" ]] || { rm -f "$TMP_DIR/files.tar.gz"; printf 'files directory empty\n' > "$TMP_DIR/files.missing"; }
else
  rm -f "$TMP_DIR/files.tar.gz" 2>/dev/null || true
  printf 'app container not running or /app/files missing\n' > "$TMP_DIR/files.missing"
  log "跳过附件打包（应用容器未运行或没有上传目录），归档内会记录 files.missing"
fi

# ---------------------------------------------------------------- 3. 脱敏 env
log "生成脱敏 .env（所有密钥打码）"
{
  echo "# .env 备份（密钥已打码，仅作参考；恢复时请用线上 .env）"
  sed -E 's/^([[:space:]]*(DB_PASSWORD|SK_CRYPTO_KEY|JWT_SECRET)[[:space:]]*=).*/\1***/' "$ENV_FILE"
} > "$TMP_DIR/app.env"

# ---------------------------------------------------------------- 4. manifest
{
  echo "created=$TIMESTAMP"
  echo "database=$DB_NAME"
  echo "compose_file=$COMPOSE_FILE"
  echo "db_service=$DB_SERVICE"
  echo "content_mode=docker compose exec"
  echo "contents=db.sql, files.tar.gz (if exists), app.env (secrets masked), manifest.txt"
  echo "restore=scripts/deploy/restore.sh（恢复前先 docker compose down；数据库恢复进 db 容器）"
} > "$TMP_DIR/manifest.txt"

log "生成归档 $ARCHIVE"
tar -czf "$ARCHIVE" -C "$TMP_DIR" .

# ---------------------------------------------------------------- 5. 保留策略
mapfile -t OLD_BACKUPS < <(ls -1t "$OUTPUT_DIR"/backup_*.tar.gz 2>/dev/null | tail -n +$((RETENTION + 1)))
if ((${#OLD_BACKUPS[@]} > 0)); then
  for old in "${OLD_BACKUPS[@]}"; do
    [[ -n "$old" ]] || continue
    log "清理旧备份：$(basename "$old")"
    rm -f -- "$old"
  done
fi

SIZE="$(du -h "$ARCHIVE" | cut -f1)"
log "备份完成：$ARCHIVE（$SIZE），保留 $RETENTION 份"
