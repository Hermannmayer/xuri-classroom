#!/usr/bin/env bash
# 旭日云课堂发版准备脚本（Linux/macOS）。
# 本地只写版本、CHANGELOG、提交、打 tag；-p/--push 推到 GitHub 后由 Actions 构建并创建 Release。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
export PYTHONUTF8=1

PYTHON="${PYTHON:-python3}"
VERSION=""
BUMP="auto"
NOTES=""
PUSH=0
NO_TAG=0
DRY_RUN=0
ALLOW_DIRTY=0

usage() {
  sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
  cat <<'EOF'
用法：
  ./scripts/release/release.sh [选项]
  ./scripts/release/release.sh --version 2.1.0 --push
  ./scripts/release/release.sh --bump auto --dry-run

选项：
  --version <x.y.z>   显式版本；省略时按 --bump 计算
  --bump <auto|major|minor|patch|none>
  --notes <file>      用文件内容作为本版本 CHANGELOG 说明
  -p, --push          提交并打 tag 后 push 到 GitHub，触发 Release workflow
  --no-tag            只写版本文件，不提交、不打 tag
  --dry-run           只打印计划
  --allow-dirty       允许工作区有未提交改动
  -h, --help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="${2:?--version 需要值}"; shift 2 ;;
    --bump) BUMP="${2:?--bump 需要值}"; shift 2 ;;
    --notes) NOTES="${2:?--notes 需要值}"; shift 2 ;;
    -p|--push) PUSH=1; shift ;;
    --no-tag) NO_TAG=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数：$1" >&2; usage; exit 2 ;;
  esac
done

command -v "$PYTHON" >/dev/null 2>&1 || { echo "找不到 $PYTHON" >&2; exit 1; }

if [[ "$ALLOW_DIRTY" -eq 0 && -n "$(git status --porcelain)" ]]; then
  echo "工作区有未提交改动，先提交或加 --allow-dirty：" >&2
  git status --short >&2
  exit 1
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  "$PYTHON" scripts/release/release.py plan --bump "$BUMP"
  exit 0
fi

CURRENT="$(tr -d '[:space:]' < VERSION)"
if [[ -z "$VERSION" ]]; then
  VERSION="$("$PYTHON" scripts/release/release.py plan --bump "$BUMP" --print-version | tail -n 1)"
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "版本号不合法：$VERSION" >&2
  exit 1
fi

if [[ "$VERSION" != "$CURRENT" ]]; then
  BUMP_ARGS=(bump --version "$VERSION")
  if [[ -n "$NOTES" ]]; then
    BUMP_ARGS+=(--notes "$NOTES")
  fi
  "$PYTHON" scripts/release/release.py "${BUMP_ARGS[@]}"
else
  echo "VERSION 已经是 $VERSION，跳过 bump"
fi

"$PYTHON" scripts/release/release.py check

if [[ "$NO_TAG" -eq 1 ]]; then
  echo "已按 --no-tag 停下：版本文件已写，未提交、未打 tag。"
  exit 0
fi

"$PYTHON" scripts/release/release.py tag --version "$VERSION"

if [[ "$PUSH" -eq 1 ]]; then
  git push origin main
  git push origin "v$VERSION"
  echo "已推送 tag v$VERSION，GitHub Actions 将开始构建："
  echo "  https://github.com/Hermannmayer/xuri-classroom/actions/workflows/release.yml"
else
  echo "本地已提交并打 tag v$VERSION。推 GitHub 触发发版："
  echo "  git push origin main && git push origin v$VERSION"
fi
