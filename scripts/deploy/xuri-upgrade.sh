#!/usr/bin/env bash
# ======
# 旭日云课堂 · Docker 一条命令升级（引导器）
#
# 它解决的是"不懂的人也能升级"：不用先下载、不用解压、不用 cd——
#   curl -fsSL https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/scripts/deploy/xuri-upgrade.sh | sudo bash
#
# 它自己完成：
#   1. 找到已安装实例（默认 /opt/xuri-classroom，或 --dir 指定）
#   2. 确定目标版本：--version 指定，否则查 GitHub Releases 最新
#   3. 拿到发布包：--from 指定本地 tar.gz，否则从 Release 下载
#   4. 校验 SHA256（下载 SHA256SUMS 比对）
#   5. 解压到临时目录，调用包里的 upgrade.sh（备份→构建→切换→校验→回滚）
#   6. 清理临时文件
#
# 用法：
#   curl -fsSL <本脚本地址> | sudo bash
#   sudo bash xuri-upgrade.sh --dir /data/xuri-classroom
#   sudo bash xuri-upgrade.sh --version 2.1.1
#   sudo bash xuri-upgrade.sh --from /tmp/xuri-classroom-2.1.1-docker.tar.gz
#   sudo bash xuri-upgrade.sh --whatif          # 只打印计划
#   sudo bash xuri-upgrade.sh --yes             # 免确认（curl|bash 时自动开启）
#
# 环境变量（国内网络可换源）：
#   XURI_REPO=Hermannmayer/xuri-classroom
#   XURI_GITHUB_API=https://api.github.com
#   XURI_DOWNLOAD_BASE=https://github.com   # 只换下载域名时用
#
# 安全约定：只下载官方 Release 资产并校验 SHA256；解压后调用包内 upgrade.sh，
#          由它负责备份、停服、切换、校验、回滚。本脚本不直接动数据库和容器。
# ======
set -uo pipefail

INSTALL_DIR="${XURI_HOME:-/opt/xuri-classroom}"
REPO="${XURI_REPO:-Hermannmayer/xuri-classroom}"
API_BASE="${XURI_GITHUB_API:-https://api.github.com}"
DOWNLOAD_BASE="${XURI_DOWNLOAD_BASE:-https://github.com}"
TARGET_VERSION=""
PKG_PATH=""
DRY_RUN=0
ASSUME_YES=0
WORKDIR=""

# curl | bash 时 stdin 不是终端，不能交互；自动按"确认"处理（会先打印计划）
if [[ ! -t 0 ]]; then ASSUME_YES=1; fi

c_red=$'\033[31m'; c_grn=$'\033[32m'; c_ylw=$'\033[33m'; c_cya=$'\033[36m'; c_rst=$'\033[0m'
say()  { printf '%s[升级]%s %s\n' "$c_cya" "$c_rst" "$*"; }
ok()   { printf '%s[完成]%s %s\n' "$c_grn" "$c_rst" "$*"; }
warn() { printf '%s[警告]%s %s\n' "$c_ylw" "$c_rst" "$*" >&2; }
die()  { printf '%s[中止]%s %s\n' "$c_red" "$c_rst" "$*" >&2; exit "${2:-1}"; }

usage() { sed -n '2,34p' "$0" | sed 's/^# \{0,1\}//'; }

cleanup() {
  if [[ -n "$WORKDIR" && -d "$WORKDIR" ]]; then rm -rf "$WORKDIR"; fi
}
trap cleanup EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --version) TARGET_VERSION="${2#v}"; shift 2 ;;
    --from) PKG_PATH="$2"; shift 2 ;;
    --whatif|--dry-run) DRY_RUN=1; shift ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "未知参数：$1（用 --help 查看用法）" ;;
  esac
done

