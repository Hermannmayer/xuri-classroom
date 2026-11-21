#!/usr/bin/env bash
# 旭日云课堂 · Docker 单独执行数据库结构迁移
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${XURI_HOME:-/opt/xuri-classroom}"
DRY_RUN=0

say()  { printf '[迁移] %s\n' "$*"; }
warn() { printf '[警告] %s\n' "$*" >&2; }
die()  { printf '[中止] %s\n' "$*" >&2; exit "${2:-1}"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --whatif|--dry-run) DRY_RUN=1; shift ;;
    -h|--help) sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "未知参数：$1" ;;
  esac
done

[[ -f "$INSTALL_DIR/.env" ]] || die "找不到 $INSTALL_DIR/.env —— 请用 --dir 指定安装目录（或在已安装的实例上运行）"
command -v docker >/dev/null 2>&1 || die "找不到 docker 命令"
docker info >/dev/null 2>&1 || die "docker 守护进程不可用（用 sudo）"

MIGRATION_DIR="$SCRIPT_DIR/migrations"
[[ -d "$MIGRATION_DIR" ]] || die "当前目录不是发布包（缺 migrations/）：$SCRIPT_DIR"

shopt -s nullglob
files=("$MIGRATION_DIR"/*.sql)
shopt -u nullglob
[[ ${#files[@]} -gt 0 ]] || die "migrations/ 里没有 SQL 文件"

dc() { ( cd "$INSTALL_DIR" && docker compose --env-file .env -f docker-compose.release.yml "$@" ); }

dc ps -q db >/dev/null 2>&1 || true
if [[ -z "$(dc ps -q db 2>/dev/null || true)" ]]; then
  die "数据库容器没有运行。先启动它：cd $INSTALL_DIR && docker compose --env-file .env -f docker-compose.release.yml up -d db"
fi

say "目标库：$INSTALL_DIR/.env"
say "脚本目录：$MIGRATION_DIR"
say "共 ${#files[@]} 个脚本"

if [[ $DRY_RUN -eq 1 ]]; then
  for f in "${files[@]}"; do say "将执行：$(basename "$f")"; done
  say "--whatif：没有做任何改动"
  exit 0
fi

if [[ -n "$(dc ps -q app 2>/dev/null || true)" ]]; then
  warn "应用容器还在运行。迁移期间最好停掉它，避免结构和写入打架："
  warn "  cd $INSTALL_DIR && docker compose --env-file .env -f docker-compose.release.yml stop app"
fi

for f in "${files[@]}"; do
  name="$(basename "$f")"
  say "执行 $name"
  if ! dc exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < "$f"; then
    die "$name 执行失败。库没有被删改（脚本是增量的），修好后再跑一次即可。"
  fi
done

say "全部完成。记录下来以便排查："
dc exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -B -e "SELECT version, applied_at, source FROM $MYSQL_DATABASE.t_schema_version ORDER BY applied_at DESC LIMIT 5;"' 2>/dev/null || true
