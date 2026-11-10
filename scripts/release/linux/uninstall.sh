#!/usr/bin/env bash
# ============================================================
# 旭日云课堂 · Linux 卸载器
#
# 默认只停止并删除 systemd 服务，保留安装目录（含 app.env 与 files/ 上传文件）。
# --purge 才会删除安装目录和运行用户；数据库数据与备份永远需要手动处理。
#
# 用法：
#   sudo bash uninstall.sh
#   sudo bash uninstall.sh --purge          # 连安装目录和运行用户一起删
#   sudo bash uninstall.sh --install-dir /data/xuri-classroom --purge --yes
#
# 支持 bash；请勿使用 sh uninstall.sh。
# ============================================================
set -euo pipefail

SERVICE_NAME="xuri-classroom"
INSTALL_DIR="/opt/xuri-classroom"
RUN_USER="xuri"
UNIT_FILE="/etc/systemd/system/xuri-classroom.service"
PURGE=0
ASSUME_YES=0
INSTALL_DIR_SET=0
RUN_USER_SET=0

die() { printf '[错误] %s\n' "$*" >&2; exit 1; }
warn() { printf '[警告] %s\n' "$*" >&2; }
info() { printf '[信息] %s\n' "$*"; }
ok() { printf '[完成] %s\n' "$*"; }

usage() {
  cat <<'USAGE'
旭日云课堂 · Linux 卸载器

用法：
  sudo bash uninstall.sh [选项]

选项：
  --install-dir <目录>   安装目录，默认 /opt/xuri-classroom
                         （未指定时尝试从 systemd unit 里读取）
  --user <用户名>        运行用户，默认 xuri（仅 --purge 时删除）
  --purge                同时删除安装目录与运行用户（数据库不会被删除）
  --yes, -y              不询问确认（配合 --purge 使用）
  --help, -h             显示本帮助

说明：
  · 默认只卸载服务，保留安装目录和上传文件；
  · 数据库、数据库用户、备份文件都不在本脚本处理范围内；
  · 彻底清理数据请先备份，再手动删除数据库与备份。
USAGE
}

parse_args() {
  local a
  if [[ $# -gt 0 ]]; then
    local -a normalized=()
    for a in "$@"; do
      case "$a" in
        --*=*) normalized+=("${a%%=*}" "${a#*=}") ;;
        *) normalized+=("$a") ;;
      esac
    done
    if [[ ${#normalized[@]} -gt 0 ]]; then
      set -- "${normalized[@]}"
    else
      set --
    fi
  fi

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --install-dir)
        [[ $# -ge 2 ]] || die "--install-dir 需要目录"
        INSTALL_DIR="$2"; INSTALL_DIR_SET=1; shift 2 ;;
      --user)
        [[ $# -ge 2 ]] || die "--user 需要用户名"
        RUN_USER="$2"; RUN_USER_SET=1; shift 2 ;;
      --purge) PURGE=1; shift ;;
      --yes|-y) ASSUME_YES=1; shift ;;
      --help|-h) usage; exit 0 ;;
      --) shift; break ;;
      -*) die "未知参数：$1（用 --help 查看用法）" ;;
      *) die "不支持位置参数：$1（用 --help 查看用法）" ;;
    esac
  done

  if [[ $# -gt 0 ]]; then
    die "不支持位置参数：$1（用 --help 查看用法）"
  fi
}

detect_from_unit() {
  if [[ -f "$UNIT_FILE" ]]; then
    local v
    if [[ $INSTALL_DIR_SET -eq 0 ]]; then
      v=$(sed -n 's/^WorkingDirectory=//p' "$UNIT_FILE" | head -n 1)
      if [[ -n "$v" ]]; then INSTALL_DIR="$v"; fi
    fi
    if [[ $RUN_USER_SET -eq 0 ]]; then
      v=$(sed -n 's/^User=//p' "$UNIT_FILE" | head -n 1)
      if [[ -n "$v" ]]; then RUN_USER="$v"; fi
    fi
  fi
}

normalize_install_dir() {
  if [[ -z "$INSTALL_DIR" ]]; then
    die "安装目录不能为空"
  fi
  if [[ "$INSTALL_DIR" != /* ]]; then
    die "安装目录必须是绝对路径：$INSTALL_DIR"
  fi
  case "$INSTALL_DIR" in
    *$'\n'*|*$'\r'*) die "安装目录不能包含换行：$INSTALL_DIR" ;;
  esac
  if command -v readlink >/dev/null 2>&1; then
    INSTALL_DIR=$(readlink -m -- "$INSTALL_DIR" 2>/dev/null || printf '%s' "$INSTALL_DIR")
  fi
  while [[ "$INSTALL_DIR" == */ && "$INSTALL_DIR" != "/" ]]; do
    INSTALL_DIR="${INSTALL_DIR%/}"
  done
}

is_protected_user() {
  case "$1" in
    ""|root|daemon|bin|sys|sync|games|man|lp|mail|news|uucp|proxy|www-data|backup|list|irc|_apt|nobody|messagebus|systemd-network|systemd-resolve|sshd)
      return 0 ;;
  esac
  return 1
}

