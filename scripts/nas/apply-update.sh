#!/usr/bin/env bash
# 应用 Web 界面下载好的更新包。
set -euo pipefail

DATA_DIR="${XURI_DATA_DIR:-/vol2/1000/xuri/live}"
SRC="$DATA_DIR/files/update"
FLAG="$SRC/apply.flag"
JAR="$SRC/app.jar"
BUILD="$DATA_DIR/build/app.jar"
COMPOSE_DIR="$(cd "$(dirname "$0")/../../deploy/nas/live" && pwd)"

if [ ! -f "$FLAG" ]; then
  echo "没有待应用的更新（$FLAG 不存在）"
  exit 0
fi

if [ "${1:-}" = "--check" ]; then
  echo "待应用：$(cat "$FLAG" | tr '\n' ' ')"
  exit 0
fi

if [ ! -f "$JAR" ]; then
  echo "缺少更新包：$JAR" >&2
  exit 1
fi

VERSION=$(grep -m1 '^version=' "$FLAG" | cut -d= -f2)
WANT_SHA=$(grep -m1 '^sha256=' "$FLAG" | cut -d= -f2)
ACTUAL_SHA=$(sha256sum "$JAR" | cut -d' ' -f1)

if [ -n "$WANT_SHA" ] && [ "$ACTUAL_SHA" != "$WANT_SHA" ]; then
  echo "sha256 不符：期望 $WANT_SHA，实际 $ACTUAL_SHA —— 拒绝应用" >&2
  exit 1
fi

if [ ! -f "$BUILD" ]; then
  echo "找不到正在用的 jar：$BUILD" >&2
  exit 1
fi

BACKUP="$BUILD.bak-$(date +%Y%m%d%H%M%S)"
cp -p "$BUILD" "$BACKUP"
cp -f "$JAR" "$BUILD"
rm -f "$FLAG" "$JAR"

cd "$COMPOSE_DIR"
docker compose restart app
echo "已应用版本 $VERSION；旧包备份在 $BACKUP"
