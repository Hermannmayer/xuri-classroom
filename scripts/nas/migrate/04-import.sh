#!/usr/bin/env bash
# =============================================================================
# 第 4 步：建 MySQL 库 + 灌入 H2 的数据（在飞牛 NAS 上执行）
#
# 顺序：生成 .env（含随机密钥）→ 起 db 容器 → 空库闸门 → 建表（init-mysql.sql）
#       → 导入 import.sql → 对账行数
#
# 为什么要有「空库闸门」：init-mysql.sql 里有 22 处 DROP TABLE IF EXISTS，
# 对着已经有数据的库执行就是清库。所以先确认库里 0 张表才允许执行。
#
# 用法：
#   bash scripts/nas/migrate/04-import.sh
# =============================================================================
set -euo pipefail

REPO="${XURI_SRC:-/vol2/1000/xuri/src/work}"
LIVE="${REPO}/deploy/nas/live"
WORK="${WORK:-/vol2/1000/xuri/work}"
DATA_DIR="${XURI_DATA_DIR:-/vol2/1000/xuri/live}"
INIT_SQL="${REPO}/server/rdbms/src/main/resources/scripts/init-mysql.sql"
IMPORT_SQL="${WORK}/import.sql"

say() { printf '\n──── %s ────\n' "$*"; }
die() { printf '\n❌ %s\n\n' "$*" >&2; exit 1; }

[ -f "${INIT_SQL}" ]   || die "找不到建表脚本：${INIT_SQL}"
[ -f "${IMPORT_SQL}" ] || die "找不到导入脚本：${IMPORT_SQL}（先跑 03-build-import.py）"
[ -f "${LIVE}/docker-compose.yml" ] || die "找不到 ${LIVE}/docker-compose.yml"

say "1/5 准备 .env"
mkdir -p "${DATA_DIR}/mysql" "${DATA_DIR}/files" "${DATA_DIR}/build"
if [ ! -f "${LIVE}/.env" ]; then
  cat > "${LIVE}/.env" <<EOF
# 由 04-import.sh 生成于 $(date '+%F %T')
DB_NAME=surveyking
DB_PASSWORD=$(openssl rand -hex 16)
SK_CRYPTO_KEY=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 48)
APP_PORT=200
APP_PORT_ALT=201
XURI_SRC=${REPO}
XURI_DATA_DIR=${DATA_DIR}
XURI_BUILD_DIR=${DATA_DIR}/build
XURI_RUNTIME_IMAGE=xuri-runtime:8
JAVA_OPTS=-Xmx768m
EOF
  chmod 600 "${LIVE}/.env"
  echo "  · 已生成 ${LIVE}/.env（密钥随机，已备份到下面日志）"
else
  echo "  · 沿用已有 .env"
fi
# shellcheck disable=SC1091
set -a; . "${LIVE}/.env"; set +a
[ -n "${DB_PASSWORD:-}" ] || die ".env 里没有 DB_PASSWORD"

say "2/5 启动 MySQL"
cd "${LIVE}"
docker compose up -d db
for i in $(seq 1 60); do
  st="$(docker inspect -f '{{.State.Health.Status}}' xuri-live-db 2>/dev/null || echo starting)"
  [ "${st}" = "healthy" ] && { echo "  · db healthy（约 $((i*2)) 秒）"; break; }
  [ "${i}" = "60" ] && die "db 60 次探测仍未 healthy，看：cd ${LIVE} && docker compose logs --tail=80 db"
  sleep 2
done

run_sql_file() { docker compose exec -T -e MYSQL_PWD="${DB_PASSWORD}" db mysql -uroot "${DB_NAME:-surveyking}" < "$1"; }
q() { docker compose exec -T -e MYSQL_PWD="${DB_PASSWORD}" db mysql -uroot -N -B "${DB_NAME:-surveyking}" -e "$1"; }

say "3/5 空库闸门"
n="$(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME:-surveyking}' AND table_type='BASE TABLE';")"
echo "  · 当前表数：${n}"
if [ "${n}" != "0" ] && [ "${RESET:-0}" = "1" ]; then
  echo "  · --reset 指定了重建：DROP DATABASE ${DB_NAME:-surveyking} 并重建（只影响这个库）"
  docker compose exec -T -e MYSQL_PWD="${DB_PASSWORD}" db mysql -uroot -e \
    "DROP DATABASE IF EXISTS \`${DB_NAME:-surveyking}\`; CREATE DATABASE \`${DB_NAME:-surveyking}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  n=0
  echo "  · 重建后表数：0"
fi
if [ "${n}" != "0" ]; then
  die "库里已经有 ${n} 张表，拒绝执行 init-mysql.sql（它会 DROP 重建）。
   如果确认要重来：cd ${LIVE} && docker compose down && sudo rm -rf ${DATA_DIR}/mysql/* 再跑本脚本。"
fi

say "4/5 建表（init-mysql.sql）+ 导入数据（import.sql）"
run_sql_file "${INIT_SQL}"
echo "  · 建表完成，表数：$(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME:-surveyking}' AND table_type='BASE TABLE';")"
run_sql_file "${IMPORT_SQL}"
echo "  · 导入完成"

say "5/5 对账（只列关键表，期望值来自 02 导出的行数）"
q "SELECT 't_project', COUNT(*) FROM t_project
   UNION ALL SELECT 't_project_partner', COUNT(*) FROM t_project_partner
   UNION ALL SELECT 't_repo', COUNT(*) FROM t_repo
   UNION ALL SELECT 't_template', COUNT(*) FROM t_template
   UNION ALL SELECT 't_tag', COUNT(*) FROM t_tag
   UNION ALL SELECT 't_user', COUNT(*) FROM t_user
   UNION ALL SELECT 't_account', COUNT(*) FROM t_account
   UNION ALL SELECT 't_role', COUNT(*) FROM t_role
   UNION ALL SELECT 't_dept', COUNT(*) FROM t_dept
   UNION ALL SELECT 't_answer', COUNT(*) FROM t_answer
   UNION ALL SELECT 't_sys_info', COUNT(*) FROM t_sys_info;" | awk -F'\t' '{printf "  %-22s %s\n", $1, $2}'

echo
echo "期望：project=44 partner=44 repo=9 template=29946 tag=29946 user=1 account=1 role=1 dept=1 answer=4 sys_info=1"
echo "站点名：$(q "SELECT name FROM t_sys_info LIMIT 1;")"
