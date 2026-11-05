#!/usr/bin/env bash
# =============================================================================
# Linux 备份脚本
#
# 用途：备份 MySQL 全库 + files 上传目录 + 脱敏 app.env，生成带时间戳的 tar.gz，
#       并按保留份数清理旧备份。
#
# 用法：
#   ./backup.sh
#   ./backup.sh --install-dir /opt/xuri-classroom --output ./backups --retention 7
#
# 参数：
#   --install-dir <dir>  安装目录，默认 /opt/xuri-classroom（含 app.env、files/）
#   --output <dir>       备份输出目录，默认 ./backups
#   --retention <n>      保留份数，默认 7
#   --env-file <file>    指定 app.env，默认 <install-dir>/app.env
#   --help               显示帮助
#
# 说明：
#   备份内 app.env 的 DB_PASSWORD 会被替换为 ***，仅作参考，恢复时不会覆盖线上配置。
# =============================================================================
set -euo pipefail

INSTALL_DIR="/opt/xuri-classroom"
OUTPUT_DIR="./backups"
RETENTION=7
ENV_FILE=""

usage() {
  sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'
}

die() {
  echo "[ERROR] $*" >&2
  exit 1
}

log() {
  echo "[INFO] $*"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-dir|--dir)
      [[ $# -ge 2 ]] || die "$1 需要目录参数"
      INSTALL_DIR="$2"
      shift 2
      ;;
    --output|--output-dir)
      [[ $# -ge 2 ]] || die "$1 需要目录参数"
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --retention)
      [[ $# -ge 2 ]] || die "$1 需要数字"
      RETENTION="$2"
      shift 2
      ;;
    --env-file)
      [[ $# -ge 2 ]] || die "$1 需要文件路径"
      ENV_FILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die "未知参数：$1（用 --help 查看用法）"
      ;;
    *)
      die "未知位置参数：$1"
      ;;
  esac
done

[[ "$RETENTION" =~ ^[1-9][0-9]*$ ]] || die "保留份数必须是正整数：$RETENTION"
ENV_FILE="${ENV_FILE:-$INSTALL_DIR/app.env}"
[[ -f "$ENV_FILE" ]] || die "找不到 app.env：$ENV_FILE"
[[ -d "$INSTALL_DIR" ]] || die "安装目录不存在：$INSTALL_DIR"

MYSQLDUMP_BIN="${MYSQLDUMP_BIN:-mysqldump}"
command -v "$MYSQLDUMP_BIN" >/dev/null 2>&1 || die "找不到 mysqldump，请安装 MySQL 客户端或设置 MYSQLDUMP_BIN"

set -a
# 不用 source：app.env 里的密码可能包含 shell 特殊字符
env_value() {
  local key="$1" line
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE" | tail -n 1 || true)"
  printf '%s' "${line#*=}" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}
DB_HOST="$(env_value DB_HOST)"
DB_PORT="$(env_value DB_PORT)"
DB_NAME="$(env_value DB_NAME)"
DB_USER="$(env_value DB_USER)"
DB_PASSWORD="$(env_value DB_PASSWORD)"
set +a

: "${DB_HOST:?app.env 缺少 DB_HOST}"
: "${DB_PORT:?app.env 缺少 DB_PORT}"
: "${DB_NAME:?app.env 缺少 DB_NAME}"
: "${DB_USER:?app.env 缺少 DB_USER}"

mkdir -p "$OUTPUT_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ARCHIVE="$OUTPUT_DIR/backup_${TIMESTAMP}.tar.gz"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/xuri_backup.XXXXXX")"

cleanup() {
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

log "导出数据库 $DB_NAME"
MYSQL_PWD="${DB_PASSWORD:-}" "$MYSQLDUMP_BIN" \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  --single-transaction \
  --routines \
  --events \
  --triggers \
  --databases "$DB_NAME" \
  > "$TMP_DIR/db.sql"

log "打包 files 上传目录"
if [[ -d "$INSTALL_DIR/files" ]]; then
  tar -czf "$TMP_DIR/files.tar.gz" -C "$INSTALL_DIR" files
else
  printf 'files directory not found: %s\n' "$INSTALL_DIR/files" > "$TMP_DIR/files.missing"
fi

log "生成脱敏 app.env"
{
  echo "# app.env backup (DB_PASSWORD masked; do not restore this file directly)"
  echo "# 恢复数据库/文件时使用线上 app.env 的连接信息。"
  sed -E 's/^([[:space:]]*DB_PASSWORD[[:space:]]*=).*/\1***/' "$ENV_FILE"
} > "$TMP_DIR/app.env"

{
  echo "created=$TIMESTAMP"
  echo "database=$DB_NAME"
  echo "db_host=$DB_HOST"
  echo "contents=db.sql, files.tar.gz (if exists), app.env (password masked), manifest.txt"
  echo "restore=restore.sh（恢复前先停服务）"
} > "$TMP_DIR/manifest.txt"

log "生成归档 $ARCHIVE"
tar -czf "$ARCHIVE" -C "$TMP_DIR" .

# 保留最新 N 份（文件名时间戳按字典序即时间序）
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
