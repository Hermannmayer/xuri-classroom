#!/usr/bin/env bash
# ======
# 旭日云课堂 · Docker 一键升级
#
# 用法（在服务器上执行，需要 root）：
#   curl -fsSL https://raw.githubusercontent.com/Hermannmayer/xuri-classroom/main/scripts/deploy/docker-one-line-upgrade.sh | sudo bash
#   curl -fsSL ... | sudo VERSION=2.1.2 bash
#
# 可选环境变量：
#   VERSION                 目标版本，默认 latest（从 GitHub Releases 取最新 tag）
#   XURI_HOME               已安装目录，默认 /opt/xuri-classroom
#   XURI_GITHUB_REPO        GitHub 仓库，默认 Hermannmayer/xuri-classroom
#   XURI_GITHUB_API_BASE    GitHub API 前缀，默认 https://api.github.com
#   XURI_DOWNLOAD_BASE      下载前缀，默认 https://github.com/<repo>/releases/download
#
# 说明：
#   · 只下载并执行官方 Docker 发布包里的 upgrade.sh，不重复实现备份/迁移/回滚
#   · upgrade.sh 会先备份数据库、附件和 .env，再构建新镜像并启动
#   · 不会执行 docker compose down -v，不会删除任何数据卷
# ======
set -euo pipefail

REPO="${XURI_GITHUB_REPO:-Hermannmayer/xuri-classroom}"
VERSION="${VERSION:-latest}"
INSTALL_DIR="${XURI_HOME:-/opt/xuri-classroom}"
API_BASE="${XURI_GITHUB_API_BASE:-https://api.github.com}"
DOWNLOAD_BASE="${XURI_DOWNLOAD_BASE:-https://github.com/${REPO}/releases/download}"

die() { printf '[错误] %s\n' "$*" >&2; exit 1; }
info() { printf '[信息] %s\n' "$*"; }

[[ ${EUID:-$(id -u)} -eq 0 ]] || die "请用 root 或 sudo 执行"
command -v curl >/dev/null 2>&1 || die "需要 curl，请先安装（apt install curl / dnf install curl）"
command -v tar >/dev/null 2>&1 || die "需要 tar"
command -v docker >/dev/null 2>&1 || die "未检测到 docker"
docker info >/dev/null 2>&1 || die "docker 守护进程不可用，请先启动 docker"
docker compose version >/dev/null 2>&1 || die "需要 Docker Compose v2（docker compose 子命令）"

if [[ "$VERSION" == "latest" ]]; then
  info "读取最新版本..."
  VERSION="$(curl -fsSL --retry 3 --connect-timeout 15 "$API_BASE/repos/$REPO/releases/latest" \
    | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"v\{0,1\}\([^"]*\)".*/\1/p' | head -n1)"
  [[ -n "$VERSION" ]] || die "无法读取最新版本；请显式指定 VERSION=<版本号>"
fi

VERSION="${VERSION#v}"
[[ "$VERSION" =~ ^[A-Za-z0-9._-]+$ ]] || die "VERSION 不合法：$VERSION"
ASSET="xuri-classroom-${VERSION}-docker.tar.gz"
URL="${DOWNLOAD_BASE}/v${VERSION}/${ASSET}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf -- "$TMP_DIR"' EXIT

info "下载：$URL"
curl -fL --retry 3 --connect-timeout 15 --max-time 600 -o "$TMP_DIR/$ASSET" "$URL" \
  || die "下载失败。请确认该版本存在 Docker 发布包：$URL"

info "解压发布包..."
tar -xzf "$TMP_DIR/$ASSET" -C "$TMP_DIR"
UPGRADE_SH="$(find "$TMP_DIR" -maxdepth 3 -type f -name upgrade.sh | head -n1)"
[[ -n "$UPGRADE_SH" ]] || die "发布包里找不到 upgrade.sh"
PKG_DIR="$(dirname "$UPGRADE_SH")"

info "安装目录：$INSTALL_DIR"
info "目标版本：$VERSION"
info "开始升级（会先备份数据库、附件和 .env）..."
cd "$PKG_DIR"
bash "$UPGRADE_SH" --dir "$INSTALL_DIR" --yes
