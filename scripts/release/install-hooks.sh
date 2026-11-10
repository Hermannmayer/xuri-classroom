#!/usr/bin/env bash
# 安装仓库自带的 git hooks。
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE="$ROOT/.githooks/commit-msg"
TARGET="$ROOT/.git/hooks/commit-msg"
[[ -f "$SOURCE" ]] || { echo "找不到 $SOURCE" >&2; exit 1; }
[[ -d "$ROOT/.git/hooks" ]] || { echo "当前目录不是 git 仓库" >&2; exit 1; }
cp "$SOURCE" "$TARGET"
chmod +x "$TARGET"
echo "已安装 commit-msg hook：$TARGET"
