#!/usr/bin/env bash
# ======
# 旭日云课堂 · Linux 单独执行数据库结构迁移
#
# 什么时候用：应用起不来、日志里是 Unknown column / 表不存在，想先把库结构补齐再说。
# **正常升级不需要跑它** —— upgrade.sh 启动服务时会自动迁移。
#
# 它做什么：把本包 migrations/ 下的所有 SQL 按文件名顺序、对着 app.env 指向的库执行一遍。
# 每个脚本都是幂等的（先查 information_schema，已存在就跳过），重复执行安全。
#
# 用法：
#   sudo bash migrate.sh
#   sudo bash migrate.sh --dir /opt/xuri-classroom
#   sudo bash migrate.sh --whatif
# ======
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
    -h|--help) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "未知参数：$1" ;;
  esac
done

[[ -f "$INSTALL_DIR/app.env" ]] || die "找不到 $INSTALL_DIR/app.env —— 请用 --dir 指定安装目录"
MIGRATION_DIR="$SCRIPT_DIR/migrations"
[[ -d "$MIGRATION_DIR" ]] || die "当前目录不是发布包（缺 migrations/）：$SCRIPT_DIR"
command -v mysql >/dev/null 2>&1 || die "找不到 mysql 客户端（apt install mysql-client / dnf install mysql）"

env_get() {
  local file="$1" key="$2" value
  value=$(KEY="$key" awk -F= 'BEGIN{k=ENVIRON["KEY"]} $1==k{sub(/^[^=]*=/,"");print;exit}' "$file" 2>/dev/null || true)
  value=${value%$'\r'}
  case "$value" in \'*\') value=${value#\'}; value=${value%\'} ;; \"*\") value=${value#\"}; value=${value%\"} ;; esac
  printf '%s' "$value"
}

DB_HOST="$(env_get "$INSTALL_DIR/app.env" DB_HOST)"; DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(env_get "$INSTALL_DIR/app.env" DB_PORT)"; DB_PORT="${DB_PORT:-3306}"
DB_NAME="$(env_get "$INSTALL_DIR/app.env" DB_NAME)"; DB_NAME="${DB_NAME:-surveyking}"
DB_USER="$(env_get "$INSTALL_DIR/app.env" DB_USER)"; DB_USER="${DB_USER:-root}"
DB_PASS="$(env_get "$INSTALL_DIR/app.env" DB_PASSWORD)"

shopt -s nullglob
files=("$MIGRATION_DIR"/*.sql)
shopt -u nullglob
[[ ${#files[@]} -gt 0 ]] || die "migrations/ 里没有 SQL 文件"

say "目标库：$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
say "共 ${#files[@]} 个脚本"

if [[ $DRY_RUN -eq 1 ]]; then
  for f in "${files[@]}"; do say "将执行：$(basename "$f")"; done
  say "--whatif：没有做任何改动"
  exit 0
fi

if systemctl is-active --quiet xuri-classroom 2>/dev/null; then
  warn "服务还在运行。迁移期间最好先停：sudo systemctl stop xuri-classroom"
fi

for f in "${files[@]}"; do
  name="$(basename "$f")"
  say "执行 $name"
  if ! MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --default-character-set=utf8mb4 "$DB_NAME" < "$f"; then
    die "$name 执行失败。库没有被删改（脚本是增量的），修好后再跑一次即可。"
  fi
done

say "全部完成。最近的迁移记录："
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -N -B "$DB_NAME" \
  -e "SELECT version, applied_at, source FROM t_schema_version ORDER BY applied_at DESC LIMIT 5;" 2>/dev/null || true