stop_and_remove_unit() {
  if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet "$SERVICE_NAME.service" 2>/dev/null; then
      info "停止服务：$SERVICE_NAME.service"
      systemctl stop "$SERVICE_NAME.service" || warn "停止服务失败，可能已经在停止中"
    else
      info "服务当前未运行：$SERVICE_NAME.service"
    fi
    if systemctl is-enabled --quiet "$SERVICE_NAME.service" 2>/dev/null; then
      systemctl disable "$SERVICE_NAME.service" >/dev/null 2>&1 || warn "取消开机自启失败"
      ok "已取消开机自启"
    fi
  else
    info "系统没有 systemctl，跳过服务停止"
  fi

  if [[ -f "$UNIT_FILE" ]]; then
    rm -f -- "$UNIT_FILE" || die "删除 unit 失败：$UNIT_FILE"
    ok "已删除 systemd 服务文件：$UNIT_FILE"
  else
    info "systemd 服务文件不存在，跳过：$UNIT_FILE"
  fi

  if command -v systemctl >/dev/null 2>&1; then
    systemctl daemon-reload 2>/dev/null || true
  fi
}

purge_files() {
  if [[ $ASSUME_YES -eq 0 ]]; then
    if [[ ! -t 0 ]]; then
      die "非交互终端执行 --purge 需要加 --yes 确认"
    fi
    printf '将删除安装目录 %s 和运行用户 %s（数据库不会被删除）。确认继续？[y/N] ' "$INSTALL_DIR" "$RUN_USER"
    local answer
    read -r answer || die "已取消"
    case "$answer" in
      y|Y|yes|YES) ;;
      *) die "已取消" ;;
    esac
  fi

  case "$INSTALL_DIR" in
    /|/bin|/boot|/dev|/etc|/home|/lib|/lib64|/opt|/proc|/root|/run|/sbin|/srv|/sys|/tmp|/usr|/var)
      die "拒绝删除系统目录：$INSTALL_DIR" ;;
  esac

  if [[ -d "$INSTALL_DIR" ]]; then
    info "删除安装目录：$INSTALL_DIR"
    rm -rf -- "$INSTALL_DIR" || die "删除安装目录失败：$INSTALL_DIR"
    ok "安装目录已删除"
  else
    info "安装目录不存在，跳过：$INSTALL_DIR"
  fi

  if id "$RUN_USER" >/dev/null 2>&1; then
    if is_protected_user "$RUN_USER"; then
      warn "运行用户 $RUN_USER 是系统内置账号，拒绝删除"
    else
      local uid
      uid=$(id -u "$RUN_USER")
      if [[ "$uid" == "0" ]]; then
        warn "运行用户 $RUN_USER 的 UID 为 0，拒绝删除"
      else
        info "删除运行用户：$RUN_USER"
        userdel "$RUN_USER" 2>/dev/null || warn "删除用户失败（可能有进程占用），请手动执行：userdel $RUN_USER"
      fi
    fi
  else
    info "运行用户不存在，跳过：$RUN_USER"
  fi
}

main() {
  parse_args "$@"
  if [[ $EUID -ne 0 ]]; then
    die "请用 root 或 sudo 执行：sudo bash $0 --help 查看用法"
  fi
  detect_from_unit
  normalize_install_dir

  if [[ ! -f "$UNIT_FILE" && ! -d "$INSTALL_DIR" ]]; then
    info "没有发现安装痕迹：$UNIT_FILE 与 $INSTALL_DIR 都不存在，无需卸载。"
    exit 0
  fi

  info "卸载旭日云课堂：服务 $SERVICE_NAME.service，安装目录 $INSTALL_DIR"
  stop_and_remove_unit

  if [[ $PURGE -eq 1 ]]; then
    purge_files
  else
    ok "服务已卸载；安装目录与数据已保留：$INSTALL_DIR"
    printf '如需彻底删除安装目录和运行用户：sudo bash %s --install-dir %q --user %q --purge\n' "$0" "$INSTALL_DIR" "$RUN_USER"
  fi

  printf '\n提示：数据库、数据库用户与备份文件不会被本脚本删除，请按需手动清理。\n'
  ok "卸载完成"
}

if [[ "${BASH_SOURCE[0]:-}" == "$0" ]]; then
  main "$@"
fi
