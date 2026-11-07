#!/usr/bin/env bash
# =============================================================================
# 旭日云课堂 · live 数据库 + 附件备份（在 backup 容器里执行）
#
# 为什么容器化而不是挂系统 cron：
#   飞牛 OTA 升级会替换系统分区，/etc/cron.d、/var/spool/cron 这类系统文件有丢失风险；
#   放进 compose 之后，备份任务跟着容器走，升级飞牛不影响，重启自动恢复
#   （restart: unless-stopped）。
#
# 做什么（一次一份、带校验、可对账）：
#   1. mysqldump（--single-transaction，不锁表）
#   2. gzip -t 校验 + sha256
#   3. tar.gz 打包附件目录
#   4. 写 manifest（时间、库名、大小、sha256、dumptime）
#   5. 按 --retention 清理旧备份（默认 28 份 ≈ 7 天，每 6 小时一份）
#
# 环境变量（由 compose 注入）：
#   DB_HOST / DB_PORT / DB_NAME / DB_PASSWORD / BACKUP_DIR / FILES_DIR / RETENTION
#
# 手动跑一次：
#   cd /vol2/1000/xuri/src/work/deploy/nas/live
#   docker compose run --rm backup /opt/backup/backup-live.sh
# =============================================================================
set -euo pipefail

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-surveyking}"
DB_PASSWORD="${DB_PASSWORD:?缺少 DB_PASSWORD}"
BACKUP_DIR="${BACKUP_DIR:-/backup}"
FILES_DIR="${FILES_DIR:-/data/files}"
RETENTION="${RETENTION:-28}"

STAMP="$(date +%Y%m%d-%H%M%S)"
WORK="${BACKUP_DIR}/.tmp-${STAMP}"
DB_OUT="${BACKUP_DIR}/db_${STAMP}.sql.gz"
FILES_OUT="${BACKUP_DIR}/files_${STAMP}.tar.gz"
MANIFEST="${BACKUP_DIR}/manifest_${STAMP}.txt"

log()  { printf '[backup %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
fail() { printf '[backup %s] ❌ %s\n' "$(date +%H:%M:%S)" "$*" >&2; rm -rf "$WORK"; exit 1; }

mkdir -p "$BACKUP_DIR" "$WORK"
trap 'rm -rf "$WORK"' EXIT

log "开始：db=${DB_NAME}@${DB_HOST}:${DB_PORT} → ${BACKUP_DIR}"

# ---------------------------------------------------------------- 1. 数据库
log "导出数据库（--single-transaction，不锁表）"
if ! mysqldump -h"$DB_HOST" -P"$DB_PORT" -uroot -p"$DB_PASSWORD" \
      --single-transaction --quick --routines --events --triggers --no-tablespaces \
      --default-character-set=utf8mb4 \
      "$DB_NAME" 2>"$WORK/dump.err" | gzip -6 > "$WORK/db.sql.gz"
then
  cat "$WORK/dump.err" >&2 || true
  fail "mysqldump 失败"
fi

# 空库/空文件也算失败：备份出一个 0 字节文件比没有备份更危险
[ -s "$WORK/db.sql.gz" ] || fail "dump 结果是空的（0 字节）"
gzip -t "$WORK/db.sql.gz" || fail "gzip 校验不通过，文件可能损坏"
mv "$WORK/db.sql.gz" "$DB_OUT"

# 顺手证明这份 dump 不是空壳：数一下建表语句
TABLE_COUNT="$(gzip -dc "$DB_OUT" | grep -c '^CREATE TABLE' || true)"
[ "$TABLE_COUNT" -gt 0 ] || fail "dump 里没有 CREATE TABLE，内容可疑"

# ---------------------------------------------------------------- 2. 附件
log "打包附件 ${FILES_DIR}"
if [ -d "$FILES_DIR" ]; then
  tar czf "$WORK/files.tar.gz" -C "$(dirname "$FILES_DIR")" "$(basename "$FILES_DIR")" || fail "附件打包失败"
  mv "$WORK/files.tar.gz" "$FILES_OUT"
else
  log "⚠️  附件目录不存在，跳过：${FILES_DIR}"
  FILES_OUT="(跳过：目录不存在)"
fi

# ---------------------------------------------------------------- 3. manifest + 校验
DB_SHA="$(sha256sum "$DB_OUT" | awk '{print $1}')"
{
  echo "time=$(date '+%F %T %Z')"
  echo "db_name=${DB_NAME}"
  echo "db_host=${DB_HOST}:${DB_PORT}"
  echo "db_tables=${TABLE_COUNT}"
  echo "db_file=$(basename "$DB_OUT")"
  echo "db_size=$(du -h "$DB_OUT" | cut -f1)"
  echo "db_sha256=${DB_SHA}"
  if [ -f "$FILES_OUT" ]; then
    echo "files_file=$(basename "$FILES_OUT")"
    echo "files_size=$(du -h "$FILES_OUT" | cut -f1)"
    echo "files_sha256=$(sha256sum "$FILES_OUT" | awk '{print $1}')"
  else
    echo "files_file=${FILES_OUT}"
  fi
} > "$MANIFEST"

log "完成：$(basename "$DB_OUT")（${TABLE_COUNT} 张表，${DB_SHA:0:12}…）"

# ---------------------------------------------------------------- 4. 清理
# 只删本脚本自己产出的三类文件，不碰目录里其他东西
log "清理旧备份（保留最近 ${RETENTION} 份）"
for prefix in db_ files_; do
  mapfile -t old < <(ls -1t "${BACKUP_DIR}/${prefix}"*.gz 2>/dev/null | tail -n +$((RETENTION + 1)) || true)
  for f in "${old[@]:-}"; do
    [ -n "$f" ] || continue
    rm -f "$f"
    log "  删除 $f"
  done
done
mapfile -t oldm < <(ls -1t "${BACKUP_DIR}"/manifest_*.txt 2>/dev/null | tail -n +$((RETENTION + 1)) || true)
for f in "${oldm[@]:-}"; do
  [ -n "$f" ] || continue
  rm -f "$f"
done

log "当前备份：$(ls -1 "${BACKUP_DIR}"/db_*.sql.gz 2>/dev/null | wc -l) 份，占用 $(du -sh "$BACKUP_DIR" | cut -f1)"
