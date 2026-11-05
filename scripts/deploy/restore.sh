#!/usr/bin/env bash
# =============================================================================
# Linux 恢复脚本
#
# 用途：从 backup_*.tar.gz 恢复 MySQL 全库和 files 上传目录；恢复前先停止服务。
#       备份中的 app.env 是脱敏副本，不会覆盖线上 app.env。
#
# 用法：
#   sudo ./restore.sh ./backups/backup_20261106_003000.tar.gz
#   sudo ./restore.sh <备份文件或已解压目录> --install-dir /opt/xuri-classroom --yes
#
# 参数：
#   <backup>               必填，backup_*.tar.gz 或已解压目录（含 db.sql）
#   --install-dir <dir>    安装目录，默认 /opt/xuri-classroom
#   --service-name <name>  systemd 服务名，默认 xuri-classroom
#   --yes                  跳过交互确认（自动化用）
#   --help                 显示帮助
#
# 警告：数据库是覆盖式恢复，请确认选对备份。
# =============================================================================
set -euo pipefail

BACKUP_PATH=""
INSTALL_DIR="/opt/xuri-classroom"
SERVICE_NAME="xuri-classroom"
ASSUME_YES=0

usage() {
  sed -n '2,23p' "$0" | sed 's/^# \{0,1\}//'
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
    --service-name)
      [[ $# -ge 2 ]] || die "$1 需要服务名"
      SERVICE_NAME="$2"
      shift 2
      ;;
    --yes|-y)
      ASSUME_YES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die "未知参数：$1（用 --help 查看用法）"
      ;;
    *)
      [[ -z "$BACKUP_PATH" ]] || die "只能指定一个备份路径"
      BACKUP_PATH="$1"
      shift
      ;;
  esac
done

[[ -n "$BACKUP_PATH" ]] || { usage; die "缺少备份路径"; }
[[ "$EUID" -eq 0 ]] || die "请用 root 或 sudo 执行"
[[ "$INSTALL_DIR" = /* ]] || die "安装目录必须是绝对路径：$INSTALL_DIR"
[[ "$SERVICE_NAME" =~ ^[A-Za-z0-9_.@-]+$ ]] || die "服务名不合法：$SERVICE_NAME"

ENV_FILE="$INSTALL_DIR/app.env"
[[ -f "$ENV_FILE" ]] || die "找不到线上 app.env：$ENV_FILE"
MYSQL_BIN="${MYSQL_BIN:-mysql}"
command -v "$MYSQL_BIN" >/dev/null 2>&1 || die "找不到 mysql，请安装 MySQL 客户端或设置 MYSQL_BIN"

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

TMP_DIR=""
SOURCE_DIR=""
cleanup() {
  if [[ -n "$TMP_DIR" ]]; then
    rm -rf -- "$TMP_DIR"
  fi
}
trap cleanup EXIT

if [[ -d "$BACKUP_PATH" ]]; then
  SOURCE_DIR="$(readlink -f "$BACKUP_PATH")"
elif [[ -f "$BACKUP_PATH" && "$BACKUP_PATH" == *.tar.gz ]]; then
  TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/xuri_restore.XXXXXX")"
  tar -xzf "$BACKUP_PATH" -C "$TMP_DIR"
  SOURCE_DIR="$TMP_DIR"
else
  die "不支持的备份：$BACKUP_PATH（请传 backup_*.tar.gz 或已解压目录）"
fi

[[ -f "$SOURCE_DIR/db.sql" ]] || die "备份中缺少 db.sql：$SOURCE_DIR"

if [[ "$ASSUME_YES" -ne 1 ]]; then
  echo "即将停止服务 $SERVICE_NAME，并用以下备份覆盖数据库 $DB_NAME："
  echo "  $BACKUP_PATH"
  read -r -p "确认继续？输入 yes 继续: " answer
  [[ "$answer" =~ ^(y|yes)$ ]] || die "用户取消恢复"
fi

UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SERVICE_EXISTS=0
if [[ -f "$UNIT_FILE" ]]; then
  SERVICE_EXISTS=1
fi

if [[ "$SERVICE_EXISTS" -eq 1 ]]; then
  log "停止服务 $SERVICE_NAME"
  systemctl stop "$SERVICE_NAME.service" 2>/dev/null || true
fi

log "恢复数据库 $DB_NAME"
MYSQL_PWD="${DB_PASSWORD:-}" "$MYSQL_BIN" \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  < "$SOURCE_DIR/db.sql"

if [[ -f "$SOURCE_DIR/files.tar.gz" ]]; then
  log "恢复 files 上传目录"
  tar -xzf "$SOURCE_DIR/files.tar.gz" -C "$INSTALL_DIR"
elif [[ -f "$SOURCE_DIR/files.missing" ]]; then
  log "备份中没有 files 上传目录（files.missing），跳过"
else
  log "备份中没有 files.tar.gz，跳过文件恢复"
fi

log "备份中的 app.env 是脱敏副本，未覆盖线上 app.env；如连接信息有误请手动修改"

if [[ "$SERVICE_EXISTS" -eq 1 ]]; then
  log "启动服务 $SERVICE_NAME"
  systemctl start "$SERVICE_NAME.service"
  systemctl is-active --quiet "$SERVICE_NAME.service" && log "恢复完成，服务运行中" || log "恢复完成，但服务未运行，请检查 journalctl -u $SERVICE_NAME"
else
  log "恢复完成（未找到 $UNIT_FILE，未自动启动服务）"
fi
