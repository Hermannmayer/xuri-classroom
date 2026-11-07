#!/usr/bin/env bash
# =============================================================================
# 第 2 步：把 H2 副本按表导出成 CSV（在飞牛 NAS 上执行，用 sudo）
#
# 为什么不用 dump.sql 直接灌 MySQL：
#   H2 的 SCRIPT 输出是 H2 方言（CREATE CACHED TABLE / U&'\4e2d' 转义 /
#   TIMESTAMP '...' 字面量），MySQL 吃不了，硬转容易在中文和布尔值上翻车。
#   CSV 是两边都能读的中立格式，再用 Python 做列映射最稳。
#
# 输出：/vol2/1000/xuri/work/csv/<表名>.csv（UTF-8，带表头）
# =============================================================================
set -euo pipefail

WORK="${WORK:-/vol2/1000/xuri/work}"
IMAGE="${IMAGE:-surveyking/surveyking:latest}"
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="sudo docker"

cd "${WORK}"
H2="$(ls -1 ./jarx/BOOT-INF/lib/h2-*.jar | head -1)"
H2_REL="/work/${H2#./}"

mkdir -p csv
rm -f csv/*.csv

# 取用户表清单（排除系统表）
TABLES="$($DOCKER run --rm --entrypoint java -v "${WORK}":/work -w /work "${IMAGE}" \
  -cp "${H2_REL}" org.h2.tools.Shell \
  -url "jdbc:h2:/work/db-copy/surveyking" -user sa -password sa \
  -sql "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='PUBLIC' AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;" \
  | grep -E '^[A-Z0-9_]+$')"

echo "表数量：$(echo "${TABLES}" | wc -l)"

for t in ${TABLES}; do
  $DOCKER run --rm --entrypoint java -v "${WORK}":/work -w /work "${IMAGE}" \
    -cp "${H2_REL}" org.h2.tools.Shell \
    -url "jdbc:h2:/work/db-copy/surveyking" -user sa -password sa \
    -sql "CALL CSVWRITE('/work/csv/${t}.csv', 'SELECT * FROM \"PUBLIC\".\"${t}\"', 'charset=UTF-8');" >/dev/null
  printf '  %-24s %s 行\n' "${t}" "$(($(wc -l < "csv/${t}.csv") - 1))"
done

echo "完成：$(du -sh csv | cut -f1)  $(ls csv | wc -l) 个文件"
