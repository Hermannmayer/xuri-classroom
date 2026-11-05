#!/usr/bin/env bash
# =============================================================================
# Linux 卸载（systemd）
#
# 用途：停止并删除 systemd 服务；默认保留安装目录（app.env、files/ 等数据）。
#
# 用法：
#   sudo ./uninstall.sh
#   sudo ./uninstall.sh --install-dir /opt/xuri-classroom --service-name xuri-classroom
#   sudo ./uninstall.sh --purge        # 同时删除安装目录和运行用户
#
# 参数：
#   --install-dir <dir>    安装目录，默认 /opt/xuri-classroom
#   --user <name>          运行用户，默认 xuri（仅 --purge 时删除）
#   --service-name <name>  systemd 服务名，默认 xuri-classroom
#   --purge                删除安装目录和运行用户（数据库不会删除）
# =============================================================================
set -euo pipefail

INSTALL_DIR="/opt/xuri-classroom"
RUN_USER="xuri"
SERVICE_NAME="xuri-classroom"
PURGE=0

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
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
    --user)
      [[ $# -ge 2 ]] || die "$1 需要用户名"
      RUN_USER="$2"
      shift 2
      ;;
    --service-name)
      [[ $# -ge 2 ]] || die "$1 需要服务名"
      SERVICE_NAME="$2"
      shift 2
      ;;
    --purge)
      PURGE=1
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
      die "未知位置参数：$1"
      ;;
  esac
done

[[ "$EUID" -eq 0 ]] || die "请用 root 或 sudo 执行"
[[ "$INSTALL_DIR" = /* ]] || die "安装目录必须是绝对路径：$INSTALL_DIR"
[[ "$SERVICE_NAME" =~ ^[A-Za-z0-9_.@-]+$ ]] || die "服务名不合法：$SERVICE_NAME"

UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

if systemctl list-unit-files "${SERVICE_NAME}.service" >/dev/null 2>&1; then
  log "停止并禁用服务"
  systemctl stop "$SERVICE_NAME.service" 2>/dev/null || true
  systemctl disable "$SERVICE_NAME.service" 2>/dev/null || true
fi

if [[ -f "$UNIT_FILE" ]]; then
  log "删除 unit：$UNIT_FILE"
  rm -f "$UNIT_FILE"
else
  log "unit 不存在，跳过：$UNIT_FILE"
fi
systemctl daemon-reload

if [[ "$PURGE" -eq 1 ]]; then
  if [[ -d "$INSTALL_DIR" ]]; then
    log "删除安装目录：$INSTALL_DIR"
    rm -rf -- "$INSTALL_DIR"
  fi
  if id "$RUN_USER" >/dev/null 2>&1; then
    log "删除运行用户：$RUN_USER"
    userdel "$RUN_USER" 2>/dev/null || log "用户删除失败（可能有进程占用），请手动处理"
  fi
else
  log "已保留数据目录：$INSTALL_DIR"
  log "如需彻底删除：sudo $0 --purge"
fi

log "卸载完成（数据库数据未删除）"