# ---------- 前置检查
need() { command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1（请先安装）"; }
need tar
if [[ -z "$PKG_PATH" ]]; then need curl; fi

[[ $EUID -eq 0 ]] || die "请用 root 或 sudo 执行"
[[ -d "$INSTALL_DIR" ]] || die "找不到安装目录：$INSTALL_DIR（用 --dir 指定；全新部署请按 README 用 docker compose）"
[[ -f "$INSTALL_DIR/docker-compose.release.yml" && -f "$INSTALL_DIR/.env" ]] || {
  cat >&2 <<EOF
${c_ylw}$INSTALL_DIR 看起来不是 Docker 部署目录。${c_rst}
  全新部署请按发布包 README 的步骤：docker compose --env-file .env -f docker-compose.release.yml up -d
  已安装在别处请加：--dir <安装目录>
EOF
  exit 2
}
command -v docker >/dev/null 2>&1 || die "找不到 docker 命令"
docker info >/dev/null 2>&1 || die "docker 守护进程不可用（用 sudo）"

CURRENT_VERSION="$(sed -n 's/^VERSION=//p' "$INSTALL_DIR/.env" | tr -d '\r' | tail -n1)"
say "安装目录：$INSTALL_DIR"
say "当前版本：${CURRENT_VERSION:-未知（.env 里没有 VERSION）}"

# ---------- 确定版本
if [[ -z "$TARGET_VERSION" && -n "$PKG_PATH" ]]; then
  # 本地包：优先从文件名解析，其次读包内 VERSION（离线场景绝不联网查版本）
  base="$(basename "$PKG_PATH")"
  if [[ "$base" =~ xuri-classroom-([0-9]+\.[0-9]+\.[0-9]+)-docker\.tar\.gz ]]; then
    TARGET_VERSION="${BASH_REMATCH[1]}"
  else
    entry="$(tar -tzf "$PKG_PATH" 2>/dev/null | grep -E '/VERSION$' | head -n1 || true)"
    if [[ -n "$entry" ]]; then
      TARGET_VERSION="$(tar -xzOf "$PKG_PATH" "$entry" 2>/dev/null | tr -d ' \r\n' | head -n1 || true)"
    fi
  fi
  [[ -n "$TARGET_VERSION" ]] || die "无法从本地包确定版本：$PKG_PATH（包内缺 VERSION，且文件名不含版本号）"
fi
if [[ -z "$TARGET_VERSION" ]]; then
  say "查询 GitHub 最新 Release…"
  latest_json="$(curl -fsSL --max-time 10 -H 'Accept: application/vnd.github+json' -H 'User-Agent: xuri-upgrade' \
    "$API_BASE/repos/$REPO/releases/latest" 2>/dev/null || true)"
  if [[ -n "$latest_json" ]]; then
    TARGET_VERSION="$(printf '%s' "$latest_json" | grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 | sed 's/.*"\([^"]*\)"$/\1/' | sed 's/^v//')"
  fi
fi
[[ -n "$TARGET_VERSION" ]] || die "无法确定目标版本：GitHub 连不上，且没给 --version / --from。
  离线升级：先下载 `xuri-classroom-<版本>-docker.tar.gz`，再运行
    sudo bash <本脚本> --from /path/to/xuri-classroom-<版本>-docker.tar.gz"

say "目标版本：$TARGET_VERSION"

# 版本比较：已是最新就提示（不自动 --force）
if [[ -n "$CURRENT_VERSION" && "$CURRENT_VERSION" == "$TARGET_VERSION" ]]; then
  warn "当前已经是 $CURRENT_VERSION。要重装请直接跑包内 upgrade.sh --force"
  exit 2
fi

# ---------- 准备发布包
if [[ -z "$PKG_PATH" ]]; then
  PKG_NAME="xuri-classroom-$TARGET_VERSION-docker.tar.gz"
  PKG_URL="$DOWNLOAD_BASE/$REPO/releases/download/v$TARGET_VERSION/$PKG_NAME"
  SUMS_URL="$DOWNLOAD_BASE/$REPO/releases/download/v$TARGET_VERSION/SHA256SUMS"
  WORKDIR="$(mktemp -d)"
  PKG_PATH="$WORKDIR/$PKG_NAME"

  say "下载：$PKG_URL"
  if ! curl -fL --retry 3 --connect-timeout 15 --max-time 600 -o "$PKG_PATH" "$PKG_URL"; then
    die "下载失败。国内网络常见，可换下载源或手动下载后重跑：
    sudo bash <本脚本> --from /path/to/$PKG_NAME
  （XURI_DOWNLOAD_BASE 可指向镜像站）"
  fi

  say "校验 SHA256…"
  if curl -fsSL --max-time 30 -o "$WORKDIR/SHA256SUMS" "$SUMS_URL" 2>/dev/null; then
    expected="$(grep " $PKG_NAME\$" "$WORKDIR/SHA256SUMS" | awk '{print $1}' | head -n1)"
    if [[ -n "$expected" ]]; then
      actual="$(sha256sum "$PKG_PATH" | awk '{print $1}')"
      if [[ "$expected" != "$actual" ]]; then
        die "SHA256 校验失败（期望 $expected，实际 $actual），文件可能被篡改或下载不完整。"
      fi
      ok "SHA256 校验通过"
    else
      warn "SHA256SUMS 里没有 $PKG_NAME，跳过校验"
    fi
  else
    warn "下载 SHA256SUMS 失败，跳过校验（仍会解压后交给 upgrade.sh 校验版本）"
  fi
else
  [[ -f "$PKG_PATH" ]] || die "找不到发布包：$PKG_PATH"
  say "使用本地包：$PKG_PATH"
  WORKDIR="$(mktemp -d)"
fi

# ---------- 解压 + 调用包内 upgrade.sh
say "解压到临时目录…"
if ! tar -xzf "$PKG_PATH" -C "$WORKDIR"; then
  die "解压失败：$PKG_PATH（文件可能不完整）"
fi
PKG_DIR="$(find "$WORKDIR" -maxdepth 1 -type d -name 'xuri-classroom-*-docker' | head -n1)"
[[ -n "$PKG_DIR" && -f "$PKG_DIR/upgrade.sh" ]] || die "发布包里没有 upgrade.sh，包不完整：$PKG_PATH"

ARGS=(--dir "$INSTALL_DIR")
[[ $DRY_RUN -eq 1 ]] && ARGS+=(--whatif)
[[ $ASSUME_YES -eq 1 ]] && ARGS+=(--yes)

say "交给包内 upgrade.sh 执行（备份 → 构建 → 切换 → 校验 → 回滚）"
if bash "$PKG_DIR/upgrade.sh" "${ARGS[@]}"; then
  ok "升级完成：$CURRENT_VERSION → $TARGET_VERSION"
  exit 0
else
  code=$?
  die "升级未成功（退出码 $code）。备份与回滚信息见上面输出；日志在 $INSTALL_DIR/logs/ 下。" "$code"
fi
