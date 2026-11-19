#!/usr/bin/env bash
# 应用 Web 界面下载好的更新包。
#
# 为什么需要它：应用跑在容器里，/app/app.jar 是只读 bind mount，进程没法替换自己的 jar，
# 更没法重启自己的容器。所以 Web 端只负责「下载 + 校验 + 落盘 + 写标记」，
# 真正的替换/重启由这份脚本在宿主机执行。
#
# 用法：
#   bash scripts/nas/apply-update.sh            # 有标记就应用，没有就什么都不做
#   bash scripts/nas/apply-update.sh --check    # 只看有没有待应用的更新
#
# 想让它全自动：装一条 cron，每 2 分钟跑一次（内容自己核对后再装）
#   */2 * * * * /vol2/1000/xuri/src/work/scripts/nas/apply-update.sh >> /vol2/1000/xuri/live/update-apply.log 2>&1
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
